import type { NetId, Snapshot } from "./model";

const COIN: Record<NetId, string> = {
  btc: "coingecko:bitcoin",
  eth: "coingecko:ethereum",
  sol: "coingecko:solana",
  base: "coingecko:ethereum",
  arb: "coingecko:ethereum",
  pol: "coingecko:polygon-ecosystem-token",
  avax: "coingecko:avalanche-2",
  op: "coingecko:ethereum",
};

const TVL_NAME: Record<string, NetId> = {
  Bitcoin: "btc",
  Ethereum: "eth",
  Solana: "sol",
  Base: "base",
  Arbitrum: "arb",
  Polygon: "pol",
  Avalanche: "avax",
  Optimism: "op",
};

const RPC: Partial<Record<NetId, string>> = {
  eth: "https://ethereum.publicnode.com",
  base: "https://mainnet.base.org",
  arb: "https://arb1.arbitrum.io/rpc",
  pol: "https://polygon-bor-rpc.publicnode.com",
  op: "https://mainnet.optimism.io",
  avax: "https://api.avax.network/ext/bc/C/rpc",
};

const UNIQUE_COINS = [...new Set(Object.values(COIN))];

export async function fetchSnapshot(): Promise<Snapshot> {
  const nowSec = Math.floor(Date.now() / 1000);
  const coinPath = UNIQUE_COINS.join(",");
  const [spots, past, chains, btcHeight, btcFee, solHeight, evm] = await Promise.all([
    getJson(`https://coins.llama.fi/prices/current/${coinPath}`),
    getJson(`https://coins.llama.fi/prices/historical/${nowSec - 86_400}/${coinPath}`),
    getJson("https://api.llama.fi/v2/chains"),
    btcTip(),
    btcSatPerVb(),
    solanaHeight(),
    evmReads(),
  ]);

  const prices: Snapshot["prices"] = {};
  const changePct: Snapshot["changePct"] = {};
  const tvl: Snapshot["tvl"] = {};
  const height: Snapshot["height"] = {};
  const gasWei: Snapshot["gasWei"] = {};
  const reads: string[] = [];

  if (spots.ok) {
    reads.push("DefiLlama spots");
    for (const id of Object.keys(COIN) as NetId[]) {
      const price = coinPrice(spots.value, COIN[id]);
      if (price != null) prices[id] = price;
    }
  }
  if (past.ok && spots.ok) {
    for (const id of Object.keys(COIN) as NetId[]) {
      const now = prices[id];
      const then = coinPrice(past.value, COIN[id]);
      if (now != null && then != null && then > 0) {
        changePct[id] = ((now - then) / then) * 100;
      }
    }
  }
  if (chains.ok && Array.isArray(chains.value)) {
    reads.push("DefiLlama TVL");
    for (const row of chains.value) {
      const rec = asRecord(row);
      const name = rec?.name;
      const value = rec?.tvl;
      if (typeof name !== "string" || typeof value !== "number") continue;
      const id = TVL_NAME[name];
      if (!id || value < 1000) continue;
      tvl[id] = value;
    }
  }
  if (btcHeight.ok) {
    reads.push("Bitcoin tip");
    height.btc = btcHeight.value;
  }
  if (solHeight.ok) {
    reads.push("Solana RPC");
    height.sol = solHeight.value;
  }
  if (evm.ok) {
    const landed = Object.keys(evm.value.heights).length;
    if (landed > 0) reads.push("public RPC");
    Object.assign(height, evm.value.heights);
    Object.assign(gasWei, evm.value.gas);
  }

  const priceCount = Object.keys(prices).length;
  return {
    fetchedAt: Date.now(),
    ok: priceCount >= 4 && Object.keys(height).length >= 3,
    prices,
    changePct,
    tvl,
    height,
    gasWei,
    satPerVb: btcFee.ok ? btcFee.value : null,
    reads,
  };
}

async function evmReads(): Promise<
  Result<{ heights: Partial<Record<NetId, number>>; gas: Partial<Record<NetId, number>> }>
