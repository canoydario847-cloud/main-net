import { createServerFn } from "@tanstack/react-start";
import type { Snapshot } from "./model";

export const loadSnapshot = createServerFn({ method: "GET" }).handler(
  async (): Promise<Snapshot> => {
    const { fetchSnapshot } = await import("./fetch-snapshot.server.ts");
    return fetchSnapshot();
  },
);
