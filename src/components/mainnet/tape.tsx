import type { ReactNode } from "react";
import type { Pin } from "@/mainnet/pins";
import { ageLabel, money, native, netById, shortId, type NetView, type Settlement } from "@/mainnet/model";

export function Tape({
  rows,
  nets,
  pins,
  onOpen,
}: {
  rows: { row: Settlement; age: number }[];
  nets: NetView[];
  pins: Pin[];
  onOpen: (hash: string) => void;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-2xl font-medium tracking-tight">Tape</h2>
        <p className="mt-1 text-sm text-muted">
          Modeled settlements. Labels are the desk address book, not chain attribution.
        </p>
      </div>
      {rows.length === 0 ? (
        <Empty>Nothing on the tape matches that.</Empty>
      ) : (
        <ul className="overflow-hidden rounded-xl border border-line bg-surface">
          {rows.map(({ row, age }) => {
            const net = netById(nets, row.net);
            const pinned =
              pins.some((pin) => pin.net === row.net && pin.address === row.from) ||
              pins.some((pin) => pin.net === row.net && pin.address === row.to);
            return (
              <li key={row.hash} className="border-b border-line last:border-b-0">
                <button
                  type="button"
                  onClick={() => onOpen(row.hash)}
                  className="flex w-full flex-col gap-2 px-4 py-4 text-left transition-colors duration-150 hover:bg-elevated md:flex-row md:items-center md:justify-between"
                >
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="text-sm font-medium">
                        {row.fromLabel} → {row.toLabel}
                      </span>
                      <span className="text-xs text-subtle">
                        {net.name} · {row.method}
                      </span>
                      {pinned ? <span className="text-xs text-muted">Pinned</span> : null}
                    </span>
                    <span className="mt-1 block truncate text-xs text-subtle tabular-nums">
                      {shortId(row.hash)}
                    </span>
                  </span>
                  <span className="flex items-baseline justify-between gap-4 md:flex-col md:items-end">
                    <span className="text-sm tabular-nums">
                      {native(row.amount, net.asset)}
                      <span className="ml-2 text-muted">{money(row.amount * net.price)}</span>
                    </span>
                    <span className="text-xs text-subtle tabular-nums">
                      {ageLabel(age)} · {row.status === "final" ? "Final" : "In block"}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 rounded-lg border border-line bg-surface px-4 py-6 text-sm text-muted">{children}</p>
  );
}
