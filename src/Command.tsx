import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronsUp,
  Gavel,
  Plus,
  ShieldCheck,
  Target,
  Upload,
  Users,
  X,
} from "lucide-react";
import {
  MANAGERS,
  CATEGORIES,
  category,
  isLiverpool,
  type Manager,
  type Player,
  type State,
} from "./model";
import {
  available,
  financial,
  floorPrice,
  nextBid,
  owned,
  recommendation,
  remaining,
  requirements,
  score,
  status,
  type Action,
} from "./engine";
import {
  Badge,
  Button,
  Empty,
  Field,
  ManagerSelect,
  Panel,
  PlayerName,
  Progress,
  Step,
  fmt,
  Modal,
} from "./components";
type Props = {
  s: State;
  act: (a: Action) => boolean;
  onImport: () => void;
  onSetup: () => void;
  onScout: () => void;
};
export default function Command({ s, act, onImport, onSetup, onScout }: Props) {
  const [search, setSearch] = useState(""),
    [playerId, setPlayerId] = useState(""),
    [nominator, setNominator] = useState<Manager>("Pranav Kumsi"),
    [bidder, setBidder] = useState<Manager>("Pranav Kumsi"),
    [amount, setAmount] = useState(""),
    [confirm, setConfirm] = useState<"sale" | "unsold" | "correct" | null>(
      null,
    );
  const bidRef = useRef<HTMLInputElement>(null);
  const p = s.players.find((p) => p.id === s.auction?.playerId);
  const rec = useMemo(() => (p ? recommendation(s, p) : null), [s, p]);
  const high = s.auction?.bids.at(-1);
  const choices = available(s)
    .filter((p) =>
      `${p.name} ${p.club} ${p.positions.join(" ")}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    )
    .sort((a, b) => b.rating - a.rating);
  useEffect(() => {
    if (p) setAmount(String(nextBid(s, p)));
  }, [p?.id, high?.amount, s.rules.increment]);
  const needs = requirements(s, "Pranav Kumsi");
  const targets = useMemo(
    () =>
      available(s)
        .map((p) => ({ p, v: score(s, p) }))
        .sort((a, b) => b.v.value - a.v.value)
        .slice(0, 4),
    [s],
  );
  const nominate = () => {
    if (
      act({
        type: "nominate",
        playerId: playerId || choices[0]?.id || "",
        nominator,
      })
    ) {
      setPlayerId("");
      setSearch("");
    }
  };
  const bid = () => {
    if (act({ type: "bid", manager: bidder, amount: Number(amount) }))
      bidRef.current?.focus();
  };
  return (
    <div className="stack">
      <div className="page-title">
        <div>
          <span className="eyebrow">YOUR EDGE STARTS HERE</span>
          <h1>
            Auction command center
            <span className="title-dot" />
          </h1>
          <p>Read the room. Make your move. Build the team to beat.</p>
        </div>
        <Badge tone={p ? "lime" : "muted"}>
          <span className="live-dot" />
          {p ? "LIVE NOMINATION" : "READY WHEN YOU ARE"}
        </Badge>
      </div>
      {(!s.players.length ||
        MANAGERS.some((m) => s.budgets[m] === null) ||
        !s.profile.confirmed) && (
        <div className="setup-steps">
          <Step
            number={1}
            title="Load your player pool"
            detail={`${s.players.length} authoritative records`}
            done={!!s.players.length}
            onClick={onImport}
          />
          <Step
            number={2}
            title="Set the five budgets"
            detail="Every purse is independent"
            done={MANAGERS.every((m) => s.budgets[m] !== null)}
            onClick={onSetup}
          />
          <Step
            number={3}
            title="Define your playstyle"
            detail="Make the rankings yours"
            done={s.profile.confirmed}
            onClick={onSetup}
          />
        </div>
      )}
      <div className="command-grid">
        <div className="stack">
          <section className={`auction-card ${p ? "active" : ""}`}>
            <div className="auction-top">
              <span className="eyebrow">
                {p ? "ON THE BLOCK" : "THE TRANSFER ROOM"}
              </span>
              <Badge tone={p ? "lime" : "muted"}>
                {p ? "PROVISIONAL · NOT SOLD" : "AWAITING NOMINATION"}
              </Badge>
            </div>
            {p ? (
              <>
                <div className="featured-player">
                  <div>
                    <div className="position-label">
                      {p.positions.join(" / ")} <span>·</span> {p.club}
                    </div>
                    <h2>{p.name}</h2>
                    <p>
                      Nominated by <strong>{s.auction?.nominator}</strong>
                    </p>
                    {p.playStyles.length > 0 && (
                      <div className="tags">
                        {p.playStyles.map((v, i) => (
                          <Badge key={i}>{v}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="big-rating">
                    <strong>{p.rating}</strong>
                    <span>OVERALL</span>
                  </div>
                </div>
                <div className="attributes">
                  {Object.entries(p.attributes)
                    .slice(0, 6)
                    .map(([k, v]) => (
                      <div key={k}>
                        <strong>{v}</strong>
                        <span>{k}</span>
                      </div>
                    ))}
                  {!Object.keys(p.attributes).length && (
                    <span className="muted">
                      Attributes not supplied · fit uses rating and position
                      evidence
                    </span>
                  )}
                </div>
                <div className="auction-prices">
                  <div>
                    <span>UPLOADED BASE</span>
                    <strong>
                      {fmt(p.basePrice)} <small>{s.rules.currency}</small>
                    </strong>
                  </div>
                  <div>
                    <span>HIGHEST BID</span>
                    <strong className="text-lime">
                      {high ? fmt(high.amount) : "—"}{" "}
                      <small>{s.rules.currency}</small>
                    </strong>
                  </div>
                  <div>
                    <span>CURRENT LEADER</span>
                    <strong className="leader-name">
                      {high?.manager || "No bids yet"}
                    </strong>
                  </div>
                </div>
              </>
            ) : (
              <div className="pre-auction">
                <div className="jersey">
                  <svg viewBox="0 0 150 150" aria-hidden="true">
                    <path
                      d="M50 20 25 32 7 70 35 83 43 66 43 135 107 135 107 66 115 83 143 70 125 32 100 20Q75 42 50 20Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M50 20Q75 65 100 20M54 130V55M96 130V55"
                      fill="none"
                      stroke="currentColor"
                      opacity=".25"
                    />
                    <text
                      x="75"
                      y="100"
                      textAnchor="middle"
                      fill="currentColor"
                      fontSize="35"
                      fontWeight="700"
                    >
                      27
                    </text>
                  </svg>
                </div>
                <span className="eyebrow">
                  EVERY GREAT SQUAD STARTS WITH ONE BID
                </span>
                <h2>
                  Your next signing
                  <br />
                  changes everything.
                </h2>
                <p>
                  {s.players.length
                    ? "Choose an available player below to open the bidding."
                    : "Upload your player list to bring the auction to life."}
                </p>
                {!s.players.length && (
                  <Button variant="primary" onClick={onImport}>
                    <Upload size={16} />
                    Import player list
                    <ArrowUpRight size={16} />
                  </Button>
                )}
              </div>
            )}
            <div className="auction-bottom">
              <span>
                <ShieldCheck size={14} />
                Squad-completion safeguard active
              </span>
              <span>
                {s.rules.minSquad}–{s.rules.maxSquad} players / squad
              </span>
            </div>
          </section>
          <Panel
            title={p ? "Make the next move" : "Nominate a player"}
            eyebrow={p ? "LIVE BID CONTROLS" : "OPEN THE BIDDING"}
            action={
              p ? (
                <Button variant="ghost" onClick={() => act({ type: "cancel" })}>
                  <X size={14} />
                  Cancel nomination
                </Button>
              ) : (
                <Gavel size={18} />
              )
            }
          >
            {p ? (
              <>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    bid();
                  }}
                >
                  <div className="bid-controls">
                    <Field label="Bidding manager">
                      <ManagerSelect
                        value={bidder}
                        onChange={setBidder}
                        label="Bidding manager"
                      />
                    </Field>
                    <Field label={`New bid (${s.rules.currency})`}>
                      <input
                        ref={bidRef}
                        aria-label="New bid"
                        type="number"
                        required
                        min={nextBid(s, p)}
                        step={s.rules.increment}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                    </Field>
                    <Button type="submit" variant="primary">
                      <ChevronsUp size={18} />
                      Record bid
                    </Button>
                  </div>
                  <div className="quick-row">
                    <span>Quick amount</span>
                    {[1, 2, 5, 10].map((k) => (
                      <Button
                        type="button"
                        key={k}
                        onClick={() => {
                          setAmount(
                            String(
                              Math.round(
                                ((high?.amount ??
                                  floorPrice(s, p) - s.rules.increment) +
                                  s.rules.increment * k) *
                                  100,
                              ) / 100,
                            ),
                          );
                          bidRef.current?.focus();
                        }}
                      >
                        +{fmt(s.rules.increment * k)}
                      </Button>
                    ))}
                    <span className="fineprint">Enter ↵ to record</span>
                  </div>
                </form>
                <div className="sale-actions">
                  <Button
                    variant="sell"
                    disabled={!high}
                    onClick={() => setConfirm("sale")}
                  >
                    <Check size={17} />
                    Confirm sold{high ? ` · ${high.manager}` : ""}
                  </Button>
                  <Button onClick={() => setConfirm("unsold")}>
                    Mark unsold
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirm("correct")}>
                    Correct bid
                  </Button>
                </div>
                <div className="inline-history">
                  <span className="eyebrow">BID TAPE</span>
                  {s.auction?.bids.length ? (
                    <div>
                      {s.auction.bids
                        .slice()
                        .reverse()
                        .map((b, i) => (
                          <span key={b.id} className={i === 0 ? "latest" : ""}>
                            <b>{fmt(b.amount)}</b>
                            {b.manager}
                          </span>
                        ))}
                    </div>
                  ) : (
                    <p className="muted">
                      Bids will appear here. Money moves only after you confirm
                      a sale.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="form-grid">
                  <Field label="Find player">
                    <input
                      placeholder="Search name, club or position…"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPlayerId("");
                      }}
                    />
                  </Field>
                  <Field label="Nominated by">
                    <ManagerSelect
                      value={nominator}
                      onChange={setNominator}
                      label="Nominated by"
                    />
                  </Field>
                </div>
                <div className="nominate-row">
                  <select
                    aria-label="Player to nominate"
                    value={playerId || choices[0]?.id || ""}
                    onChange={(e) => setPlayerId(e.target.value)}
                  >
                    {!choices.length && (
                      <option value="">
                        {s.players.length
                          ? "No matching available players"
                          : "Import players to start"}
                      </option>
                    )}
                    {choices.map((p) => (
                      <option value={p.id} key={p.id}>
                        {p.name} · {p.positions.join("/")} · {p.rating} OVR ·
                        base {p.basePrice}
                        {s.unsold.includes(p.id) ? " · UNSOLD" : ""}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="primary"
                    disabled={!choices.length}
                    onClick={nominate}
                  >
                    Nominate
                    <ArrowRight size={17} />
                  </Button>
                </div>
              </>
            )}
          </Panel>
        </div>
        <div className="stack">
          <Panel
            title="Your bidding edge"
            eyebrow="PRANAV’S STRATEGY DESK"
            className="recommendation"
            action={
              <span className="engine-icon">
                <Target size={20} />
              </span>
            }
          >
            {rec && p ? (
              <>
                <div className={`decision ${rec.decision.toLowerCase()}`}>
                  <span>
                    {rec.decision === "BID"
                      ? "↗"
                      : rec.decision === "WAIT"
                        ? "Ⅱ"
                        : "✕"}
                  </span>
                  <div>
                    <strong>
                      {rec.decision === "BID" ? "BUY / BID" : rec.decision}
                    </strong>
                    <small>{rec.reason}</small>
                  </div>
                </div>
                <div className="ceiling">
                  <span>ABSOLUTE MAXIMUM BID</span>
                  <strong>
                    {fmt(rec.ceiling)}
                    <small>{s.rules.currency}</small>
                  </strong>
                  <div className="ceiling-grid">
                    <span>
                      Financial cap <b>{fmt(rec.financial)}</b>
                    </span>
                    <span>
                      Strategic cap <b>{fmt(rec.strategic)}</b>
                    </span>
                  </div>
                </div>
                <div className="recommend-metrics">
                  <div>
                    <span>Suggested next bid</span>
                    <b>
                      {rec.suggested === null
                        ? "Hold / do not bid"
                        : `${fmt(rec.suggested)} ${s.rules.currency}`}
                    </b>
                  </div>
                  <div>
                    <span>Value score</span>
                    <b>
                      {rec.value}
                      <small>/100</small>
                    </b>
                  </div>
                  <Progress value={rec.value} />
                  <div>
                    <span>Tactical fit</span>
                    <b>{rec.fit}/100</b>
                  </div>
                  <div>
                    <span>Positional urgency</span>
                    <b>
                      {rec.urgency > 0.6
                        ? "High"
                        : rec.urgency > 0
                          ? "Medium"
                          : "Covered"}
                    </b>
                  </div>
                  <div>
                    <span>Purse after next bid</span>
                    <b className={rec.after < rec.reserve ? "text-amber" : ""}>
                      {fmt(rec.after)} {s.rules.currency}
                    </b>
                  </div>
                  <div>
                    <span>Essential reserve</span>
                    <b>
                      {fmt(rec.reserve)} {s.rules.currency}
                    </b>
                  </div>
                </div>
                <div className="notice small">
                  <ShieldCheck size={16} />
                  <span>
                    {!Number.isFinite(rec.reserve)
                      ? "Not enough eligible players to complete the squad. Add the full pool before bidding."
                      : `Keep ${fmt(rec.reserve)} for positional coverage, remaining slots and your safety buffer.`}
                  </span>
                </div>
                <p className="fineprint">
                  {rec.measured
                    ? `${rec.attributeCount} supplied attributes. Fit reflects your ${s.profile.tempo.toLowerCase()} preferences and ${s.profile.formation}.`
                    : "Limited evidence: relevant attributes not supplied. Fit uses rating and formation eligibility."}{" "}
                  {!s.profile.confirmed &&
                    "Gameplay profile is unconfirmed; rankings are provisional."}
                </p>
                {rec.rivals.length > 0 && (
                  <p className="rival-note">
                    <Users size={14} />
                    Likely competition: {rec.rivals.join(", ")}
                  </p>
                )}
                {rec.alternatives.length > 0 && (
                  <div className="alternatives">
                    <span className="eyebrow">KEEP AN OPTION OPEN</span>
                    {rec.alternatives.map((a) => (
                      <div key={a.id}>
                        <PlayerName p={a} />
                        <span>
                          {fmt(a.basePrice)}
                          <small>base</small>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <details>
                  <summary>Why this price?</summary>
                  <p className="fineprint">
                    Opening {floorPrice(s, p)} × price multiplier{" "}
                    {s.profile.priceMultiplier}, adjusted for quality, urgency{" "}
                    {Math.round(rec.urgency * 100)}%, scarcity {rec.scarcity}
                    /100, {rec.redundant ? "redundant" : "useful"} depth, and{" "}
                    {rec.rivals.length} funded rivals with positional needs.
                    Capped by the feasible completion reserve and rounded down
                    to your bid increment. See Rules & gameplay for the full
                    formula.
                  </p>
                </details>
              </>
            ) : (
              <div className="edge-empty">
                <div className="orbit">
                  <Target size={38} />
                </div>
                <h3>
                  A clear answer.
                  <br />
                  Before every bid.
                </h3>
                <p>
                  Nominate a player to see your price ceiling, tactical fit and
                  best available alternatives.
                </p>
                <div className="decision-preview">
                  <Badge tone="lime">BUY / BID</Badge>
                  <Badge tone="amber">WAIT</Badge>
                  <Badge tone="red">PASS</Badge>
                </div>
                <div className="edge-points">
                  <span>
                    <Check size={14} />
                    Budget-aware recommendations
                  </span>
                  <span>
                    <Check size={14} />
                    Positional coverage protected
                  </span>
                  <span>
                    <Check size={14} />
                    Built around your gameplay
                  </span>
                </div>
              </div>
            )}
            <div className="engine-footnote">
              <span className="live-dot" />
              Deterministic engine · no live AI model
            </div>
          </Panel>
        </div>
      </div>
      <div className="bottom-grid">
        <Panel
          title="The squad blueprint"
          eyebrow="YOUR NEXT PRIORITIES"
          action={
            <Badge>
              {owned(s, "Pranav Kumsi").length}/{s.rules.minSquad} minimum
            </Badge>
          }
        >
          <div className="need-grid">
            {CATEGORIES.map((c) => (
              <div key={c}>
                <span>{c}</span>
                <strong>{needs[c]}</strong>
                <small>{needs[c] ? "still needed" : "covered"}</small>
                <Progress
                  value={s.rules.minimums[c] - needs[c]}
                  max={s.rules.minimums[c]}
                />
              </div>
            ))}
          </div>
        </Panel>
        <Panel
          title="Watchlist radar"
          eyebrow={
            s.profile.confirmed ? "PERSONALIZED TARGETS" : "PROVISIONAL TARGETS"
          }
          action={
            <Button variant="ghost" onClick={onScout}>
              Scout all
              <ArrowUpRight size={14} />
            </Button>
          }
        >
          {targets.length ? (
            <div className="radar-list">
              {targets.map(({ p, v }) => (
                <button
                  key={p.id}
                  onClick={() => {
                    if (!s.auction)
                      act({
                        type: "nominate",
                        playerId: p.id,
                        nominator: "Pranav Kumsi",
                      });
                  }}
                  disabled={!!s.auction}
                >
                  <PlayerName p={p} />
                  <Badge tone="lime">{v.value} fit/value</Badge>
                </button>
              ))}
            </div>
          ) : (
            <div className="compact-empty">
              Your highest-fit targets will appear after importing the player
              pool.
            </div>
          )}
        </Panel>
      </div>
      {confirm && (
        <Modal
          title={
            confirm === "sale"
              ? "Confirm the transfer"
              : confirm === "unsold"
                ? "Mark this player unsold?"
                : "Correct the current bid"
          }
          onClose={() => setConfirm(null)}
        >
          {confirm === "sale" ? (
            <>
              <p>
                <strong>{p?.name}</strong> goes to{" "}
                <strong>{high?.manager}</strong> for{" "}
                <strong>
                  {fmt(high?.amount)} {s.rules.currency}
                </strong>
                .
              </p>
              <p className="muted">
                This confirms ownership and deducts the winning manager’s
                budget. All safeguards run again now.
              </p>
              <div className="modal-footer">
                <Button onClick={() => setConfirm(null)}>Keep bidding</Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    if (act({ type: "sold" })) setConfirm(null);
                  }}
                >
                  Confirm sale
                </Button>
              </div>
            </>
          ) : confirm === "unsold" ? (
            <>
              <p>
                No money will move. The player remains available for a later
                nomination.
              </p>
              <Button
                variant="primary"
                onClick={() => {
                  if (act({ type: "unsold" })) setConfirm(null);
                }}
              >
                Confirm unsold
              </Button>
            </>
          ) : (
            <>
              <p className="muted">
                Replace this nomination’s bid tape with a corrected highest bid.
                The correction is logged and can be undone.
              </p>
              <div className="form-grid">
                <Field label="Correct manager">
                  <ManagerSelect value={bidder} onChange={setBidder} />
                </Field>
                <Field label="Correct amount">
                  <input
                    type="number"
                    min="0"
                    step=".01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </Field>
              </div>
              <Button
                variant="primary"
                onClick={() => {
                  if (
                    act({
                      type: "bid",
                      manager: bidder,
                      amount: Number(amount),
                      correct: true,
                    })
                  )
                    setConfirm(null);
                }}
              >
                Save corrected bid
              </Button>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
