import {
  ATTRIBUTES,
  CATEGORIES,
  MANAGERS,
  POSITIONS,
  FORMATIONS,
  category,
  cats,
  cents,
  initialState,
  isLiverpool,
  money,
  normalize,
  uid,
  type Player,
  type State,
  type Manager,
  type Category,
  type Position,
  type Sale,
  type Rules,
  type Profile,
} from "./model";
export const owned = (s: State, m: Manager) =>
  s.sales
    .filter((t) => t.manager === m)
    .map((t) => s.players.find((p) => p.id === t.playerId)!)
    .filter(Boolean);
export const spent = (s: State, m: Manager) =>
  money(
    s.sales.filter((t) => t.manager === m).reduce((v, t) => v + t.price, 0),
  );
export const remaining = (s: State, m: Manager) =>
  s.budgets[m] === null ? null : money(s.budgets[m]! - spent(s, m));
export const available = (s: State) =>
  s.players.filter(
    (p) => !isLiverpool(p) && !s.sales.some((t) => t.playerId === p.id),
  );
export const floorPrice = (s: State, p: Player) =>
  Math.max(s.rules.minPrice, p.basePrice);
export const nextBid = (s: State, p: Player) =>
  s.auction?.playerId === p.id && s.auction.bids.length
    ? money(s.auction.bids.at(-1)!.amount + s.rules.increment)
    : floorPrice(s, p);
export const status = (s: State, p: Player) =>
  isLiverpool(p)
    ? "Liverpool"
    : s.sales.some((t) => t.playerId === p.id)
      ? "Sold"
      : s.auction?.playerId === p.id
        ? "Nominated"
        : s.unsold.includes(p.id)
          ? "Unsold"
          : "Available";
function insist(v: unknown, msg: string): asserts v {
  if (!v) throw new Error(msg);
}
const num = (n: unknown, min: number, max = 1e9) =>
  typeof n === "number" && Number.isFinite(n) && n >= min && n <= max;
const price = (n: unknown, min = 0) =>
  num(n, min) && Math.abs(Number(n) * 100 - Math.round(Number(n) * 100)) < 1e-5;
