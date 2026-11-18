import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { NetId } from "./model";

export type Pin = {
  net: NetId;
  address: string;
  label: string;
};

type PinState = {
  pins: Pin[];
  toggle: (pin: Pin) => void;
  has: (net: NetId, address: string) => boolean;
};

export const usePins = create<PinState>()(
  persist(
    (set, get) => ({
      pins: [],
      has: (net, address) => get().pins.some((pin) => pin.net === net && pin.address === address),
      toggle: (pin) => {
        const pins = get().pins;
        const exists = pins.some((item) => item.net === pin.net && item.address === pin.address);
        set({
          pins: exists
            ? pins.filter((item) => !(item.net === pin.net && item.address === pin.address))
            : [pin, ...pins].slice(0, 24),
        });
      },
    }),
    { name: "mainnet-pins", skipHydration: true },
  ),
);
