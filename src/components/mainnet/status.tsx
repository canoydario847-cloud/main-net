import { cn } from "@/lib/cn";
import { ageLabel } from "@/mainnet/model";

export function Status({
  link,
  now,
  fetchedAt,
}: {
  link: "sync" | "linked" | "card";
  now: number | null;
  fetchedAt: number | null;
}) {
  const label =
    link === "linked" ? "Linked" : link === "card" ? "Desk card" : "Syncing";
  const age =
    link === "linked" && now != null && fetchedAt != null
      ? ageLabel((now - fetchedAt) / 1000)
      : null;
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