export function playerErrors(p: Player): string[] {
  const e: string[] = [];
  if (!p.name?.trim()) e.push("Name is required");
  if (!p.club?.trim()) e.push("Club is required");
  if (!num(p.rating, 1, 99) || !Number.isInteger(p.rating))
    e.push("Rating must be an integer from 1–99");
  if (
    !Array.isArray(p.positions) ||
    !p.positions.length ||
    p.positions.some((x) => !POSITIONS.includes(x))
  )
    e.push("Use valid positions (e.g. ST, LW)");
  if (!price(p.basePrice))
    e.push("Base price must be nonnegative, with at most 2 decimals");
  for (const [k, v] of Object.entries(p.attributes || {}))
    if (
      !ATTRIBUTES.includes(k as never) ||
      !num(
        v,
        ["weakFoot", "skillMoves"].includes(k) ? 1 : 0,
        ["weakFoot", "skillMoves"].includes(k) ? 5 : 99,
      ) ||
      (["weakFoot", "skillMoves"].includes(k) && !Number.isInteger(v))
    )
      e.push(`Invalid ${k}`);
  return e;
}
// Exact minimum-cost assignment: each player can fill one positional or flexible slot.
// Owned players receive a dominating negative cost so all must be selected.
type Edge = { to: number; rev: number; cap: number; cost: number };
function flow(costs: number[], eligible: number[][], capacities: number[]) {
  const n = costs.length,
    k = capacities.length,
    source = n + k,
    sink = source + 1,
    g: Edge[][] = Array.from({ length: sink + 1 }, () => []);
  const add = (a: number, b: number, cap: number, cost: number) => {
    g[a].push({ to: b, rev: g[b].length, cap, cost });
    g[b].push({ to: a, rev: g[a].length - 1, cap: 0, cost: -cost });
  };
  costs.forEach((c, i) => {
    add(source, i, 1, c);
    eligible[i].forEach((j) => add(i, n + j, 1, 0));
  });
  capacities.forEach((c, j) => add(n + j, sink, c, 0));
  let total = 0,
    count = 0;
  const target = capacities.reduce((a, b) => a + b, 0);
  while (count < target) {
    const dist = Array(g.length).fill(Infinity),
      pn = Array(g.length).fill(-1),
      pe = Array(g.length).fill(-1),
      q = [source],
      inq = Array(g.length).fill(false);
    dist[source] = 0;
    inq[source] = true;
    for (let z = 0; z < q.length; z++) {
      const v = q[z];
      inq[v] = false;
      g[v].forEach((e, i) => {
        if (e.cap > 0 && dist[e.to] > dist[v] + e.cost) {
          dist[e.to] = dist[v] + e.cost;
          pn[e.to] = v;
          pe[e.to] = i;
          if (!inq[e.to]) {
            q.push(e.to);
            inq[e.to] = true;
          }
        }
      });
    }
    if (!Number.isFinite(dist[sink])) break;
    for (let v = sink; v !== source; v = pn[v]) {
      const e = g[pn[v]][pe[v]];
      e.cap--;
      g[v][e.rev].cap++;
    }
    total += dist[sink];
    count++;
  }
  const selected = g[source]
    .map((e, i) => (e.cap === 0 ? i : -1))
    .filter((i) => i >= 0);
  const assignments = costs
    .map(
      (_, i) => g[i].find((e) => e.to >= n && e.to < n + k && e.cap === 0)?.to,
    )
    .map((v) => (v === undefined ? -1 : v - n));
  return { total, count, selected, assignments, target };
}
export function completion(s: State, m: Manager, candidate?: Player) {
  const own = owned(s, m),
    held = candidate ? [...own, candidate] : own;
  const pool = available(s).filter((p) => !held.some((o) => o.id === p.id));
  const target = Math.max(s.rules.minSquad, held.length);
  const all = [...held, ...pool];
  const floors = all.map((p) => cents(floorPrice(s, p)));
  const big = floors.reduce((a, b) => a + b, 0) + 1;
  const capacities = [
    ...CATEGORIES.map((c) => s.rules.minimums[c]),
    target - Object.values(s.rules.minimums).reduce((a, b) => a + b, 0),
  ];
  if (capacities.some((x) => x < 0) || held.length > s.rules.maxSquad)
    return {
      feasible: false,
      cost: Infinity,
      players: [] as Player[],
      counts: {} as Record<Category, number>,
    };
  const result = flow(
    all.map((_, i) => (i < held.length ? -big : floors[i])),
    all.map((p) => [...cats(p).map((c) => CATEGORIES.indexOf(c)), 5]),
    capacities,
  );
  const feasible =
    result.count === target &&
    held.every((_, i) => result.selected.includes(i));
  const needed = result.selected
    .filter((i) => i >= held.length)
    .map((i) => all[i]);
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<
    Category,
    number
  >;
  held.forEach((_, i) => {
    const j = result.assignments[i];
    if (j >= 0 && j < 5) counts[CATEGORIES[j]]++;
  });
  return {
    feasible,
    cost: feasible
      ? money(needed.reduce((a, p) => a + floorPrice(s, p), 0))
      : Infinity,
    players: needed,
    counts,
  };
}
export function financial(s: State, m: Manager, p: Player) {
  const rem = remaining(s, m),
    n = owned(s, m).length;
  if (rem === null)
    return {
      ceiling: 0,
      reserve: 0,
      feasible: false,
      reason: "Set this manager’s individual budget first.",
    };
  if (n >= s.rules.maxSquad)
    return {
      ceiling: 0,
      reserve: 0,
      feasible: false,
      reason: "Maximum squad size reached.",
    };
  const plan = completion(s, m, p);
  if (!plan.feasible)
    return {
      ceiling: 0,
      reserve: Infinity,
      feasible: false,
      reason:
        "The uploaded available pool cannot complete the required positions and squad size.",
    };
  const buffer = m === "Pranav Kumsi" ? s.profile.reserveBuffer : 0;
  const reserve = money(plan.cost + buffer);
  return {
    ceiling: Math.max(0, money(rem - reserve)),
    reserve,
    feasible: true,
    reason: `Reserve ${money(plan.cost)} for ${plan.players.length} required purchases + ${buffer} safety buffer.`,
  };
}
export function requirements(s: State, m: Manager) {
  const own = owned(s, m);
  const result = flow(
    own.map(() => -1),
    own.map((p) => cats(p).map((c) => CATEGORIES.indexOf(c))),
    CATEGORIES.map((c) => s.rules.minimums[c]),
  );
  return Object.fromEntries(
    CATEGORIES.map((c, j) => [
      c,
      Math.max(
        0,
        s.rules.minimums[c] - result.assignments.filter((a) => a === j).length,
      ),
    ]),
  ) as Record<Category, number>;
}
const clamp = (n: number, a = 0, b = 100) => Math.max(a, Math.min(b, n));
export function score(s: State, p: Player, m: Manager = "Pranav Kumsi") {
  const pref = s.profile,
    roles = cats(p),
    need = requirements(s, m);
  const roleUrgency = Math.max(
    ...roles.map((c) => need[c] / Math.max(1, s.rules.minimums[c])),
  );
  const demand = Math.max(
    ...roles.map((c) => Object.values(s.budgets).length * s.rules.minimums[c]),
  );
  const alternatives = available(s).filter(
    (q) =>
      q.id !== p.id &&
      cats(q).some((c) => roles.includes(c)) &&
      q.rating >= p.rating - 3,
  );
  const scarcity = clamp(
    100 * (1 - Math.min(1, alternatives.length / Math.max(1, demand))),
  );
  const weights: Partial<Record<string, number>> = roles.includes("GK")
    ? { reflexes: 5, diving: 4, handling: 4, passing: 1 }
    : roles.includes("CB")
      ? { pace: pref.pace, defending: 5, physical: pref.strength, passing: 2 }
      : roles.includes("FB")
        ? {
            pace: pref.pace + 1,
            defending: 4,
            stamina: pref.press === "High press" ? 5 : 2,
            passing: 3,
            dribbling: 2,
          }
        : roles.includes("MID")
          ? {
              passing: pref.tempo === "Possession" ? 6 : 4,
              dribbling: pref.skills === "Frequent" ? 5 : 3,
              agility: pref.agility,
              stamina: pref.press === "High press" ? 5 : 2,
              defending: pref.defending === "Needs support" ? 4 : 2,
              pace: pref.pace,
            }
          : {
              pace: pref.pace + (pref.tempo === "Counterattack" ? 2 : 0),
              agility: pref.agility,
              shooting: pref.finishing,
              finishing: pref.finishing,
              physical: pref.strength + (pref.attacker === "Physical" ? 2 : 0),
              dribbling: pref.skills === "Frequent" ? 5 : 2,
              passing: pref.approach === "Direct passing" ? 3 : 2,
            };
  if (!roles.includes("GK")) {
    if (
      pref.channel === "Wings" &&
      p.positions.some((x) => ["LW", "RW", "LM", "RM", "LB", "RB"].includes(x))
    )
      weights.pace = (weights.pace || 0) + 2;
    if (pref.attacker === "Fast") weights.pace = (weights.pace || 0) + 2;
    if (pref.approach === "Skill moves")
      weights.dribbling = (weights.dribbling || 0) + 2;
  }
  if (!roles.includes("GK")) {
    if (pref.approach === "Through balls") {
      weights.passing = (weights.passing || 0) + 2;
      weights.pace = (weights.pace || 0) + 1;
    }
    if (pref.approach === "Crossing") {
      weights.physical = (weights.physical || 0) + 2;
      weights.passing = (weights.passing || 0) + 1;
    }
    if (pref.channel === "Central")
      weights.passing = (weights.passing || 0) + 2;
    if (pref.press === "Hold shape")
      weights.defending = (weights.defending || 0) + 1;
  }
  let sum = 0,
    w = 0;
  for (const [k, weight] of Object.entries(weights)) {
    const v = p.attributes[k as keyof Player["attributes"]];
    if (v !== undefined) {
      sum += v * weight!;
      w += weight!;
    }
  }
  let fit = w ? sum / w : p.rating;
  const desired = pref.playStyles.split(/[,;]/).map(normalize).filter(Boolean);
  const matches = p.playStyles.filter((v) => desired.includes(normalize(v)));
  fit += Math.min(4, matches.length * 2);
  if (pref.favorites.split(/[,;]/).map(normalize).includes(normalize(p.name)))
    fit += 3;
  if (p.attributes.weakFoot !== undefined)
    fit += (p.attributes.weakFoot - 3) * 1.5;
  if (pref.skills === "Frequent" && p.attributes.skillMoves !== undefined)
    fit += (p.attributes.skillMoves - 3) * 2;
  const formSlots = FORMATIONS[pref.formation] || FORMATIONS["4-3-3"];
  const formFit = p.positions.some((pos) =>
    formSlots.some((slot) => slot.position === pos),
  );
  fit = clamp(fit + (formFit ? 3 : -5));
  const versatility = clamp(50 + (p.positions.length - 1) * 17);
  const ws = [
    pref.qualityWeight,
    pref.fitWeight,
    pref.scarcityWeight,
    pref.versatilityWeight,
  ];
  const total = ws.reduce((a, b) => a + b, 0) || 1;
  const value = clamp(
    (p.rating * ws[0] +
      fit * ws[1] +
      (scarcity * 0.4 + roleUrgency * 60) * ws[2] +
      versatility * ws[3]) /
      total,
  );
  return {
    value: Math.round(value),
    fit: Math.round(fit),
    scarcity: Math.round(scarcity),
    urgency: roleUrgency,
    versatility,
    alternatives,
    attributeCount: Object.keys(p.attributes).length,
    measured: w > 0,
    matches,
  };
}
export function recommendation(s: State, p: Player) {
  const m: Manager = "Pranav Kumsi",
    v = score(s, p),
    f = financial(s, m, p),
    next = nextBid(s, p),
    own = owned(s, m),
    roles = cats(p);
  const rivals = MANAGERS.slice(1).filter((r) => {
    const rem = remaining(s, r);
    return (
      rem !== null &&
      rem >= next &&
      roles.some((c) => requirements(s, r)[c] > 0)
    );
  });
  const alternatives = v.alternatives
    .sort(
      (a, b) =>
        score(s, b).value / floorPrice(s, b) -
        score(s, a).value / floorPrice(s, a),
    )
    .slice(0, 3);
  const relevantOwned = own.filter((q) =>
    cats(q).some((c) => roles.includes(c)),
  );
  const pureStriker = (q: Player) =>
    q.positions.some((pos) => ["ST", "CF"].includes(pos)) &&
    !q.positions.some((pos) => ["LW", "RW", "LM", "RM"].includes(pos));
  const strikerDepth =
    pureStriker(p) &&
    own.filter(pureStriker).length >= (s.profile.strikers === "Two" ? 3 : 2);
  const redundant =
    (v.urgency === 0 && relevantOwned.length >= 2) || strikerDepth;
  const strategic = money(
    floorPrice(s, p) *
      s.profile.priceMultiplier *
      (0.6 + v.value / 100) *
      (0.8 + v.urgency * 0.35 + v.scarcity / 500) *
      (redundant ? 0.6 : 1) *
      (rivals.length === 0 ? 0.85 : 1),
  );
  const opening = floorPrice(s, p),
    raw = Math.min(f.ceiling, strategic);
  const ceiling =
    raw < opening
      ? 0
      : money(
          opening +
            Math.floor(
              (cents(raw) - cents(opening)) / cents(s.rules.increment),
            ) *
              s.rules.increment,
        );
  const current =
    s.auction?.playerId === p.id ? s.auction.bids.at(-1) : undefined;
  const leading = current?.manager === m;
  let decision: "BID" | "WAIT" | "PASS" =
    !f.feasible || next > ceiling
      ? "PASS"
      : leading || redundant || rivals.length === 0
        ? "WAIT"
        : "BID";
  if (leading && current.amount <= ceiling) decision = "WAIT";
  const reason = !f.feasible
    ? f.reason
    : current && current.amount > ceiling
      ? "STOP — the current bid exceeds your maximum."
      : next > ceiling
        ? "STOP — the next legal bid exceeds your maximum."
        : leading
          ? "You are leading. Hold your bid until challenged."
          : redundant
            ? "This role is covered. Preserve money unless the price is exceptional."
            : rivals.length === 0
              ? "No funded rival has an unmet need in this role. Wait for the opening opportunity."
              : `A useful ${roles.join("/")} fit at this price; ${rivals.length} rival${rivals.length === 1 ? "" : "s"} may compete.`;
  return {
    ...v,
    decision,
    reason,
    next,
    ceiling,
    strategic,
    financial: f.ceiling,
    reserve: f.reserve,
    rivals,
    alternatives,
    redundant,
    after: money((remaining(s, m) || 0) - (leading ? current!.amount : next)),
    suggested: next <= ceiling && !leading ? next : null,
  };
}
export function positionFit(p: Player, pos: Position) {
  return p.positions.includes(pos)
    ? 1
    : cats(p).includes(category(pos))
      ? 0.8
      : 0.35;
}
export function bestLineup(
  s: State,
  players: Player[],
  formation = s.profile.formation,
) {
  const slots = FORMATIONS[formation] || FORMATIONS["4-3-3"];
  const dp = new Map<
    number,
    { value: number; picks: Record<string, string> }
  >();
  dp.set(0, { value: 0, picks: {} });
  for (const p of players) {
    const playerValue = score(s, p).fit + p.rating;
    const entries = [...dp.entries()];
    for (const [mask, val] of entries)
      for (let i = 0; i < slots.length; i++) {
        if (mask & (1 << i) || !p.positions.includes(slots[i].position))
          continue;
        const next = mask | (1 << i),
          v = val.value + playerValue;
        const old = dp.get(next);
        if (!old || v > old.value)
          dp.set(next, { value: v, picks: { ...val.picks, [i]: p.id } });
      }
  }
  return [...dp.entries()].sort(
    (a, b) =>
      Object.keys(b[1].picks).length - Object.keys(a[1].picks).length ||
      b[1].value - a[1].value,
  )[0][1].picks;
}
function log(s: State, message: string) {
  s.activity.push({ id: uid(), at: new Date().toISOString(), message });
  s.activity = s.activity.slice(-1000);
}
export function checkBid(
  s: State,
  p: Player,
  manager: Manager,
  amount: number,
  previous?: number,
) {
  insist(MANAGERS.includes(manager), "Choose a bidding manager.");
  const opening = floorPrice(s, p);
  insist(
    price(amount, opening),
    "Bid must meet the opening price, with at most 2 decimals.",
  );
  insist(
    (cents(amount) - cents(opening)) % cents(s.rules.increment) === 0,
    `Bid must follow the ${s.rules.increment} increment from opening ${opening}.`,
  );
  if (previous !== undefined)
    insist(
      cents(amount) >= cents(previous) + cents(s.rules.increment),
      "The bid must increase by at least one increment.",
    );
  const f = financial(s, manager, p);
  insist(f.feasible, f.reason);
  insist(
    amount <= f.ceiling,
    `Bid rejected: ${manager} can spend at most ${f.ceiling} while reserving ${f.reserve} to complete the squad.`,
  );
}
export type Action =
  | { type: "nominate"; playerId: string; nominator: Manager }
  | { type: "bid"; manager: Manager; amount: number; correct?: boolean }
  | { type: "sold" }
  | { type: "unsold" }
  | { type: "cancel" }
  | { type: "players"; players: Player[] }
  | { type: "editPlayer"; player: Player }
  | {
      type: "settings";
      rules: Rules;
      budgets: State["budgets"];
      profile: Profile;
    }
  | { type: "target"; id: string }
  | { type: "lineup"; key: string; slots: Record<string, string> }
  | { type: "correctSale"; id: string; manager: Manager; price: number }
  | { type: "voidSale"; id: string }
  | { type: "reset" };
