# Main Net

Production desk for Bitcoin, Ethereum, Solana, Base, Arbitrum, Polygon, Avalanche, and Optimism.

Spots, chain tips, and a standard transfer cost come from public reads. The tape is a local model priced off those spots — not a chain feed. Pins stay on the device.

## Run

```bash
npm install
npm run dev
```

Open the app and wait for **Linked**. Until the reads land, the desk shows its last card.

## Desk

| Section | What it does |
| --- | --- |
| Networks | Spot, 24h change, tip, transfer cost, TVL |
| Tape | Modeled settlements you can open |
| Cost | Transfer vs contract call. Bar length is logarithmic |
| Trace | Search the tape and pin a desk address |

EVM cost is execution gas only. Rollups also pay a data fee this desk does not read.
