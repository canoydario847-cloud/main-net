import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { Pin } from "@/mainnet/pins";
import {
  ageLabel,
  compactUsd,
  feeUsd,
  gasLabel,
  integer,
  intervalLabel,
  money,
  native,
  netById,
  pct,
  shortId,
  tipOf,
  type NetId,
  type NetView,
  type Settlement,
} from "@/mainnet/model";
import { Pressure } from "./networks";
import type { Selection } from "./types";

export function Detail({
  selection,
  nets,
  now,
  tape,
  pins,
  onOpenTx,
  onClose,
  onToggle,
}: {
  selection: Selection;
  nets: NetView[];
  now: number | null;
  tape: { row: Settlement; age: number }[];
  pins: Pin[];
  onOpenTx: (hash: string) => void;
  onClose: () => void;
  onToggle: (pin: Pin) => void;
}) {
  const net = selection?.kind === "net" ? netById(nets, selection.id) : null;
  const tx =
    selection?.kind === "tx" ? tape.find((item) => item.row.hash === selection.hash) ?? null : null;
  const txNet = tx ? netById(nets, tx.row.net) : null;

  return (
    <Dialog.Root open={selection != null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-bg/80" />
        <Dialog.Content className="sheet-panel fixed inset-x-0 bottom-0 z-50 max-h-[88vh] overflow-y-auto rounded-t-xl border border-line bg-surface p-4 outline-none md:inset-y-4 md:right-4 md:left-auto md:rounded-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Dialog.Title className="font-display text-2xl font-medium tracking-tight text-balance">
                {net ? net.name : tx ? tx.row.method : "Detail"}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted">
                {net
                  ? `${net.family} · settles in ${net.asset}`
                  : tx
                    ? `${txNet?.name ?? "Network"} · ${shortId(tx.row.hash)}`
                    : "Desk detail"}
              </Dialog.Description>
            </div>
            <Dialog.Close className="inline-flex size-11 shrink-0 items-center justify-center rounded-sm text-muted hover:bg-elevated hover:text-fg">
              <X className="size-4" aria-hidden="true" />
              <span className="sr-only">Close</span>
            </Dialog.Close>
          </div>

          {net ? (
            <div className="mt-5 flex flex-col gap-5">
              <dl className="grid grid-cols-2 gap-4">
                <Metric term="Spot" value={money(net.price)} note={pct(net.changePct)} />
                <Metric term="Tip" value={integer(tipOf(net, now))} note={intervalLabel(net.blockMs)} />
                <Metric term="Transfer" value={money(feeUsd(net, "transfer"))} note={gasLabel(net)} />
                <Metric term="TVL" value={compactUsd(net.tvlUsd)} note={<Pressure net={net} />} />
              </dl>
              <div>
                <h3 className="text-sm font-medium">On the tape</h3>
                <ul className="mt-2">
                  {tape
                    .filter((item) => item.row.net === net.id)
                    .slice(0, 5)
                    .map(({ row, age }) => (
                      <li key={row.hash} className="border-b border-line">
                        <button
                          type="button"
                          onClick={() => onOpenTx(row.hash)}
                          className="flex w-full items-center justify-between gap-3 py-3 text-left"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm">
                              {row.fromLabel} → {row.toLabel}
                            </span>
                            <span className="text-xs text-subtle">{ageLabel(age)}</span>
                          </span>
                          <span className="shrink-0 text-sm tabular-nums">{native(row.amount, net.asset)}</span>
                        </button>
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          ) : null}

          {tx && txNet ? (
            <div className="mt-5 flex flex-col gap-4">
              <dl className="grid grid-cols-2 gap-4">
                <Metric term="Amount" value={native(tx.row.amount, txNet.asset)} note={money(tx.row.amount * txNet.price)} />
                <Metric
                  term="Block"
                  value={integer(blockOf(txNet, now, tx.row.lag))}
                  note={tx.row.status === "final" ? "Final" : "In block"}
                />
              </dl>
              <Party
                role="From"
                label={tx.row.fromLabel}
                address={tx.row.from}
                net={tx.row.net}
                on={pins.some((pin) => pin.net === tx.row.net && pin.address === tx.row.from)}
                onToggle={onToggle}
              />
              <Party
                role="To"
                label={tx.row.toLabel}
                address={tx.row.to}
                net={tx.row.net}
                on={pins.some((pin) => pin.net === tx.row.net && pin.address === tx.row.to)}
                onToggle={onToggle}
              />
              <p className="text-xs break-all text-subtle tabular-nums">{tx.row.hash}</p>
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Party({
  role,
  label,
  address,
  net,
  on,
  onToggle,
}: {
  role: string;
  label: string;
  address: string;
  net: NetId;
  on: boolean;
  onToggle: (pin: Pin) => void;
}) {
  return (
    <div className="rounded-lg border border-line p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-subtle">{role}</div>
          <div className="mt-1 text-sm font-medium">{label}</div>
          <div className="mt-1 text-xs break-all text-muted tabular-nums">{address}</div>
        </div>
        <button
          type="button"
          aria-pressed={on}
          onClick={() => onToggle({ net, address, label })}
          className="inline-flex min-h-11 shrink-0 items-center rounded-sm bg-accent px-3 text-sm font-medium text-accent-fg"
        >
          {on ? "Unpin" : "Pin"}
        </button>
      </div>
    </div>
  );
}

function Metric({
  term,
  value,
  note,
}: {
  term: string;
  value: string;
  note: ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs text-subtle">{term}</dt>
      <dd className="mt-1 text-sm font-medium tabular-nums">{value}</dd>
      <div className="mt-1 text-xs text-muted">{note}</div>
    </div>
  );
}

function blockOf(net: NetView, now: number | null, lag: number): number | null {
  const tip = tipOf(net, now);
  if (tip == null) return null;
  return Math.max(0, tip - lag);
}