export function apply(s: State, action: Action): State {
  const n = structuredClone(s);
  switch (action.type) {
    case "nominate": {
      insist(!n.auction, "Finish or cancel the active nomination first.");
      const p = n.players.find((p) => p.id === action.playerId);
      insist(p, "Player not found.");
      insist(MANAGERS.includes(action.nominator), "Choose a nominator.");
      insist(
        !isLiverpool(p),
        "Liverpool players belong to Pinky and cannot be auctioned.",
      );
      insist(
        !n.sales.some((t) => t.playerId === p.id),
        "This player is already sold.",
      );
      n.auction = { playerId: p.id, nominator: action.nominator, bids: [] };
      log(n, `${action.nominator} nominated ${p.name}`);
      break;
    }
    case "bid": {
      insist(n.auction, "Nominate a player first.");
      const p = n.players.find((p) => p.id === n.auction!.playerId)!;
      checkBid(
        n,
        p,
        action.manager,
        action.amount,
        action.correct ? undefined : n.auction.bids.at(-1)?.amount,
      );
      if (action.correct) n.auction.bids = [];
      n.auction.bids.push({
        id: uid(),
        manager: action.manager,
        amount: action.amount,
        at: new Date().toISOString(),
      });
      log(
        n,
        `${action.correct ? "Corrected bid: " : ""}${action.manager} bid ${action.amount} for ${p.name}`,
      );
      break;
    }
    case "sold": {
      insist(n.auction, "No active auction.");
      const bid = n.auction.bids.at(-1);
      insist(bid, "Record the winning bid before confirming the sale.");
      const p = n.players.find((p) => p.id === n.auction!.playerId)!;
      insist(
        !isLiverpool(p) && !n.sales.some((t) => t.playerId === p.id),
        "Player is unavailable.",
      );
      checkBid(n, p, bid.manager, bid.amount);
      n.sales.push({
        id: uid(),
        playerId: p.id,
        manager: bid.manager,
        price: bid.amount,
        basePrice: p.basePrice,
        at: new Date().toISOString(),
        order: Math.max(0, ...n.sales.map((t) => t.order)) + 1,
        bidHistory: n.auction.bids,
      });
      n.unsold = n.unsold.filter((id) => id !== p.id);
      n.auction = null;
      log(n, `SOLD: ${p.name} → ${bid.manager} for ${bid.amount}`);
      break;
    }
    case "unsold": {
      insist(n.auction, "No active auction.");
      if (!n.unsold.includes(n.auction.playerId))
        n.unsold.push(n.auction.playerId);
      log(
        n,
        `${n.players.find((p) => p.id === n.auction!.playerId)?.name} marked unsold`,
      );
      n.auction = null;
      break;
    }
    case "cancel":
      insist(n.auction, "No nomination to cancel.");
      n.auction = null;
      log(n, "Cancelled active nomination");
      break;
    case "players": {
      const names = new Set(n.players.map((p) => normalize(p.name)));
      const ids = new Set(n.players.map((p) => p.id));
      for (const p of action.players) {
        insist(
          !playerErrors(p).length,
          `${p.name || "Player"}: ${playerErrors(p).join(", ")}`,
        );
        insist(
          !names.has(normalize(p.name)),
          `Duplicate player: ${p.name}. Edit the existing record instead.`,
        );
        insist(!ids.has(p.id), "Duplicate record ID");
        names.add(normalize(p.name));
        ids.add(p.id);
        n.players.push(p);
      }
      log(n, `Imported ${action.players.length} verified records`);
      break;
    }
    case "editPlayer": {
      const p = action.player;
      insist(
        n.players.some((x) => x.id === p.id),
        "Player not found",
      );
      insist(
        !n.sales.some((t) => t.playerId === p.id) &&
          n.auction?.playerId !== p.id,
        "Void the sale or cancel the nomination before editing this player.",
      );
      insist(!playerErrors(p).length, playerErrors(p).join(", "));
      insist(
        !n.players.some(
          (x) => x.id !== p.id && normalize(x.name) === normalize(p.name),
        ),
        "Duplicate player name",
      );
      n.players = n.players.map((x) => (x.id === p.id ? p : x));
      log(n, `Edited ${p.name}`);
      break;
    }
    case "settings": {
      n.rules = action.rules;
      n.budgets = action.budgets;
      n.profile = action.profile;
      validateSettings(n);
      insist(
        !n.auction,
        "Finish or cancel the nomination before changing auction rules.",
      );
      for (const m of MANAGERS) {
        const rem = remaining(n, m),
          count = owned(n, m).length;
        insist(
          count <= n.rules.maxSquad,
          `${m} already exceeds the new squad maximum.`,
        );
        if (count) {
          insist(
            rem !== null &&
              rem >= Math.max(0, n.rules.minSquad - count) * n.rules.minPrice,
            `${m}'s new budget cannot fund the existing squad and remaining minimum purchases.`,
          );
          const plan = completion(n, m);
          insist(
            plan.feasible && plan.cost <= (rem || 0),
            `${m} cannot complete a squad under these rules/budgets with this pool.`,
          );
        }
      }
      log(n, "Updated budgets, rules and gameplay profile");
      break;
    }
    case "target":
      n.targets = n.targets.includes(action.id)
        ? n.targets.filter((x) => x !== action.id)
        : [...n.targets, action.id];
      break;
    case "lineup":
      n.lineups[action.key] = action.slots;
      log(n, "Updated starting XI");
      break;
    case "correctSale": {
      const old = n.sales.find((t) => t.id === action.id);
      insist(old, "Transaction not found");
      insist(
        !n.auction,
        "Finish the active nomination before correcting a sale.",
      );
      const p = n.players.find((p) => p.id === old.playerId)!;
      n.sales = n.sales.filter((t) => t.id !== old.id);
      checkBid(n, p, action.manager, action.price);
      n.sales.push({ ...old, manager: action.manager, price: action.price });
      n.sales.sort((a, b) => a.order - b.order);
      n.lineups = {};
      log(
        n,
        `Corrected sale: ${p.name}, ${old.manager} ${old.price} → ${action.manager} ${action.price}`,
      );
      break;
    }
    case "voidSale": {
      const old = n.sales.find((t) => t.id === action.id);
      insist(old, "Transaction not found");
      insist(!n.auction, "Finish the active nomination before voiding a sale.");
      n.sales = n.sales.filter((t) => t.id !== old.id);
      n.lineups = {};
      log(
        n,
        `Voided sale: ${n.players.find((p) => p.id === old.playerId)?.name}; refunded ${old.price} to ${old.manager}`,
      );
      break;
    }
    case "reset":
      n.sales = [];
      n.unsold = [];
      n.auction = null;
      n.lineups = {};
      n.activity = [];
      log(n, "Auction reset; player data, budgets and profile retained");
      break;
  }
  return n;
}
export function validateSettings(s: State) {
  const r = s.rules;
  const defaults = initialState().profile;
  for (const key of Object.keys(defaults) as (keyof Profile)[])
    if (typeof defaults[key] === "string")
      insist(
        typeof s.profile[key] === "string" &&
          String(s.profile[key]).length <= 4000,
        `Invalid gameplay field: ${key}`,
      );
  insist(
    typeof s.profile.confirmed === "boolean",
    "Invalid gameplay confirmation",
  );
  insist(
    Number.isInteger(r.minSquad) && r.minSquad >= 11 && r.minSquad <= 30,
    "Minimum squad must be 11–30.",
  );
  insist(
    Number.isInteger(r.maxSquad) &&
      r.maxSquad >= r.minSquad &&
      r.maxSquad <= 30,
    "Maximum squad must be between minimum and 30.",
  );
  insist(
    price(r.minPrice, 0.01) && price(r.increment, 0.01),
    "Minimum price and increment must be positive amounts with at most 2 decimals.",
  );
  insist(
    CATEGORIES.every(
      (c) => Number.isInteger(r.minimums[c]) && r.minimums[c] >= 0,
    ) && Object.values(r.minimums).reduce((a, b) => a + b, 0) <= r.minSquad,
    "Positional minimums must be nonnegative integers and sum to at most minimum squad size.",
  );
  insist(
    typeof r.currency === "string" && r.currency.length <= 12,
    "Use a short currency label",
  );
  for (const m of MANAGERS)
    insist(
      s.budgets[m] === null || price(s.budgets[m]),
      `Invalid budget for ${m}`,
    );
  for (const key of [
    "qualityWeight",
    "fitWeight",
    "scarcityWeight",
    "versatilityWeight",
  ] as const)
    insist(num(s.profile[key], 0, 100), "Scoring weights must be 0–100");
  insist(
    s.profile.qualityWeight +
      s.profile.fitWeight +
      s.profile.scarcityWeight +
      s.profile.versatilityWeight >
      0,
    "At least one scoring weight must be positive.",
  );
  insist(
    num(s.profile.priceMultiplier, 0.1, 10) && price(s.profile.reserveBuffer),
    "Invalid pricing multiplier or reserve buffer.",
  );
  insist(!!FORMATIONS[s.profile.formation], "Unsupported formation");
  for (const key of ["pace", "agility", "strength", "finishing"] as const)
    insist(num(s.profile[key], 0, 5), "Attribute weights must be 0–5.");
}
export function validateState(raw: unknown): State {
  insist(raw && typeof raw === "object", "Invalid backup");
  const s = raw as State;
  insist(s.schemaVersion === 1, "Unsupported backup version");
  insist(
    Array.isArray(s.players) && s.players.length <= 2000,
    "Invalid or oversized player list",
  );
  insist(
    Array.isArray(s.sales) &&
      Array.isArray(s.unsold) &&
      Array.isArray(s.targets) &&
      Array.isArray(s.activity),
    "Missing auction records",
  );
  insist(
    s.profile && s.rules && s.budgets && s.lineups,
    "Missing configuration",
  );
  validateSettings(s);
  const ids = new Set<string>(),
    names = new Set<string>();
  for (const p of s.players) {
    insist(
      typeof p.id === "string" && p.id.length > 0 && !ids.has(p.id),
      "Duplicate/missing player ID",
    );
    insist(!names.has(normalize(p.name)), "Duplicate player name");
    insist(!playerErrors(p).length, `Invalid player: ${p.name}`);
    insist(
      Array.isArray(p.playStyles) &&
        p.playStyles.every((x) => typeof x === "string") &&
        typeof p.notes === "string" &&
        p.attributes &&
        typeof p.attributes === "object",
      "Invalid player attributes",
    );
    ids.add(p.id);
    names.add(normalize(p.name));
  }
  const sold = new Set<string>();
  const saleIDs = new Set<string>();
  for (const t of s.sales) {
    insist(
      ids.has(t.playerId) &&
        !sold.has(t.playerId) &&
        !saleIDs.has(t.id) &&
        typeof t.id === "string",
      "Invalid or duplicate sale",
    );
    insist(
      MANAGERS.includes(t.manager) &&
        price(t.price, 0.01) &&
        price(t.basePrice) &&
        t.price >= t.basePrice &&
        Number.isInteger(t.order),
      "Invalid sale values",
    );
    insist(
      !isLiverpool(s.players.find((p) => p.id === t.playerId)!),
      "Liverpool cannot be sold",
    );
    insist(Array.isArray(t.bidHistory), "Missing bid history");
    sold.add(t.playerId);
    saleIDs.add(t.id);
  }
  for (const m of MANAGERS) {
    const count = owned(s, m).length,
      rem = remaining(s, m);
    insist(count <= s.rules.maxSquad, "Squad size exceeds maximum");
    insist(
      !count ||
        (rem !== null &&
          rem >= Math.max(0, s.rules.minSquad - count) * s.rules.minPrice),
      "Invalid budget or impossible minimum reserve",
    );
  }
  insist(
    s.unsold.every((id) => ids.has(id) && !sold.has(id)) &&
      s.targets.every((id) => ids.has(id)),
    "Invalid player references",
  );
  if (s.auction) {
    insist(
      ids.has(s.auction.playerId) &&
        !sold.has(s.auction.playerId) &&
        MANAGERS.includes(s.auction.nominator) &&
        !isLiverpool(s.players.find((p) => p.id === s.auction!.playerId)!),
      "Invalid nomination",
    );
    insist(Array.isArray(s.auction.bids), "Invalid bid history");
    let prev: number | undefined;
    const p = s.players.find((p) => p.id === s.auction!.playerId)!;
    for (const b of s.auction.bids) {
      checkBid(s, p, b.manager, b.amount, prev);
      prev = b.amount;
    }
  }
  for (const slots of Object.values(s.lineups)) {
    insist(slots && typeof slots === "object", "Invalid lineup");
    insist(
      Object.values(slots).every((id) => ids.has(id)),
      "Invalid lineup player",
    );
  }
  insist(
    s.activity.every(
      (e) => e && typeof e.message === "string" && typeof e.at === "string",
    ),
    "Invalid activity log",
  );
  return structuredClone(s);
}
export { initialState };
