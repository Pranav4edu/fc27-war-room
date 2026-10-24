import { useState } from "react";
import {
  Download,
  History,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Upload,
  Wallet,
} from "lucide-react";
import Papa from "papaparse";
import {
  CATEGORIES,
  MANAGERS,
  category,
  isLiverpool,
  type Manager,
  type Sale,
  type State,
} from "./model";
import {
  completion,
  floorPrice,
  owned,
  remaining,
  requirements,
  spent,
  type Action,
} from "./engine";
import { download, exportPlayers } from "./importer";
import {
  Badge,
  Button,
  Empty,
  Field,
  ManagerSelect,
  Modal,
  Panel,
  PlayerName,
  Progress,
  fmt,
} from "./components";
const COLORS = ["#c6f465", "#a69afa", "#edb877", "#7bc4e0", "#ec95ae"];
export function Finance({ s }: { s: State }) {
  const [m, setM] = useState<Manager>("Pranav Kumsi");
  const rem = remaining(s, m),
    n = owned(s, m).length,
    slots = Math.max(0, s.rules.minSquad - n),
    plan = completion(s, m);
  const maxBudget = Math.max(1, ...MANAGERS.map((m) => s.budgets[m] || 0));
  return (
    <div className="stack">
      <div className="page-title">
        <div>
          <span className="eyebrow">EVERY CREDIT HAS A JOB</span>
          <h1>Financial war room</h1>
          <p>Protect your purse without passing up the right player.</p>
        </div>
        <Badge tone="lime">
          <ShieldCheck size={13} />
          Completion reserve enforced
        </Badge>
      </div>
      <div className="bottom-grid">
        <Panel
          title="The balance of power"
          eyebrow="INITIAL / SPENT / REMAINING"
        >
          <div className="chart-legend">
            <span>
              <i className="legend-spent" />
              Spent
            </span>
            <span>
              <i className="legend-remaining" />
              Remaining
            </span>
          </div>
          {MANAGERS.map((m, i) => (
            <div className="budget-chart-row" key={m}>
              <div>
                <strong>{m}</strong>
                <span>
                  {fmt(remaining(s, m))}{" "}
                  <small>
                    / {fmt(s.budgets[m])} {s.rules.currency}
                  </small>
                </span>
              </div>
              <div
                className="budget-chart-track"
                style={{
                  width: `${Math.max(1, ((s.budgets[m] || 0) / maxBudget) * 100)}%`,
                }}
              >
                <i
                  className="spent"
                  style={{
                    width: `${s.budgets[m] ? (spent(s, m) / s.budgets[m]!) * 100 : 0}%`,
                  }}
                />
                <i style={{ background: COLORS[i], flex: 1 }} />
              </div>
            </div>
          ))}
        </Panel>
        <Panel
          title="Your next signing has a cost"
          eyebrow="SQUAD COMPLETION PLAN"
          action={<ManagerSelect value={m} onChange={setM} />}
        >
          <div className="finance-big">
            <span>Remaining purse</span>
            <strong>
              {fmt(rem)}
              <small>{s.rules.currency}</small>
            </strong>
          </div>
          <div className="recommend-metrics">
            <div>
              <span>Minimum slots remaining</span>
              <b>{slots}</b>
            </div>
            <div>
              <span>Average available / required slot</span>
              <b>{slots && rem !== null ? fmt(rem / slots) : "—"}</b>
            </div>
            <div>
              <span>Cheapest feasible completion</span>
              <b>{plan.feasible ? fmt(plan.cost) : "Infeasible"}</b>
            </div>
            <div>
              <span>Cash above completion reserve</span>
              <b>
                {rem !== null && plan.feasible ? fmt(rem - plan.cost) : "—"}
              </b>
            </div>
          </div>
          <div
            className={`notice ${!plan.feasible || (rem !== null && rem < plan.cost) ? "amber" : ""}`}
          >
            {!plan.feasible
              ? "The available pool cannot satisfy the squad rules. Upload the full list or review position requirements."
              : rem === null
                ? "Set this manager’s budget to activate financial checks."
                : rem < plan.cost
                  ? "Current purse is below the cheapest completion cost. Further purchases are blocked unless they restore feasibility."
                  : `The current pool can complete ${m}’s squad at its price floors. Recalculate every nomination; rivals may remove these options.`}
          </div>
          <p className="fineprint">
            A candidate’s exact legal ceiling depends on which positions they
            fill. See the command center for candidate-specific maximums. Extra
            reserve for Pranav: {s.profile.reserveBuffer}.
          </p>
        </Panel>
      </div>
      <Panel title="All five ledgers">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Manager</th>
                <th>Initial</th>
                <th>Spent</th>
                <th>Remaining</th>
                <th>% spent</th>
                <th>Players</th>
                <th>Avg. purchase</th>
                <th>Per needed slot</th>
              </tr>
            </thead>
            <tbody>
              {MANAGERS.map((m) => {
                const n = owned(s, m).length,
                  slots = Math.max(0, s.rules.minSquad - n),
                  r = remaining(s, m);
                return (
                  <tr key={m}>
                    <td>
                      <strong>{m}</strong>
                    </td>
                    <td>{fmt(s.budgets[m])}</td>
                    <td>{fmt(spent(s, m))}</td>
                    <td className={m === "Pranav Kumsi" ? "text-lime" : ""}>
                      {fmt(r)}
                    </td>
                    <td>
                      {s.budgets[m]
                        ? fmt((spent(s, m) / s.budgets[m]!) * 100) + "%"
                        : "—"}
                    </td>
                    <td>
                      {n}/{s.rules.maxSquad}
                    </td>
                    <td>{n ? fmt(spent(s, m) / n) : "—"}</td>
                    <td>{slots && r !== null ? fmt(r / slots) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
      <div className="bottom-grid">
        <Panel
          title="Where your money is playing"
          eyebrow={`${m.toUpperCase()} / BY PRIMARY POSITION`}
        >
          {CATEGORIES.map((c, i) => {
            const value = s.sales
              .filter(
                (t) =>
                  t.manager === m &&
                  category(
                    s.players.find((p) => p.id === t.playerId)!.positions[0],
                  ) === c,
              )
              .reduce((a, t) => a + t.price, 0);
            return (
              <div className="category-spend" key={c}>
                <span>{c}</span>
                <Progress value={value} max={spent(s, m) || 1} />
                <strong>{fmt(value)}</strong>
              </div>
            );
          })}
          <p className="fineprint">
            Spending uses primary position so no purchase is counted twice.
          </p>
        </Panel>
        <Panel
          title="Allocate the remaining purse"
          eyebrow="LOWEST-COST COMPLETION · NOT A PRICE PREDICTION"
        >
          {plan.feasible ? (
            CATEGORIES.map((c) => {
              const list = plan.players.filter(
                (p) => category(p.positions[0]) === c,
              );
              return (
                <div className="allocation-row" key={c}>
                  <span>{c}</span>
                  <span>{list.length} players</span>
                  <strong>
                    {fmt(list.reduce((a, p) => a + floorPrice(s, p), 0))}
                  </strong>
                </div>
              );
            })
          ) : (
            <p className="muted">
              A feasible player pool is needed to estimate the remaining
              allocation.
            </p>
          )}
          <details>
            <summary>Show the players behind this reserve</summary>
            {plan.players.map((p) => (
              <div className="strength-row" key={p.id}>
                <PlayerName p={p} />
                <strong>{fmt(floorPrice(s, p))}</strong>
              </div>
            ))}
          </details>
        </Panel>
      </div>
      <Panel title="Squad strength comparison" eyebrow="UPLOADED RATINGS ONLY">
        {[...MANAGERS, "Pinky"].map((m, i) => {
          const players =
            m === "Pinky"
              ? s.players.filter(isLiverpool)
              : owned(s, m as Manager);
          const avg = players.length
            ? players.reduce((a, p) => a + p.rating, 0) / players.length
            : 0;
          return (
            <div className="strength-chart-row" key={m}>
              <strong>{m}</strong>
              <Progress value={avg} />
              <span>{players.length ? fmt(avg) + " OVR" : "No players"}</span>
            </div>
          );
        })}
        <p className="fineprint">
          Squad mean rating is a simple quality indicator, not a prediction of
          results. Pinky’s comparison covers only uploaded Liverpool records.
        </p>
      </Panel>
    </div>
  );
}
export function HistoryPage({
  s,
  act,
  undo,
  canUndo,
  onBackup,
  onRestore,
  onReset,
}: {
  s: State;
  act: (a: Action) => boolean;
  undo: () => void;
  canUndo: boolean;
  onBackup: () => void;
  onRestore: () => void;
  onReset: () => void;
}) {
  const [edit, setEdit] = useState<Sale | null>(null),
    [manager, setManager] = useState<Manager>("Pranav Kumsi"),
    [price, setPrice] = useState(""),
    [voiding, setVoiding] = useState(false);
  const rows = s.sales
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((t) => {
      const p = s.players.find((p) => p.id === t.playerId)!;
      const budget = s.budgets[t.manager];
      const after =
        budget === null
          ? null
          : budget -
            s.sales
              .filter((x) => x.manager === t.manager && x.order <= t.order)
              .reduce((a, x) => a + x.price, 0);
      return { ...t, name: p.name, after };
    });
  return (
    <div className="stack">
      <div className="page-title">
        <div>
          <span className="eyebrow">THE COMPLETE PAPER TRAIL</span>
          <h1>Auction history</h1>
          <p>Every confirmed transfer. Every correction. Always recoverable.</p>
        </div>
        <Button disabled={!canUndo} onClick={undo}>
          <RotateCcw size={16} />
          Undo last action
        </Button>
      </div>
      <div className="history-actions">
        <Button variant="primary" onClick={onBackup}>
          <Download size={16} />
          Save complete backup
        </Button>
        <Button onClick={onRestore}>
          <Upload size={16} />
          Restore auction
        </Button>
        <Button
          onClick={() =>
            download("fc27-players.csv", exportPlayers(s.players), "text/csv")
          }
        >
          Export player CSV
        </Button>
        <Button
          onClick={() =>
            download(
              "fc27-sales.csv",
              Papa.unparse(
                rows.map((t) => ({
                  order: t.order,
                  player: t.name,
                  manager: t.manager,
                  basePrice: t.basePrice,
                  salePrice: t.price,
                  premium: t.price - t.basePrice,
                  budgetAfter: t.after,
                  at: t.at,
                })),
                { escapeFormulae: true },
              ),
              "text/csv",
            )
          }
        >
          Export sales CSV
        </Button>
        <Button variant="danger" onClick={onReset}>
          <Trash2 size={16} />
          Reset auction
        </Button>
      </div>
      <Panel
        title="Confirmed transfers"
        eyebrow={`${s.sales.length} TRANSACTIONS`}
        action={<Badge>Provisional bids excluded</Badge>}
      >
        {rows.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Player</th>
                  <th>Winner</th>
                  <th>Base</th>
                  <th>Sale price</th>
                  <th>Over / under</th>
                  <th>Purse after</th>
                  <th>Correction</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id}>
                    <td>{t.order.toString().padStart(2, "0")}</td>
                    <td>
                      <strong>{t.name}</strong>
                      <small className="block">
                        {new Date(t.at).toLocaleString()}
                      </small>
                    </td>
                    <td>{t.manager}</td>
                    <td>{fmt(t.basePrice)}</td>
                    <td className="text-lime">{fmt(t.price)}</td>
                    <td>
                      <Badge tone={t.price > t.basePrice ? "amber" : "lime"}>
                        {t.price > t.basePrice ? "+" : ""}
                        {fmt(t.price - t.basePrice)}
                      </Badge>
                    </td>
                    <td>{fmt(t.after)}</td>
                    <td>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setEdit(t);
                          setManager(t.manager);
                          setPrice(String(t.price));
                          setVoiding(false);
                        }}
                      >
                        Correct / void
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="The ledger is waiting"
            detail="Confirmed sales will appear here. Recording a highest bid does not create a transfer."
          />
        )}
        <p className="fineprint">
          Purse-after values are reconstructed in transaction order using
          current configured initial budgets and corrected transactions.
          Complete backups preserve players, rules, profile, lineups, bids,
          history and the last 25 undo snapshots.
        </p>
      </Panel>
      <Panel title="Activity log" eyebrow="LOCAL AUDIT TRAIL">
        <div className="activity-log">
          {s.activity.length ? (
            s.activity
              .slice()
              .reverse()
              .map((a) => (
                <div key={a.id}>
                  <span className="timeline-dot" />
                  <p>
                    {a.message}
                    <small>{new Date(a.at).toLocaleString()}</small>
                  </p>
                </div>
              ))
          ) : (
            <p className="muted">Your first auction action starts the log.</p>
          )}
        </div>
      </Panel>
      {edit && (
        <Modal
          title={`Correct ${s.players.find((p) => p.id === edit.playerId)?.name}’s sale`}
          onClose={() => setEdit(null)}
        >
          <p className="muted">
            Corrections recalculate ownership and budgets atomically. Bid rules,
            squad size and completion safeguards still apply.
          </p>
          <div className="form-grid">
            <Field label="Winning manager">
              <ManagerSelect value={manager} onChange={setManager} />
            </Field>
            <Field label="Final price">
              <input
                type="number"
                min="0"
                step=".01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </Field>
          </div>
          <div className="modal-footer">
            <Button variant="danger" onClick={() => setVoiding(true)}>
              Void this sale
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (
                  act({
                    type: "correctSale",
                    id: edit.id,
                    manager,
                    price: Number(price),
                  })
                )
                  setEdit(null);
              }}
            >
              Save correction
            </Button>
          </div>
          {voiding && (
            <div className="notice amber">
              <p>
                Return this player to the available pool and refund{" "}
                {fmt(edit.price)} to {edit.manager}?
              </p>
              <Button
                variant="danger"
                onClick={() => {
                  if (act({ type: "voidSale", id: edit.id })) setEdit(null);
                }}
              >
                Confirm void & refund
              </Button>
            </div>
          )}
          <details>
            <summary>Original bidding tape ({edit.bidHistory.length})</summary>
            {edit.bidHistory.map((b) => (
              <p key={b.id}>
                {b.manager} · {fmt(b.amount)} ·{" "}
                {new Date(b.at).toLocaleTimeString()}
              </p>
            ))}
          </details>
        </Modal>
      )}
    </div>
  );
}
