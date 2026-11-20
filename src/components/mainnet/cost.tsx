import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/cn";
import { feeUsd, gasLabel, intervalLabel, money, type NetId, type NetView } from "@/mainnet/model";
import type { Size } from "./types";

export function Cost({
  nets,
  size,
  onSize,
  onOpen,
}: {
  nets: NetView[];
  size: Size;
  onSize: (size: Size) => void;
  onOpen: (id: NetId) => void;
}) {
  const priced = nets
    .map((net) => {
      const fee = feeUsd(net, size);
      return fee == null ? null : { net, fee };
    })
    .filter((row): row is { net: NetView; fee: number } => row != null)
    .sort((a, b) => b.fee - a.fee);
  const logs = priced.map((row) => Math.log10(Math.max(row.fee, 1e-9)));
  const minLog = Math.min(...logs);
  const span = Math.max(Math.max(...logs) - minLog, 0.01);
  const rows = priced.map((row) => ({
    ...row,
    plot: 0.14 + 0.86 * ((Math.log10(Math.max(row.fee, 1e-9)) - minLog) / span),
  }));

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="font-display text-2xl font-medium tracking-tight">Transfer cost</h2>
          <p className="mt-1 max-w-xl text-sm text-muted">
            {size === "transfer"
              ? "140 vB on Bitcoin, 21,000 gas on EVM, one signature on Solana."
              : "420 vB on Bitcoin, 180,000 gas on EVM, three signatures on Solana."}
          </p>
        </div>
        <div className="grid w-full grid-cols-2 gap-1 rounded-md border border-line bg-surface p-1 md:w-64">
          {(
            [
              ["transfer", "Transfer"],
              ["call", "Contract"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={size === id}
              onClick={() => onSize(id)}
              className={cn(
                "min-h-11 rounded-sm text-sm font-medium",
                size === id ? "bg-elevated text-fg" : "text-muted",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-line bg-surface p-4">
        <p className="text-xs text-subtle">Bar length is logarithmic. Figures below are the actual cost.</p>
        <div className="mt-3 h-72 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
              <XAxis type="number" domain={[0, 1]} hide />
              <YAxis
                type="category"
                dataKey={(row: { net: NetView }) => row.net.name}
                width={84}
                tick={{ fill: "var(--color-muted)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "transparent" }}
                contentStyle={{
                  background: "var(--color-elevated)",
                  border: "1px solid var(--color-line)",
                  borderRadius: 8,
                  color: "var(--color-fg)",
                }}
                formatter={(_value, _name, item) => {
                  const fee = (item?.payload as { fee?: number } | undefined)?.fee;
                  return [money(fee ?? null), "Cost"];
                }}
              />
              <Bar dataKey="plot" fill="var(--color-accent)" radius={[0, 4, 4, 0]} barSize={12} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <ul className="overflow-hidden rounded-xl border border-line bg-surface">
        {rows.map(({ net, fee }) => (
          <li key={net.id} className="border-b border-line last:border-b-0">
            <button
              type="button"
              onClick={() => onOpen(net.id)}
              className="flex min-h-14 w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-elevated"
            >
              <span>
                <span className="block text-sm font-medium">{net.name}</span>
                <span className="text-xs text-subtle">
                  {gasLabel(net)} · {intervalLabel(net.blockMs)}
                </span>
              </span>
              <span className="text-sm tabular-nums">{money(fee)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
