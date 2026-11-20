export type NetId = "btc" | "eth" | "sol" | "base" | "arb" | "pol" | "avax" | "op";

export type Method = "Transfer" | "Swap" | "Bridge" | "Stake";

export type NetMeta = {
  id: NetId;
  name: string;
  asset: string;
  family: string;
  blockMs: number;
};

export type BookEntry = {
  net: NetId;
  label: string;
  address: string;
};

export type Settlement = {
  hash: string;
  net: NetId;
  from: string;
  to: string;
  fromLabel: string;
  toLabel: string;
  amount: number;
  method: Method;
  ageSec: number;
  bornElapsed: number;
  lag: number;
  status: "final" | "included";
};

export type Snapshot = {
  fetchedAt: number;
  ok: boolean;
  prices: Partial<Record<NetId, number>>;
  changePct: Partial<Record<NetId, number>>;
  tvl: Partial<Record<NetId, number>>;
  height: Partial<Record<NetId, number>>;
  gasWei: Partial<Record<NetId, number>>;
  satPerVb: number | null;
  reads: string[];
};

export type NetView = NetMeta & {
  price: number;
  changePct: number | null;
  tvlUsd: number | null;
  height: number | null;
  gasWei: number | null;
  satPerVb: number | null;
  anchoredAt: number | null;
};

export const NETS: NetMeta[] = [
  { id: "btc", name: "Bitcoin", asset: "BTC", family: "UTXO", blockMs: 600_000 },
  { id: "eth", name: "Ethereum", asset: "ETH", family: "EVM", blockMs: 12_000 },
  { id: "sol", name: "Solana", asset: "SOL", family: "SVM", blockMs: 400 },
  { id: "base", name: "Base", asset: "ETH", family: "EVM L2", blockMs: 2_000 },
  { id: "arb", name: "Arbitrum", asset: "ETH", family: "EVM L2", blockMs: 250 },
  { id: "pol", name: "Polygon", asset: "POL", family: "EVM", blockMs: 2_000 },
  { id: "avax", name: "Avalanche", asset: "AVAX", family: "EVM", blockMs: 2_000 },
  { id: "op", name: "Optimism", asset: "ETH", family: "EVM L2", blockMs: 2_000 },
];

const NAMES = ["Harbor Prime", "Kiln Desk", "Northwind", "Glass Bridge", "Paper Vault", "Arc Relay"];

const CARD: Record<
  NetId,
  { price: number; height: number; tvl: number | null; gasWei: number | null; sat: number | null }
> = {
  btc: { price: 64786, height: 976_179, tvl: 3_438_267_714, gasWei: null, sat: 5 },
  eth: { price: 1812.62, height: 26_429_739, tvl: 37_483_141_906, gasWei: 152_345_465, sat: null },
  sol: { price: 70.99, height: 448_266_815, tvl: 4_718_925_989, gasWei: null, sat: null },
  base: { price: 1812.62, height: 58_338_089, tvl: 5_149_293_962, gasWei: 6_000_000, sat: null },
  arb: { price: 1812.62, height: 524_839_578, tvl: 1_293_886_978, gasWei: 20_000_000, sat: null },
  pol: { price: 0.07955, height: 97_418_251, tvl: 612_386_638, gasWei: 30_000_000_000, sat: null },
  avax: { price: 7.15, height: 100_503_783, tvl: 545_309_775, gasWei: 7_500_000_150, sat: null },
  op: { price: 1812.62, height: 159_629_608, tvl: null, gasWei: 1_030_056, sat: null },
};

export const CARD_NETS: NetView[] = NETS.map((meta) => {
  const card = CARD[meta.id];
  return {
    ...meta,
    price: card.price,
    changePct: null,
    tvlUsd: card.tvl,
    height: card.height,
    gasWei: card.gasWei,
    satPerVb: card.sat,
    anchoredAt: null,
  };
});

export function mergeNets(snap: Snapshot | null): NetView[] {
  if (!snap) return CARD_NETS;
  return CARD_NETS.map((net) => ({
    ...net,
    price: snap.prices[net.id] ?? net.price,
    changePct: snap.changePct[net.id] ?? null,
    tvlUsd: snap.tvl[net.id] ?? net.tvlUsd,
    height: snap.height[net.id] ?? net.height,
    gasWei: snap.gasWei[net.id] ?? net.gasWei,
    satPerVb: net.id === "btc" ? (snap.satPerVb ?? net.satPerVb) : null,
    anchoredAt: snap.height[net.id] != null ? snap.fetchedAt : null,
  }));
}

export function tipOf(net: NetView, now: number | null): number | null {
  if (net.height == null) return null;
  if (now == null || net.anchoredAt == null) return net.height;
  const steps = Math.floor(Math.max(0, now - net.anchoredAt) / net.blockMs);
  return net.height + steps;
}

export function feeUsd(net: NetView, size: "transfer" | "call"): number | null {
  if (!Number.isFinite(net.price) || net.price <= 0) return null;
  if (net.id === "btc") {
    if (net.satPerVb == null) return null;
    const vb = size === "transfer" ? 140 : 420;
    return (net.satPerVb * vb * net.price) / 1e8;
  }
  if (net.id === "sol") {
    const lamports = size === "transfer" ? 5_000 : 15_000;
    return (lamports * net.price) / 1e9;
  }
  if (net.gasWei == null) return null;
  const gas = size === "transfer" ? 21_000 : 180_000;
  return (gas * net.gasWei * net.price) / 1e18;
}

export function pressure(net: NetView): "nominal" | "watch" | "hot" {
  const fee = feeUsd(net, "transfer");
  if (fee == null) return "nominal";
  const hot = net.id === "btc" ? 5 : 2;
  const watch = net.id === "btc" ? 1.5 : 0.25;
  if (fee >= hot) return "hot";
  if (fee >= watch) return "watch";
  return "nominal";
}

