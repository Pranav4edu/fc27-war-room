# FC 27 Auction War Room — optimized implementation brief

## Five improvements to the original specification

1. Define a small auction state machine and one authoritative sale ledger. Provisional bids never spend money or assign players.
2. Separate the financial ceiling from willingness to pay. Reserve a demonstrably feasible completion using the uploaded pool, not merely `(slots × minimum price)`.
3. Define explicit defaults, currency conventions and validation. Unknown budgets stay unknown; missing attributes stay missing; Liverpool is excluded without inventing its roster.
4. Make recovery and quick operation first-class: preview imports, single-screen bidding, persistent purse strip, reversible transactions, multi-tab locking, JSON backups and correction records.
5. Treat tactical advice as an auditable model. Show inputs, uncertainty, equations and limits; keep unconfirmed preferences provisional and never describe heuristics as live AI.

## Architecture and scope

Build a private static React/TypeScript application with Vite. One operator records the five-man auction. Browser local storage is authoritative for that browser/origin. All state mutations pass through a pure domain reducer and are persisted before rendering the new state. A Web Lock permits one writing tab; other tabs synchronize their view through storage events. Revision checks detect stale writes. No cross-device synchronization, model API or cloud auction database is claimed.

Use six main routes/views plus Rules & gameplay. Keep the five managers’ purse tiles and an active player/decision strip visible during scrolling. Use a dark green/lime football design with accessible native controls, keyboard input and responsive tables/pitch.

## Authoritative data

- Managers: Pranav Kumsi, Lord, Rakshan, LS, Sharan. Their initial budgets are nullable and independent.
- Pinky owns Liverpool. Liverpool records only appear in a separate reference squad and cannot be nominated or purchased.
- Players require name, club, integer rating 1–99, one or more recognized positions and nonnegative base price. Optional attributes, PlayStyles and notes are never inferred.
- Support CSV and .xlsx, worksheet and header-row selection, column mapping, editable previews, normalized duplicate-name checks, validation and manual additions/edits.
- No real player examples are seeded. Explicit synthetic fixtures are confined to tests.
- Sold/currently nominated records cannot be edited until the sale is voided or the nomination cancelled.

## Auction transitions and rules

Defaults: 18 minimum players, 20 maximum; minimum purchase 1; increment 1; units `cr`; minimums GK 2, CB 3, FB 3, MID 5, FWD 3. All are editable. Opening price is `max(basePrice, minPrice)`. A legal bid equals opening plus an integer multiple of increment, and exceeds the previous bid by at least an increment. Money uses two decimal places and integer-cent comparisons.

Available/unsold → nominated → sold or unsold. Cancel clears the provisional nomination. A bid only changes the bid tape. Confirm sale revalidates legality and commits player ownership, price, base snapshot, timestamp and bid history atomically. Duplicate ownership, insufficient purse, excess squad size and infeasible completion are rejected.

Correct bid replaces the active tape with a logged corrected bid. Correct sale reverses that sale for validation, then records the corrected manager/price. Void sale refunds the owner and returns the player to the pool. Undo restores the previous committed snapshot. Reset requires typed confirmation and retains players, budgets and profile.

## Financial feasibility

For a candidate, force all existing owned players and the candidate into a minimum-cost assignment. Remaining available players have cost `max(uploaded base, minPrice)`. Each player can occupy exactly one eligible category or flexible slot. Category capacities equal configured minimums; flexible capacity fills the rest of the required squad. A dominating negative cost ensures all owned/candidate players are selected. If no full assignment exists, bidding is blocked. Otherwise reserve the additional selected players’ floor costs, plus Pranav’s optional extra safety reserve.

Financial ceiling = remaining purse minus that reserve. This establishes feasibility at current price floors; future competitor purchases and premiums are unknown. Display this limitation.

## Strategic model

Score = normalized weighted average of uploaded overall, tactical fit, role urgency/scarcity and versatility. Defaults 35/35/20/10. Attribute fit uses supplied relevant metrics and preference weights; missing relevant attributes fall back to uploaded overall and receive a limited-evidence label. Formation eligibility, selected supplied PlayStyles, weak foot/skill moves and explicitly supplied favorites adjust fit.

Strategic ceiling = opening × configurable multiplier × (0.6 + value/100) × (0.8 + urgency × 0.35 + scarcity/500), with depth and low-rival-demand discounts. Discount redundant striker purchases after the preferred starter/backup count. Absolute maximum = lower financial/strategic ceiling, rounded down to the bid grid. No permissible opening bid means maximum 0.

BID when next price fits and the need/value case is attractive; WAIT while leading, depth is sufficient, or funded rival demand is absent; PASS/STOP when the next price exceeds the ceiling or completion is infeasible. Suggestions do not bypass sale safeguards. Opponent demand and nomination tactics are labeled estimates.

## Gameplay and squads

The user selected 4-3-3, fast wide attacks and counterattacking. Seed formation 4-3-3, tempo Counterattack, channel Wings and attacker Fast. Keep remaining preferences editable and confirmation explicit. Ask about attacking method, skill moves, pressing, manual defending, attribute importance, favorite players, striker count and substitutions in the setup form.

Optimize XI using maximum-cardinality, maximum-score assignment to exact supplied formation positions; never reuse a player. Support five formations, manual pitch assignment and out-of-position warnings. Show bench, minimum coverage, formation gaps, fit strengths, tactical principles and supplied Liverpool comparisons.

## Acceptance checks

Exercise real .xlsx and CSV parsing; unequal budgets; provisional bid vs confirmed sale; increment and reserve rejection; Liverpool exclusion; correction and refund; undo; reload persistence; backup/restore; reset; comparison; starting XI; second-tab lock; desktop/mobile layout. Unit tests use obvious synthetic data, never presented as FC data. Deliver production build, private URL, source and launch instructions. Clearly document .xlsx-only Excel support, no PDF extraction, no cloud state and no live AI.