> {
  const ids = Object.keys(RPC) as NetId[];
  const rows = await Promise.all(
    ids.map(async (id) => {
      const url = RPC[id];
      if (!url) return null;
      const [block, gas] = await Promise.all([rpc(url, "eth_blockNumber"), rpc(url, "eth_gasPrice")]);
      return { id, block, gas };
    }),
  );
  const heights: Partial<Record<NetId, number>> = {};
  const gas: Partial<Record<NetId, number>> = {};
  let any = false;
  for (const row of rows) {
    if (!row) continue;
    if (row.block.ok) {
      const n = hexToNum(row.block.value);
      if (n != null) {
        heights[row.id] = n;
        any = true;
      }
    }
    if (row.gas.ok) {
      const n = hexToNum(row.gas.value);
      if (n != null) gas[row.id] = n;
    }
  }
  return any ? { ok: true, value: { heights, gas } } : { ok: false };
}

async function btcTip(): Promise<Result<number>> {
  for (const url of [
    "https://mempool.space/api/blocks/tip/height",
    "https://blockstream.info/api/blocks/tip/height",
  ]) {
    const text = await getText(url);
    if (!text.ok) continue;
    const height = Number(text.value);
    if (Number.isFinite(height) && height > 0) return { ok: true, value: height };
  }
  return { ok: false };
}

async function solanaHeight(): Promise<Result<number>> {
  const data = await getJson("https://api.mainnet-beta.solana.com", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getEpochInfo" }),
  });
  if (!data.ok) return { ok: false };
  const result = asRecord(asRecord(data.value)?.result);
  const height = result?.blockHeight;
  if (typeof height !== "number" || !Number.isFinite(height)) return { ok: false };
  return { ok: true, value: height };
}

async function btcSatPerVb(): Promise<Result<number>> {
  const estimates = await getJson("https://blockstream.info/api/fee-estimates");
  if (estimates.ok) {
    const rec = asRecord(estimates.value);
    for (const key of ["3", "2", "6", "1"]) {
      const value = rec?.[key];
      if (typeof value === "number" && value > 0) return { ok: true, value };
    }
  }
  const mempool = await getJson("https://mempool.space/api/v1/fees/recommended");
  if (mempool.ok) {
    const half = asRecord(mempool.value)?.halfHourFee;
    if (typeof half === "number" && half > 0) return { ok: true, value: half };
  }
  return { ok: false };
}

async function rpc(url: string, method: string): Promise<Result<string>> {
  const data = await getJson(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: [] }),
  });
  if (!data.ok) return { ok: false };
  const result = asRecord(data.value)?.result;
  if (typeof result !== "string") return { ok: false };
  return { ok: true, value: result };
}

type Result<T> = { ok: true; value: T } | { ok: false };

async function getJson(url: string, init?: RequestInit): Promise<Result<unknown>> {
  try {
    const response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(7000),
      headers: {
        accept: "application/json",
        "user-agent": "MainNetDesk/1.0",
        ...(init?.headers ?? {}),
      },
    });
    if (!response.ok) return { ok: false };
    return { ok: true, value: await response.json() };
  } catch {
    return { ok: false };
  }
}

async function getText(url: string): Promise<Result<string>> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(7000),
      headers: { "user-agent": "MainNetDesk/1.0" },
    });
    if (!response.ok) return { ok: false };
    const text = (await response.text()).trim();
    return text ? { ok: true, value: text } : { ok: false };
  } catch {
    return { ok: false };
  }
}

function coinPrice(data: unknown, id: string): number | null {
  const coins = asRecord(asRecord(data)?.coins);
  const price = asRecord(coins?.[id])?.price;
  return typeof price === "number" && Number.isFinite(price) && price > 0 ? price : null;
}

function hexToNum(hex: string): number | null {
  if (!hex.startsWith("0x")) return null;
  const value = Number(hex);
  return Number.isFinite(value) ? value : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}
