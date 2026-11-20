import { useEffect, useMemo, useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { usePins, type Pin } from "@/mainnet/pins";
import { loadSnapshot } from "@/mainnet/snapshot";
import {
  INITIAL_TAPE,
  ageLabel,
  ageOf,
  bookFor,
  compactUsd,
  feeUsd,
  gasLabel,
  integer,
  intervalLabel,
  makeSettlement,
  mergeNets,
  money,
  native,
  netById,
  pct,
  pressure,
  shortId,
  tipOf,
  type NetId,
  type NetView,
  type Settlement,
  type Snapshot,
} from "@/mainnet/model";

type View = "networks" | "tape" | "cost" | "trace";
type Size = "transfer" | "call";
type Selection = { kind: "net"; id: NetId } | { kind: "tx"; hash: string } | null;

const VIEWS: { id: View; label: string }[] = [
  { id: "networks", label: "Networks" },
  { id: "tape", label: "Tape" },
  { id: "cost", label: "Cost" },
  { id: "trace", label: "Trace" },
];

export function Desk() {
  const [view, setView] = useState<View>("networks");
  const [query, setQuery] = useState("");
  const [size, setSize] = useState<Size>("transfer");
  const [bookNet, setBookNet] = useState<NetId | "all">("eth");
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [link, setLink] = useState<"sync" | "linked" | "card">("sync");
  const [now, setNow] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [extra, setExtra] = useState<Settlement[]>([]);
  const [selection, setSelection] = useState<Selection>(null);

  const pins = usePins((state) => state.pins);
  const togglePin = usePins((state) => state.toggle);
  const [pinsReady, setPinsReady] = useState(false);

  useEffect(() => {
    void Promise.resolve(usePins.persist.rehydrate()).then(() => setPinsReady(true));
  }, []);

  useEffect(() => {
    let stop = false;
    async function pull() {
      try {
        const next = await loadSnapshot();
        if (stop) return;
        setSnap(next);
        setLink(next.ok ? "linked" : "card");
      } catch {
        if (!stop) setLink("card");
      }
    }
    void pull();
    const id = window.setInterval(() => void pull(), 45_000);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    let step = 0;
    const id = window.setInterval(() => {
      step += 1;
      setElapsed(step);
      setNow(Date.now());
      if (step % 2 === 0) {
        setExtra((prev) => [makeSettlement(50_000 + step * 13, step), ...prev].slice(0, 16));
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const nets = useMemo(() => mergeNets(snap), [snap]);
  const tape = useMemo(() => {
    return [...extra, ...INITIAL_TAPE]
      .map((row) => ({ row, age: ageOf(row, elapsed) }))
      .sort((a, b) => a.age - b.age);
  }, [extra, elapsed]);

  const needle = query.trim().toLowerCase();
  const filteredTape = tape.filter(({ row }) => matches(row, nets, needle));

  const shownPins = pinsReady ? pins : [];

  return (
    <main className="min-h-screen pb-24">
      <header className="border-b border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 md:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium tracking-wide text-subtle">Production desk</p>
              <h1 className="mt-1 font-display text-3xl font-medium tracking-tight text-balance">
                Main Net
              </h1>
            </div>
            <Status link={link} now={now} fetchedAt={snap?.fetchedAt ?? null} />
          </div>
          <p className="max-w-2xl text-sm text-pretty text-muted">
            Spots, tips, and a standard transfer cost from public reads. The tape is a local model
            priced off those spots — not a chain feed.
          </p>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search the tape</span>
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle"
                aria-hidden="true"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") setView("trace");
                }}
                placeholder="Hash, label, or address"
                className="h-11 w-full rounded-sm border border-line bg-elevated pr-3 pl-10 text-sm text-fg outline-none placeholder:text-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              />
            </label>
            <nav
              aria-label="Desk sections"
              className="grid grid-cols-4 gap-1 rounded-md border border-line bg-surface p-1 md:w-96"
            >
              {VIEWS.map((item) => {
                const active = view === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setView(item.id)}
                    className={cn(
                      "min-h-11 rounded-sm px-2 text-sm font-medium transition-colors duration-150",
                      active ? "bg-elevated text-fg" : "text-muted hover:text-fg",
                    )}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6">
        {view === "networks" ? (
          <Networks nets={nets} now={now} onOpen={(id) => setSelection({ kind: "net", id })} />
        ) : null}
        {view === "tape" ? (
          <Tape rows={filteredTape} nets={nets} pins={shownPins} onOpen={(hash) => setSelection({ kind: "tx", hash })} />
        ) : null}
        {view === "cost" ? (
          <Cost nets={nets} size={size} onSize={setSize} onOpen={(id) => setSelection({ kind: "net", id })} />
        ) : null}
        {view === "trace" ? (
          <Trace
            query={needle}
            rows={filteredTape}
            nets={nets}
            pins={shownPins}
            bookNet={bookNet}
            onBookNet={setBookNet}
            onToggle={togglePin}
            onOpen={(hash) => setSelection({ kind: "tx", hash })}
          />
        ) : null}
        <p className="text-xs text-subtle">
          {link === "linked" && snap
            ? `Live reads: ${snap.reads.join(", ")}.`
            : "Showing the desk card until public reads land."}{" "}
          EVM cost is execution gas only. Rollups also pay a data fee this desk does not read.
        </p>
      </div>

      <Detail
        selection={selection}
        nets={nets}
        now={now}
        tape={tape}
        pins={shownPins}
        onOpenTx={(hash) => setSelection({ kind: "tx", hash })}
        onClose={() => setSelection(null)}
        onToggle={togglePin}
      />
    </main>
  );
}

function Status({
  link,
  now,
  fetchedAt,
}: {
  link: "sync" | "linked" | "card";
  now: number | null;
  fetchedAt: number | null;
}) {
  const label = link === "linked" ? "Linked" : link === "card" ? "Desk card" : "Syncing";
  const age =
    link === "linked" && now != null && fetchedAt != null ? ageLabel((now - fetchedAt) / 1000) : null;
  return (
    <div className="flex min-h-11 shrink-0 items-center gap-2 rounded-sm border border-line bg-surface px-3">
      <span className={cn("live-dot", link !== "linked" && "bg-watch")} aria-hidden="true" />
      <span className="text-sm text-fg">
        {label}
        {age ? <span className="text-muted"> · {age}</span> : null}
      </span>
    </div>
  );
}

function Networks({
  nets,
  now,
  onOpen,
}: {
  nets: NetView[];
  now: number | null;
  onOpen: (id: NetId) => void;
}) {
  const ranked = nets
    .map((net) => ({ net, fee: feeUsd(net, "transfer") }))
    .filter((row): row is { net: NetView; fee: number } => row.fee != null)
    .sort((a, b) => a.fee - b.fee);
  const cheapest = ranked[0];
  const deepest = [...nets].sort((a, b) => (b.tvlUsd ?? 0) - (a.tvlUsd ?? 0))[0];
  const hot = nets.filter((net) => pressure(net) !== "nominal");
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-2xl font-medium tracking-tight">Networks</h2>
        <p className="mt-1 text-sm text-muted">Tips advance on each network’s block interval between reads.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Cheapest transfer" value={cheapest ? money(cheapest.fee) : "—"} detail={cheapest ? cheapest.net.name : "Waiting on fees"} onClick={cheapest ? () => onOpen(cheapest.net.id) : undefined} />
        <Stat label="Deepest pool" value={deepest ? compactUsd(deepest.tvlUsd) : "—"} detail={deepest ? deepest.name : "—"} onClick={deepest ? () => onOpen(deepest.id) : undefined} />
        <Stat label="Pressure" value={hot.length === 0 ? "Clear" : String(hot.length)} detail={hot.length === 0 ? "All nominal" : hot.map((net) => net.name).join(", ")} />
      </div>
      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <div className="hidden grid-cols-6 gap-4 border-b border-line px-4 py-3 text-xs text-subtle md:grid">
          <span>Network</span><span>Spot</span><span>Tip</span><span>Transfer</span><span>TVL</span><span>State</span>
        </div>
        <ul>
          {nets.map((net) => (
            <li key={net.id} className="border-b border-line last:border-b-0">
              <button type="button" onClick={() => onOpen(net.id)} className="grid w-full grid-cols-2 gap-x-4 gap-y-2 px-4 py-4 text-left transition-colors duration-150 hover:bg-elevated md:grid-cols-6 md:items-center">
                <span className="col-span-2 md:col-span-1">
                  <span className="block text-sm font-medium">{net.name}</span>
                  <span className="text-xs text-subtle">{net.family} · {net.asset}</span>
                </span>
                <Field label="Spot" className="md:block">
                  <span className="tabular-nums">{money(net.price)}</span>
                  <span className={cn("ml-2 text-xs tabular-nums", changeClass(net.changePct))}>{pct(net.changePct)}</span>
                </Field>
                <Field label="Tip"><span className="tabular-nums">{integer(tipOf(net, now))}</span></Field>
                <Field label="Transfer"><span className="tabular-nums">{money(feeUsd(net, "transfer"))}</span></Field>
                <Field label="TVL"><span className="tabular-nums">{compactUsd(net.tvlUsd)}</span></Field>
                <span className="col-span-2 md:col-span-1"><Pressure net={net} /></span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
