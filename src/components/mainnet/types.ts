import type { NetId } from "@/mainnet/model";

export type Size = "transfer" | "call";
export type Selection = { kind: "net"; id: NetId } | { kind: "tx"; hash: string } | null;
