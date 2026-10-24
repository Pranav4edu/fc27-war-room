import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Shield,
  Shirt,
  Sparkles,
  Users,
} from "lucide-react";
import {
  CATEGORIES,
  FORMATIONS,
  MANAGERS,
  cats,
  category,
  isLiverpool,
  normalize,
  type Manager,
  type Player,
  type State,
} from "./model";
import {
  available,
  bestLineup,
  floorPrice,
  owned,
  positionFit,
  remaining,
  requirements,
  score,
  spent,
  type Action,
} from "./engine";
import {
  Badge,
  Button,
  Empty,
  Field,
  Modal,
  Panel,
  PlayerName,
  Progress,
  fmt,
} from "./components";
export function DreamTeam({
  s,
  act,
}: {
  s: State;
  act: (a: Action) => boolean;
}) {
  const [formation, setFormation] = useState(s.profile.formation),
    [slot, setSlot] = useState<number | null>(null),
    [suggested, setSuggested] = useState("");
  const players = owned(s, "Pranav Kumsi");
  const key = `Pranav Kumsi:${formation}`;
  const auto = useMemo(() => bestLineup(s, players, formation), [s, formation]);
  const lineup = s.lineups[key] || auto;
  const slots = FORMATIONS[formation];
  const used = Object.values(lineup);
  const bench = players.filter((p) => !used.includes(p.id));
  const needs = requirements(s, "Pranav Kumsi");
  const xi = slots.map((pos, i) => ({
    slot: pos,
    p: players.find((p) => p.id === lineup[i]),
  }));
  const missing = xi.filter(
    (v) => !v.p || !v.p.positions.includes(v.slot.position),
  );
  const avg =
    xi.filter((v) => v.p).reduce((a, v) => a + v.p!.rating, 0) /
    (xi.filter((v) => v.p).length || 1);
  const changePlayer = (id: string) => {
    if (slot === null) return;
    const next = { ...lineup };
    for (const k of Object.keys(next)) if (next[k] === id) delete next[k];
    if (id) next[slot] = id;
    else delete next[slot];
    act({ type: "lineup", key, slots: next });
    setSlot(null);
  };
  return (
    <div className="stack">
      <div className="page-title">
        <div>
          <span className="eyebrow">PRANAV KUMSI / THE PROJECT</span>
          <h1>My dream team</h1>
          <p>Build your XI. Find the gaps. Make every signing count.</p>
        </div>
        <Badge tone="lime">
          {players.length} / {s.rules.maxSquad} players
        </Badge>
      </div>
      <div className="squad-summary">
        <div>
          <span>Squad rating</span>
          <strong>{players.length ? fmt(avg) : "—"}</strong>
          <small>Starting XI average</small>
        </div>
        <div>
          <span>Auction spend</span>
          <strong>{fmt(spent(s, "Pranav Kumsi"))}</strong>
          <small>{s.rules.currency} committed</small>
        </div>
        <div>
          <span>Remaining budget</span>
          <strong className="text-lime">
            {fmt(remaining(s, "Pranav Kumsi"))}
          </strong>
          <small>{s.rules.currency} to build with</small>
        </div>
        <div>
          <span>Still to sign</span>
          <strong>{Math.max(0, s.rules.minSquad - players.length)}</strong>
          <small>to reach minimum squad</small>
        </div>
      </div>
      <div className="squad-grid">
        <Panel
          title="The starting XI"
          eyebrow="TACTICAL BOARD"
          action={
            <select
              aria-label="Formation"
              value={formation}
              onChange={(e) => setFormation(e.target.value)}
            >
              {Object.keys(FORMATIONS).map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          }
        >
          <div className="pitch">
            <div className="pitch-lines">
              <div className="halfway" />
              <div className="center-circle" />
              <div className="box top" />
              <div className="box bottom" />
              <div className="goal top" />
              <div className="goal bottom" />
            </div>
            {xi.map(({ slot: pos, p }, i) => (
              <button
                className={`pitch-player ${p ? "filled" : ""} ${p && !p.positions.includes(pos.position) ? "out-position" : ""}`}
                aria-label={`${pos.position} slot ${i + 1}: ${p?.name || "empty"}`}
                key={i}
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                onClick={() => setSlot(i)}
              >
                <div className="shirt">
                  <Shirt size={39} />
                  <b>{p?.rating || "+"}</b>
                </div>
                <strong>{p?.name || pos.position}</strong>
                <small>
                  {pos.position}
                  {p && !p.positions.includes(pos.position)
                    ? " · out of position"
                    : ""}
                </small>
              </button>
            ))}
          </div>
          <div className="toolbar pitch-actions">
            <Button onClick={() => act({ type: "lineup", key, slots: auto })}>
              <Sparkles size={15} />
              Optimize XI
            </Button>
            <Button
              onClick={() => {
                const options = Object.keys(FORMATIONS)
                  .map((f) => {
                    const picks = bestLineup(s, players, f);
                    return {
                      f,
                      picks,
                      value: Object.values(picks).reduce(
                        (v, id) =>
                          v + (players.find((p) => p.id === id)?.rating || 0),
                        0,
                      ),
                      count: Object.keys(picks).length,
                    };
                  })
                  .sort((a, b) => b.count - a.count || b.value - a.value);
                setFormation(options[0].f);
                act({
                  type: "lineup",
                  key: `Pranav Kumsi:${options[0].f}`,
                  slots: options[0].picks,
                });
                setSuggested(
                  `${options[0].f} covers ${options[0].count}/11 exact positions with your current squad.`,
                );
              }}
            >
              Find best formation
            </Button>
            <span className="fineprint">
              Click a shirt to assign or move a player.
            </span>
          </div>
          {suggested && <div className="notice">{suggested}</div>}
        </Panel>
        <div className="stack">
          <Panel title="What your squad needs" eyebrow="COVERAGE CHECK">
            {CATEGORIES.map((c) => (
              <div className="coverage-row" key={c}>
                <span>{c}</span>
                <Progress
                  value={s.rules.minimums[c] - needs[c]}
                  max={s.rules.minimums[c]}
                />
                <b>{needs[c] ? `${needs[c]} needed` : "Covered"}</b>
              </div>
            ))}
            <div className={`notice ${missing.length ? "amber" : ""}`}>
              {missing.length
                ? `${formation} needs: ${missing.map((x) => x.slot.position).join(", ")}. Only supplied positions qualify for automatic selection.`
                : `All 11 roles are covered in ${formation}.`}
            </div>
            <p className="fineprint">
              Out-of-position assignments are allowed manually and flagged.
              Formation advice uses supplied eligibility, not unverified in-game
              penalties.
            </p>
          </Panel>
          <Panel title={`The bench · ${bench.length}`} eyebrow="IMPACT OPTIONS">
            {bench.length ? (
              <div className="roster-list">
                {bench
                  .sort(
                    (a, b) =>
                      (b.attributes.pace ?? b.rating) -
                      (a.attributes.pace ?? a.rating),
                  )
                  .map((p) => (
                    <div key={p.id}>
                      <PlayerName p={p} />
                      <Badge>
                        {fmt(s.sales.find((t) => t.playerId === p.id)?.price)}
                      </Badge>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="compact-empty">
                Your substitutes will appear here as the squad grows.
              </div>
            )}
          </Panel>
          <Panel title="Match plan" eyebrow="BASED ON YOUR PROFILE">
            <ul className="strategy-list">
              <li>
                <strong>In possession</strong>
                {s.profile.tempo} tempo with {s.profile.approach.toLowerCase()},
                using {s.profile.channel.toLowerCase()} routes.
              </li>
              <li>
                <strong>Out of possession</strong>
                {s.profile.press === "High press"
                  ? "Press actively; prioritize supplied stamina and pace for recovery."
                  : s.profile.press === "Hold shape"
                    ? "Protect your shape and limit defensive gaps."
                    : "Use selective pressure and keep a covering midfielder."}{" "}
                {s.profile.defending === "Needs support"
                  ? "Use midfield cover to reduce isolated defending."
                  : ""}
              </li>
              <li>
                <strong>Substitutions</strong>
                {s.profile.subs}
              </li>
            </ul>
            <p className="fineprint">
              Tactical principles only. FC 27 slider names, roles and mechanics
              have not been verified.
            </p>
          </Panel>
        </div>
      </div>
      <Panel title="Squad strengths & opportunities">
        <div className="form-grid">
          <div>
            <h3>Best supplied quality</h3>
            {players.length ? (
              players
                .slice()
                .sort((a, b) => score(s, b).fit - score(s, a).fit)
                .slice(0, 3)
                .map((p) => (
                  <div className="strength-row" key={p.id}>
                    <PlayerName p={p} />
                    <Badge tone="lime">{score(s, p).fit} fit</Badge>
                  </div>
                ))
            ) : (
              <p className="muted">
                Your confirmed purchases will establish your strengths.
              </p>
            )}
          </div>
          <div>
            <h3>Before you face Liverpool</h3>
            <p className="muted">
              {s.players.filter(isLiverpool).length
                ? `Compare your supplied ${s.players.filter(isLiverpool).length}-player Liverpool reference in Opponent intelligence. Target the weakest rated covered role, while preserving defensive cover against their strongest supplied attackers.`
                : "Upload Liverpool records to assess Pinky. A top-200 file may contain only part of Liverpool’s complete squad; no missing players will be invented."}
            </p>
            <p className="muted">
              {Object.entries(needs)
                .filter(([, n]) => n > 0)
                .map(([c, n]) => `${n} ${c}`)
                .join(" · ") || "All minimum positional needs are covered."}
            </p>
          </div>
        </div>
      </Panel>
      {slot !== null && (
        <Modal
          title={`Assign ${slots[slot].position} · slot ${slot + 1}`}
          onClose={() => setSlot(null)}
        >
          <p className="muted">
            Moving a player removes their previous assignment, so nobody appears
            twice.
          </p>
          <div className="assign-list">
            {players
              .slice()
              .sort(
                (a, b) =>
                  positionFit(b, slots[slot].position) -
                    positionFit(a, slots[slot].position) || b.rating - a.rating,
              )
              .map((p) => (
                <button key={p.id} onClick={() => changePlayer(p.id)}>
                  <PlayerName p={p} />
                  <Badge
                    tone={
                      p.positions.includes(slots[slot].position)
                        ? "lime"
                        : "amber"
                    }
                  >
                    {p.positions.includes(slots[slot].position)
                      ? "Eligible"
                      : "Out of position"}
                  </Badge>
                </button>
              ))}
            <Button onClick={() => changePlayer("")}>
              Leave position empty
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
export function Opponents({ s }: { s: State }) {
  const [manager, setManager] = useState<Manager | "Pinky">("Lord");
  const liverpool = manager === "Pinky";
  const roster = liverpool ? s.players.filter(isLiverpool) : owned(s, manager);
  const needs = liverpool ? null : requirements(s, manager);
  const form = useMemo(
    () =>
      Object.keys(FORMATIONS)
        .map((f) => ({ f, xi: bestLineup(s, roster, f) }))
        .sort((a, b) => Object.keys(b.xi).length - Object.keys(a.xi).length)[0],
    [s, manager],
  );
  const targets = liverpool
    ? []
    : available(s)
        .filter(
          (p) =>
            cats(p).some((c) => needs![c] > 0) &&
            floorPrice(s, p) <= (remaining(s, manager) || 0),
        )
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 4);
  const myNeeds = requirements(s, "Pranav Kumsi");
  const weak = CATEGORIES.map((c) => {
    const group = roster.filter((p) => cats(p).includes(c));
    return {
      c,
      avg: group.length
        ? group.reduce((a, p) => a + p.rating, 0) / group.length
        : 0,
      count: group.length,
    };
  }).sort((a, b) => a.avg - b.avg);
  return (
    <div className="stack">
      <div className="page-title">
        <div>
          <span className="eyebrow">KNOW WHO YOU’RE UP AGAINST</span>
          <h1>Opponent intelligence</h1>
          <p>
            Watch their spending. Anticipate their needs. Find your advantage.
          </p>
        </div>
        <Badge>Observed data + labeled estimates</Badge>
      </div>
      <div className="opponent-tabs">
        {[...MANAGERS.slice(1), "Pinky"].map((m) => (
          <button
            key={m}
            onClick={() => setManager(m as Manager | "Pinky")}
            className={manager === m ? "selected" : ""}
          >
            {m}
            {m === "Pinky" && <Badge tone="red">Liverpool</Badge>}
          </button>
        ))}
      </div>
      <div className="squad-summary">
        <div>
          <span>Squad size</span>
          <strong>{roster.length}</strong>
          <small>
            {liverpool ? "Uploaded Liverpool records" : "Confirmed purchases"}
          </small>
        </div>
        <div>
          <span>Remaining purse</span>
          <strong>{liverpool ? "N/A" : fmt(remaining(s, manager))}</strong>
          <small>
            {liverpool
              ? "Outside auction accounting"
              : `${s.rules.currency} available`}
          </small>
        </div>
        <div>
          <span>Open squad slots</span>
          <strong>
            {liverpool ? "N/A" : s.rules.maxSquad - roster.length}
          </strong>
          <small>to maximum</small>
        </div>
        <div>
          <span>Likely formation</span>
          <strong className="formation-stat">
            {roster.length ? form.f : "—"}
          </strong>
          <small>Estimate from exact position coverage</small>
        </div>
      </div>
      {liverpool && (
        <div className="notice amber">
          Pinky owns Liverpool’s complete squad. This view shows only{" "}
          {roster.length} supplied Liverpool records; completeness is
          unverified. Import any missing Liverpool players separately. No budget
          is deducted.
        </div>
      )}
      <div className="bottom-grid">
        <Panel
          title={`${manager}’s roster`}
          eyebrow={liverpool ? "LIVERPOOL REFERENCE" : "CONFIRMED SIGNINGS"}
        >
          {roster.length ? (
            <div className="roster-list">
              {roster
                .slice()
                .sort((a, b) => b.rating - a.rating)
                .map((p) => (
                  <div key={p.id}>
                    <PlayerName p={p} />
                    <div className="align-right">
                      <strong>
                        {liverpool
                          ? "Liverpool"
                          : `${fmt(s.sales.find((t) => t.playerId === p.id)?.price)} ${s.rules.currency}`}
                      </strong>
                      <small>
                        {liverpool
                          ? "Excluded from bidding"
                          : `Base ${p.basePrice}`}
                      </small>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <Empty
              title="No confirmed signings yet"
              detail="Their transfers will appear automatically when you confirm sales."
            />
          )}
        </Panel>
        <div className="stack">
          <Panel
            title="Where they are exposed"
            eyebrow="POSITIONAL INTELLIGENCE"
          >
            {weak.map(({ c, avg, count }) => (
              <div className="coverage-row" key={c}>
                <span>{c}</span>
                <Progress value={avg} />
                <b>{count ? `${fmt(avg)} OVR` : "No data"}</b>
              </div>
            ))}
            <p className="fineprint">
              Category averages use supplied ratings. Versatile players may
              appear in multiple averages; minimum coverage below counts each
              player once.
            </p>
            {needs && (
              <div className="tags">
                {CATEGORIES.map((c) => (
                  <Badge key={c} tone={needs[c] ? "amber" : "lime"}>
                    {c}: {needs[c]} needed
                  </Badge>
                ))}
              </div>
            )}
            {liverpool && roster.length > 0 && (
              <div className="notice">
                Scouting hypothesis: test{" "}
                {weak.find((v) => v.count)?.c || "unverified"} coverage; keep
                cover against{" "}
                {roster
                  .filter((p) => cats(p).includes("FWD"))
                  .sort((a, b) => b.rating - a.rating)
                  .slice(0, 2)
                  .map((p) => p.name)
                  .join(" and ") || "their attacking threats"}
                . Validate this in play; ratings alone do not establish a
                tactical weakness.
              </div>
            )}
          </Panel>
          <Panel
            title="Possible next targets"
            eyebrow="INFERRED · NOT THEIR STATED PLANS"
          >
            {targets.map((p) => (
              <div className="strength-row" key={p.id}>
                <PlayerName p={p} />
                {cats(p).some((c) => myNeeds[c] > 0) && (
                  <Badge tone="amber">Shared need</Badge>
                )}
              </div>
            ))}
            {!targets.length && (
              <p className="muted">
                {liverpool
                  ? "Liverpool is fixed; Pinky is not bidding."
                  : "No targets can be inferred until budgets and available players are supplied."}
              </p>
            )}
          </Panel>
        </div>
      </div>
      <Panel title="Read the auction, then act" eyebrow="PRANAV’S ADVANTAGE">
        <div className="form-grid">
          <div>
            <h3>Purchases worth noticing</h3>
            {!liverpool &&
            s.sales.filter(
              (t) =>
                t.manager === manager &&
                t.price >
                  Math.max(t.basePrice, s.rules.minPrice) *
                    s.profile.priceMultiplier *
                    1.5,
            ).length ? (
              s.sales
                .filter(
                  (t) =>
                    t.manager === manager &&
                    t.price >
                      Math.max(t.basePrice, s.rules.minPrice) *
                        s.profile.priceMultiplier *
                        1.5,
                )
                .map((t) => (
                  <p className="notice amber" key={t.id}>
                    {s.players.find((p) => p.id === t.playerId)?.name}:{" "}
                    {fmt(t.price / Math.max(t.basePrice, s.rules.minPrice))}×
                    opening price. A high premium under your price assumptions;
                    it may reduce their future flexibility.
                  </p>
                ))
            ) : (
              <p className="muted">
                No unusually high premiums identified under your current
                multiplier. Paying a premium alone does not prove a poor
                purchase.
              </p>
            )}
          </div>
          <div>
            <h3>Nomination opportunity</h3>
            {targets
              .filter((p) => cats(p).every((c) => myNeeds[c] === 0))
              .slice(0, 2)
              .map((p) => (
                <p key={p.id} className="notice">
                  Consider nominating {p.name}: {manager} has an unmet role and
                  you have coverage. Opening is {fmt(floorPrice(s, p))}. Risk:
                  they may pass; only place bids you are willing to win.
                </p>
              ))}
            {!targets.some((p) => cats(p).every((c) => myNeeds[c] === 0)) && (
              <p className="muted">
                No clear competitor-spend nomination yet. Your own positional
                coverage takes priority.
              </p>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}
