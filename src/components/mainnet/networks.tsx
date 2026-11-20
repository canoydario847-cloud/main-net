import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import {
  compactUsd,
  feeUsd,
  integer,
  money,
  pct,
  pressure,
  tipOf,
  type NetId,
  type NetView,
} from "@/mainnet/model";

export function Networks({
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
        <p className="mt-1 text-sm text-muted">
          Tips advance on each network’s block interval between reads.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Cheapest transfer"
          value={cheapest ? money(cheapest.fee) : "—"}
          detail={cheapest ? cheapest.net.name : "Waiting on fees"}
          onClick={cheapest ? () => onOpen(cheapest.net.id) : undefined}
        />
        <Stat
          label="Deepest pool"
          value={deepest ? compactUsd(deepest.tvlUsd) : "—"}
          detail={deepest ? deepest.name : "—"}
          onClick={deepest ? () => onOpen(deepest.id) : undefined}
        />
        <Stat
          label="Pressure"
          value={hot.length === 0 ? "Clear" : String(hot.length)}
          detail={hot.length === 0 ? "All nominal" : hot.map((net) => net.name).join(", ")}
        />
      </div>
      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <div className="hidden grid-cols-6 gap-4 border-b border-line px-4 py-3 text-xs text-subtle md:grid">
          <span>Network</span>
          <span>Spot</span>
          <span>Tip</span>
          <span>Transfer</span>
          <span>TVL</span>
          <span>State</span>
        </div>
        <ul>
          {nets.map((net) => (
            <li key={net.id} className="border-b border-line last:border-b-0">
              <button
                type="button"
                onClick={() => onOpen(net.id)}
                className="grid w-full grid-cols-2 gap-x-4 gap-y-2 px-4 py-4 text-left transition-colors duration-150 hover:bg-elevated md:grid-cols-6 md:items-center"
              >
                <span className="col-span-2 md:col-span-1">
                  <span className="block text-sm font-medium">{net.name}</span>
                  <span className="text-xs text-subtle">
                    {net.family} · {net.asset}
                  </span>
                </span>
                <Field label="Spot" className="md:block">
                  <span className="tabular-nums">{money(net.price)}</span>
                  <span className={cn("ml-2 text-xs tabular-nums", changeClass(net.changePct))}>
                    {pct(net.changePct)}
                  </span>
                </Field>
                <Field label="Tip">
                  <span className="tabular-nums">{integer(tipOf(net, now))}</span>
                </Field>
                <Field label="Transfer">
                  <span className="tabular-nums">{money(feeUsd(net, "transfer"))}</span>
                </Field>
                <Field label="TVL">
                  <span className="tabular-nums">{compactUsd(net.tvlUsd)}</span>
                </Field>
                <span className="col-span-2 md:col-span-1">
                  <Pressure net={net} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  detail,
  onClick,
}: {
  label: string;
  value: string;
  detail: string;
  onClick?: () => void;
}) {
  const className = "rounded-lg border border-line bg-surface p-4 text-left";
  const body = (
    <>
      <div className="text-xs text-subtle">{label}</div>
      <div className="mt-2 text-lg font-medium tabular-nums">{value}</div>
      <div className="mt-1 text-sm text-muted">{detail}</div>
    </>
  );
  if (!onClick) return <div className={className}>{body}</div>;
  return (
    <button type="button" onClick={onClick} className={cn(className, "hover:bg-elevated")}>
      {body}
    </button>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={className}>
      <span className="mb-1 block text-xs text-subtle md:hidden">{label}</span>
      <span className="text-sm">{children}</span>
    </span>
  );
}

export function Pressure({ net }: { net: NetView }) {
  const state = pressure(net);
  const label = state === "nominal" ? "Nominal" : state === "watch" ? "Watch" : "Hot";
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span
        className={cn(
          "size-2 rounded-full",
          state === "nominal" && "bg-up",
          state === "watch" && "bg-watch",
          state === "hot" && "bg-down",
        )}
        aria-hidden="true"
      />
      <span className={state === "nominal" ? "text-up" : state === "watch" ? "text-watch" : "text-down"}>
        {label}
      </span>
    </span>
  );
}

function changeClass(change: number | null): string {
  if (change == null) return "text-subtle";
  if (change < 0) return "text-down";
  if (change > 0) return "text-up";
  return "text-subtle";
}
