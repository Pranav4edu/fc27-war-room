# FC 27 Auction War Room

A working single-operator auction application for Pranav Kumsi, Lord, Rakshan, LS and Sharan. Pinky’s Liverpool is outside the auction. No footballers, ratings, prices, budgets or transactions are preloaded.

## Run locally

Requires Node.js 22.12+ (tested on Node 26).

```bash
npm ci
npm run dev
```

Open the printed localhost URL. For a production build:

```bash
npm test
npm run build
npm run preview
```

Use the same browser and URL for the same auction. Localhost and the hosted site have separate storage. Move an auction between them using History → Save complete backup → Restore auction. Do not use a private/incognito window if you want persistence after closing the browser.

## First auction

1. Import players from CSV or Excel `.xlsx`. Select the worksheet/header row, map columns, review/edit records, and commit the import. Download the empty template in the importer if useful. Recognized aliases include Player/Name, Team/Club, OVR/Rating, Position/Positions, Price/Base price.
2. Enter each of the five budgets in Rules & gameplay (or load the budget CSV template). Review squad sizes, positional minimums, minimum purchase, increment and price unit. Save all settings.
3. Review the gameplay questionnaire. Pranav’s selected starting profile is 4-3-3, fast attackers, wing attacks and counterattacking. Other answers remain defaults until confirmed.
4. Nominate a player, select a manager, enter a bid and press Enter. Quick buttons populate the next amount; Record bid commits it. Confirm sold only when the auction actually ends.
5. Save a JSON backup periodically and before changing device/browser. The top-bar download button also saves a complete backup.

## Implemented

- All six requested views, plus editable rules and gameplay profile.
- CSV and `.xlsx` import, header selection, mapping, editable preview, duplicates, validation, manual records and optional attributes/PlayStyles.
- Live nomination, bidding tape, legal increments, current leader, explicit sale/unsold confirmation, cancellation, correction and void/refund.
- Single-source ledger for ownership, available pool, purses, slot counts and spending charts.
- Feasible-completion reserve using minimum-cost positional assignment; separate strategic ceiling and legal absolute maximum.
- Transparent BID/WAIT/PASS model, alternatives, role scarcity, rival demand and redundant-striker discounts.
- Personal target boards, filters, sortable columns, shortlist and two-to-four player comparison.
- Interactive pitch assignment, five formations, optimal exact-position XI, best-formation search, bench and missing-role guidance.
- Opponent rosters, needs, possible targets, premium flags and cautious nomination suggestions. Liverpool views include only supplied records.
- Browser autosave, last 25 undo snapshots, versioned full-state JSON backup/restore, CSV exports, typed reset confirmation, stale-write checks and Web Locks.
- Mobile navigation, horizontal purse/table scrolling and a sticky active-player/bid-decision strip.

## Rules and calculations

Default squad 18–20; minimum price 1; increment 1; price unit `cr`; category minimums GK 2, CB 3, FB 3, MID 5, FWD 3. Defaults are editable. Exact positions must be supplied; no automatic real-world position inference occurs.

Opening = max(base price, minimum price). Bids must be opening plus a whole-number multiple of increment. Prices use at most two decimal places. Dot decimal notation is required; ambiguous comma decimals are flagged.

Financial cap reserves the cheapest set of remaining available players that can complete the configured squad, including one-slot-only assignment of versatile players. Pranav can add a cash safety buffer. It is a check at current price floors: it cannot guarantee future auction prices or that competitors leave the same players available.

The strategic model and its editable weights are explained in the app and in IMPLEMENTATION-BRIEF.md. Missing metrics are labeled and use an explicit rating fallback. The model is deterministic; no AI API is connected and no claimed FC 27 mechanics are fabricated. Tactical suggestions are general principles based on supplied data and preferences.

## Storage and recovery

The auction lives in localStorage under `fc27-war-room-v1`. Saving happens before a mutation is rendered. Storage failures reject the action and display an error. A supported browser’s Web Locks API permits one operator tab; a waiting tab becomes editable after the first closes. Browsers lacking Web Locks display a single-tab warning. Different devices/browsers are independent: this is not a shared live database.

Backups include schema version, players, managers’ budgets, rules, profile, sales, live bids, unsold records, shortlist, lineups, activity and undo history. Restore validates records, references, budget integrity and active bids before replacing state. Invalid saved data is preserved for raw recovery export. Clearing browser site data deletes that browser’s stored auction; JSON backups are the portable recovery method.

Purse-after values in history are reconstructed from current configured initial budgets and corrected transaction order. Sale base prices and original bidding tapes remain recorded. Rule changes affect future auctions and do not retroactively change historical price floors.

## Scope limits

- Excel support is `.xlsx`; convert `.xls` or PDF to CSV/.xlsx. PDF extraction is not implemented.
- Hosted application files do not mean cloud-saved auction records. There is no cross-device synchronization or multiple-writer mode.
- No live model integration, verified FC 27 database, official player photos, or automatic Liverpool roster. Imported records are authoritative.
- A top-200 list may omit Liverpool players; Pinky’s squad completeness is unverified until the full roster is supplied.
- Offline data is retained locally, but installation as an offline PWA is not implemented.

## Code map

- `src/model.ts`: typed state, editable defaults and formations.
- `src/engine.ts`: immutable mutations, validation, min-cost completion, scoring and XI optimization.
- `src/storage.ts`: persisted snapshots, undo, locking and restore.
- `src/importer.ts`: CSV/Excel parsing, mapping and exports.
- `src/Command.tsx`, `Scout.tsx`, `Squads.tsx`, `Finance.tsx`, `Settings.tsx`: working application views.
- `tests/engine.test.ts`: domain/import/regression coverage.
- `tests/fixtures`: explicitly synthetic test data; not loaded by the application or included in the deployed static bundle.

Parsing uses [ExcelJS](https://github.com/exceljs/exceljs) and [Papa Parse](https://www.papaparse.com/docs). The application does not send uploaded files to either service.
