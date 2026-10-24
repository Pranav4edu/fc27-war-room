# Verification

Verified October 23, 2026 (America/Chicago).

## Automated checks

`npm test`: 26 tests passed. Includes CSV aliases/quoted cells, Excel buffers and title/header rows, duplicate detection, Liverpool exclusion, independent budgets, provisional bids, sale confirmation, unsold/re-nomination, increment rules, completion reserves, infeasible coverage, versatile-player uniqueness, non-greedy positional matching, correction/refund, maximum squad size, settings validation, reset snapshots, ceiling bounds, adaptive WAIT/PASS, third-striker depth, supplied attributes/favorites, exact-position XI and backup integrity.

`npm run build`: TypeScript compilation and Vite production build passed.

`npm audit --omit=dev`: 0 known vulnerabilities reported at verification. The full install audit also reported 0.

## Browser workflow verification

Tests were run at the separate localhost origin using visibly labeled `TEST ONLY` fixtures; they were not added to the default application state or the deployed bundle.

- Uploaded an actual `.xlsx` workbook with a title above its headers; mapped 121 records, reviewed the table and committed. One supplied Liverpool test record was excluded from bidding.
- Configured distinct purses of 500/600/700/800/900 for the test only.
- Nominated a test striker. Recorded Lord's bid of 20: purse stayed 600; Pranav's recommendation became PASS at the displayed strategic ceiling.
- Confirmed sale: Lord's purse became 580 and ownership became 1/20. Undo restored the nomination and purse 600.
- Attempted bid 999999: rejected with an explicit 580 ceiling and 20 completion reserve.
- Corrected the bid to Pranav at 4, confirmed sale, and observed purse 496 plus automatic ST assignment on the pitch.
- Reloaded: sale, squad and purse remained intact.
- Downloaded a complete backup, reset with typed confirmation, restored through a preview, and observed the same 496 purse and one-player squad.
- Compared two players and inspected the finance ledgers.
- Opened a second same-origin tab: the second tab became read-only while the operator held the lock.
- Checked desktop and 390×844 mobile layout, navigation and live bid strip. DOM page width matched scroll width (383 px after the scrollbar); wide purses/tables scroll within their containers.
- Browser console reported no runtime errors in the checked session.

## Fixes prompted by verification

- Excel blank/repeated headers now get distinct map-able labels; worksheet header row is selectable.
- Web Lock acquisition now queues safely and releases on teardown, including development hot reload.
- Action errors are visible inside modal dialogs rather than hidden behind them.
- Historical sales stay valid after changing future minimum-price rules.
- Existing pure-striker depth lowers the recommendation for another expensive striker.

## Explicit verification limits

No real FC 27 data was supplied in the chat, so competitive effectiveness and the completeness of Liverpool's squad cannot be validated. There is no live AI model or cross-device auction synchronization. PDF and legacy `.xls` parsing are not implemented. Completion feasibility uses current price floors; future premiums and competitor choices remain uncertain.