export function gasLabel(net: NetView): string {
  if (net.id === "btc") {
    return net.satPerVb == null ? "\u2014" : `${net.satPerVb.toFixed(1)} sat/vB`;
  }
  if (net.id === "sol") return "5,000 lamports";
  if (net.gasWei == null) return "\u2014";
  const gwei = net.gasWei / 1e9;
  const digits = gwei >= 10 ? 1 : gwei >= 1 ? 2 : 4;
  const unit = net.id === "avax" ? "nAVAX" : "gwei";
  return `${gwei.toFixed(digits)} ${unit}`;
}

export function intervalLabel(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  if (ms % 60_000 === 0) return `${ms / 60_000} min`;
  const seconds = ms / 1000;
  return Number.isInteger(seconds) ? `${seconds} s` : `${seconds.toFixed(1)} s`;
}

export function money(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "\u2014";
  const abs = Math.abs(n);
  let maximumFractionDigits = 6;
  let minimumFractionDigits = 2;
  if (abs >= 100) {
    maximumFractionDigits = 0;
    minimumFractionDigits = 0;
  } else if (abs >= 1) {
    maximumFractionDigits = 2;
    minimumFractionDigits = 2;
  } else if (abs >= 0.01) {
    maximumFractionDigits = 4;
    minimumFractionDigits = 2;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits,
    minimumFractionDigits,
  }).format(n);
}

export function compactUsd(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "\u2014";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(n);
}

export function integer(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "\u2014";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

export function pct(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "\u2014";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

export function native(amount: number, asset: string): string {
  const digits = amount >= 1000 ? 0 : amount >= 100 ? 1 : amount >= 1 ? 2 : 4;
  return `${amount.toLocaleString("en-US", { maximumFractionDigits: digits })} ${asset}`;
}

export function ageLabel(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
}

export function shortId(value: string): string {
  if (value.length <= 18) return value;
  return `${value.slice(0, 8)}\u2026${value.slice(-6)}`;
}

export function bookFor(id: NetId): BookEntry[] {
  const start = NETS.findIndex((net) => net.id === id);
  return Array.from({ length: 4 }, (_, index) => {
    const label = NAMES[(start + index) % NAMES.length] ?? "Desk";
    return { net: id, label, address: addressFor(id, label) };
  });
}

export function addressFor(id: NetId, label: string): string {
  const rng = mulberry32(hashStr(`${id}:${label}`));
  if (id === "btc") return `bc1q${hex(rng, 38)}`;
  if (id === "sol") return base58(rng, 44);
  return `0x${hex(rng, 40)}`;
}

export function ageOf(row: Settlement, elapsed: number): number {
  return row.ageSec + Math.max(0, elapsed - row.bornElapsed);
}

export const INITIAL_TAPE: Settlement[] = Array.from({ length: 22 }, (_, index) =>
  makeSettlement(1_000 + index * 97, 0),
);

export function makeSettlement(seed: number, bornElapsed: number): Settlement {
  const rng = mulberry32(seed >>> 0);
  const meta = NETS[Math.floor(rng() * NETS.length)] ?? NETS[0];
  const book = bookFor(meta.id);
  const from = book[Math.floor(rng() * book.length)] ?? book[0];
  let to = book[Math.floor(rng() * book.length)] ?? book[1] ?? book[0];
  if (to.address === from.address) {
    const index = book.findIndex((entry) => entry.address === from.address);
    to = book[(index + 1) % book.length] ?? from;
  }
  return {
    hash: hashFor(meta.id, rng),
    net: meta.id,
    from: from.address,
    to: to.address,
    fromLabel: from.label,
    toLabel: to.label,
    amount: amountFor(meta.asset, rng),
    method: pickMethod(meta.id, rng),
    ageSec: bornElapsed === 0 ? 12 + Math.floor(rng() * 840) : 0,
    bornElapsed,
    lag: Math.floor(rng() * 3),
    status: rng() > 0.18 ? "final" : "included",
  };
}

export function netById(nets: NetView[], id: NetId): NetView {
  return nets.find((net) => net.id === id) ?? nets[0];
}

function pickMethod(id: NetId, rng: () => number): Method {
  const roll = rng();
  if (id === "base" || id === "arb" || id === "op") {
    if (roll < 0.34) return "Bridge";
    if (roll < 0.62) return "Swap";
    return "Transfer";
  }
  if (id === "eth" || id === "sol") {
    if (roll < 0.22) return "Stake";
    if (roll < 0.5) return "Swap";
    return "Transfer";
  }
  if (roll < 0.16) return "Swap";
  return "Transfer";
}

function amountFor(asset: string, rng: () => number): number {
  const bands: Record<string, [number, number]> = {
    BTC: [0.015, 6],
    ETH: [0.35, 180],
    SOL: [12, 9000],
    POL: [1500, 750_000],
    AVAX: [6, 3200],
  };
  const [low, high] = bands[asset] ?? [1, 100];
  const value = Math.exp(Math.log(low) + rng() * (Math.log(high) - Math.log(low)));
  return value;
}

function hashFor(id: NetId, rng: () => number): string {
  if (id === "btc") return hex(rng, 64);
  if (id === "sol") return base58(rng, 88);
  return `0x${hex(rng, 64)}`;
}

function hex(rng: () => number, length: number): string {
  let out = "";
  for (let i = 0; i < length; i += 1) out += "0123456789abcdef"[Math.floor(rng() * 16)];
  return out;
}

function base58(rng: () => number, length: number): string {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let out = "";
  for (let i = 0; i < length; i += 1) out += alphabet[Math.floor(rng() * alphabet.length)];
  return out;
}

function hashStr(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
