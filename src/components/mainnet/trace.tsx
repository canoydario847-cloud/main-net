import type { Pin } from "@/mainnet/pins";
import { ageLabel, bookFor, money, netById, shortId, type NetId, type NetView, type Settlement } from "@/mainnet/model";
import { Empty } from "./tape";

export function Trace({
  query,
  rows,
  nets,
  pins,
  bookNet,
  onBookNet,
  onToggle,
  onOpen,
}: {
  query: string;
  rows: { row: Settlement; age: number }[];
  nets: NetView[];
  pins: Pin[];
  bookNet: NetId | "all";
  onBookNet: (id: NetId | "all") => void;
  onToggle: (pin: Pin) => void;
  onOpen: (hash: string) => void;
}) {
  const book = (bookNet === "all" ? nets : nets.filter((net) => net.id === bookNet)).flatMap((net) =>
    bookFor(net.id)
      .filter((entry) => {
        if (!query) return true;
        return (
          entry.label.toLowerCase().includes(query) ||
          entry.address.toLowerCase().includes(query) ||
          net.name.toLowerCase().includes(query)
        );
      })
      .map((entry) => ({ ...entry, netName: net.name })),
  );

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-2xl font-medium tracking-tight">Trace</h2>
        <p className="mt-1 text-sm text-muted">
          Search the modeled tape, then pin a desk address to mark later rows.
        </p>
      </div>
      <div>
        <h3 className="text-sm font-medium">Tape matches</h3>
        {rows.length === 0 ? (
          <Empty>Nothing on the tape matches that.</Empty>
        ) : (
          <ul className="mt-3 overflow-hidden rounded-xl border border-line bg-surface">
            {rows.slice(0, 8).map(({ row, age }) => {
              const net = netById(nets, row.net);
              return (
                <li key={row.hash} className="border-b border-line last:border-b-0">
                  <button
                    type="button"
                    onClick={() => onOpen(row.hash)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-elevated"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm">
                        {row.fromLabel} → {row.toLabel}
                      </span>
                      <span className="text-xs text-subtle">
                        {net.name} · {ageLabel(age)}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm tabular-nums">{money(row.amount * net.price)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-medium">Pins</h3>
          <span className="text-xs text-subtle">{pins.length === 0 ? "None yet" : `${pins.length} saved on this device`}</span>
        </div>
        {pins.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Pin an address from the book or a tape row.</p>
        ) : (
          <ul className="mt-3 overflow-hidden rounded-xl border border-line bg-surface">
            {pins.map((pin) => (
              <PinRow key={`${pin.net}:${pin.address}`} pin={pin} nets={nets} onToggle={onToggle} />
            ))}
          </ul>
        )}
      </div>
      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-medium">Address book</h3>
          <label className="text-sm text-muted">
            <span className="sr-only">Network</span>
            <select
              value={bookNet}
              onChange={(event) => onBookNet(event.target.value as NetId | "all")}
              className="h-11 rounded-sm border border-line bg-elevated px-3 text-sm text-fg"
            >
              <option value="all">All networks</option>
              {nets.map((net) => (
                <option key={net.id} value={net.id}>
                  {net.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {book.length === 0 ? (
          <Empty>No book entry matches that.</Empty>
        ) : (
          <ul className="mt-3 overflow-hidden rounded-xl border border-line bg-surface">
            {book.map((entry) => {
              const pin = { net: entry.net, address: entry.address, label: entry.label };
              const on = pins.some((item) => item.net === pin.net && item.address === pin.address);
              return (
                <li key={`${entry.net}:${entry.address}`} className="border-b border-line last:border-b-0">
                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm">
                        {entry.label}
                        <span className="ml-2 text-xs text-subtle">{entry.netName}</span>
                      </div>
                      <div className="truncate text-xs text-subtle tabular-nums">{shortId(entry.address)}</div>
                    </div>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => onToggle(pin)}
                      className="inline-flex min-h-11 items-center rounded-sm border border-line bg-elevated px-3 text-sm font-medium"
                    >
                      {on ? "Unpin" : "Pin"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

function PinRow({ pin, nets, onToggle }: { pin: Pin; nets: NetView[]; onToggle: (pin: Pin) => void }) {
  const net = netById(nets, pin.net);
  return (
    <li className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-b-0">
      <div className="min-w-0">
        <div className="truncate text-sm">
          {pin.label}
          <span className="ml-2 text-xs text-subtle">{net.name}</span>
        </div>
        <div className="truncate text-xs text-subtle tabular-nums">{shortId(pin.address)}</div>
      </div>
      <button
        type="button"
        onClick={() => onToggle(pin)}
        className="inline-flex min-h-11 items-center rounded-sm px-3 text-sm text-muted"
      >
        Unpin
      </button>
    </li>
  );
}
