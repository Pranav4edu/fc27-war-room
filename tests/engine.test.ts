import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import {
  MANAGERS,
  CATEGORIES,
  POSITIONS,
  cats,
  cents,
  initialState,
  isLiverpool,
  type Player,
  type State,
  type Position,
} from "../src/model";
import {
  apply,
  available,
  bestLineup,
  checkBid,
  completion,
  financial,
  floorPrice,
  owned,
  recommendation,
  remaining,
  score,
  spent,
  validateState,
} from "../src/engine";
import {
  autoMapping,
  mappedPlayers,
  parseCSV,
  parseFile,
  tableFromMatrix,
} from "../src/importer";
const player = (
  id: string,
  positions: Position[] = ["ST"],
  basePrice = 1,
): Player => ({
  id,
  name: `TEST ONLY ${id}`,
  club: "QA Fictional Club",
  rating: 80,
  positions,
  basePrice,
  attributes: { pace: 80, passing: 80 },
  playStyles: [],
  notes: "Synthetic test fixture; not FC data",
});
const setup = (): State => {
  const s = initialState();
  s.budgets = Object.fromEntries(
    MANAGERS.map((m, i) => [m, 500 + i * 100]),
  ) as State["budgets"];
  s.players = Array.from({ length: 150 }, (_, i) =>
    player(String(i), [POSITIONS[i % POSITIONS.length]], 1 + (i % 3)),
  );
  return s;
};
const buy = (
  s: State,
  p: Player,
  m: (typeof MANAGERS)[number] = "Pranav Kumsi",
  amount = p.basePrice,
) =>
  apply(
    apply(apply(s, { type: "nominate", playerId: p.id, nominator: m }), {
      type: "bid",
      manager: m,
      amount,
    }),
    { type: "sold" },
  );
describe("data ingestion and truthful defaults", () => {
  it("starts with no invented players, budgets or sales", () => {
    const s = initialState();
    expect(s.players).toEqual([]);
    expect(s.sales).toEqual([]);
    expect(Object.values(s.budgets)).toEqual([null, null, null, null, null]);
    expect(s.profile.confirmed).toBe(false);
  });
  it("parses quoted CSV, aliases, multiple positions and zero base price", () => {
    const x = parseCSV(
      'Player,Club,OVR,Position,Price,Alternate Positions,PAC\n"TEST, Name",QA,85,ST,0,LW,91',
    );
    const p = mappedPlayers(x.rows, autoMapping(x.headers), [])[0];
    expect(p.errors).toEqual([]);
    expect(p.player.name).toBe("TEST, Name");
    expect(p.player.positions).toEqual(["ST", "LW"]);
    expect(p.player.basePrice).toBe(0);
    expect(p.player.attributes.pace).toBe(91);
  });
  it("flags missing rating, invalid position, blank price and normalized duplicates", () => {
    const x = parseCSV(
      "name,club,rating,positions,basePrice\nTest One,QA,,INVALID,\nTést-One,QA,80,ST,2",
    );
    const p = mappedPlayers(x.rows, autoMapping(x.headers), []);
    expect(p[0].errors.length).toBe(3);
    expect(p[1].errors.join()).toMatch(/Duplicate/);
  });
  it("reads real xlsx buffers and detects the header row after a title", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Players");
    ws.addRow(["TEST ONLY WORKBOOK"]);
    ws.addRow(["Name", "Club", "Rating", "Position", "Price"]);
    ws.addRow(["TEST ONLY Excel", "QA Club", 82, "CM", 12]);
    const buffer = await wb.xlsx.writeBuffer();
    const f = new File([buffer as ArrayBuffer], "test.xlsx");
    const sheets = await parseFile(f);
    expect(sheets[0].headerIndex).toBe(1);
    expect(
      mappedPlayers(sheets[0].rows, autoMapping(sheets[0].headers), [])[0]
        .errors,
    ).toEqual([]);
  });
  it("keeps blank/repeated Excel columns distinct rather than rejecting the sheet", () => {
    const parsed = tableFromMatrix(
      [
        ["Name", "", "Rating", "Rating"],
        ["TEST ONLY", "x", "82", "83"],
      ],
      0,
    );
    expect(parsed.headers).toEqual([
      "Name",
      "Column 2",
      "Rating",
      "Rating (2)",
    ]);
    expect(parsed.rows[0]["Rating (2)"]).toBe("83");
  });
  it("recognizes Liverpool aliases and excludes them from availability", () => {
    const s = setup();
    for (const club of [
      "Liverpool",
      "Liverpool FC",
      "FC Liverpool",
      "Liverpool Football Club",
    ]) {
      const p = { ...player("liverpool"), club };
      expect(isLiverpool(p)).toBe(true);
      s.players.push({ ...p, id: club, name: club });
    }
    expect(available(s).length).toBe(150);
    expect(() =>
      apply(s, { type: "nominate", playerId: "Liverpool", nominator: "Lord" }),
    ).toThrow(/Liverpool/);
  });
  it("rejects duplicate imports and invalid records atomically", () => {
    const s = setup();
    expect(() => apply(s, { type: "players", players: [player("0")] })).toThrow(
      /Duplicate/,
    );
    expect(() =>
      apply(s, {
        type: "players",
        players: [{ ...player("new"), rating: 100 }],
      }),
    ).toThrow(/Rating/);
    expect(s.players.length).toBe(150);
  });
});
describe("auction lifecycle and safeguards", () => {
  it("keeps independent budgets and provisional bids separate from sales", () => {
    let s = setup();
    const p = s.players[0];
    s = apply(s, { type: "nominate", playerId: p.id, nominator: "Lord" });
    s = apply(s, { type: "bid", manager: "Rakshan", amount: 10 });
    expect(remaining(s, "Rakshan")).toBe(700);
    expect(owned(s, "Rakshan")).toHaveLength(0);
    expect(s.sales).toHaveLength(0);
    s = apply(s, { type: "sold" });
    expect(remaining(s, "Rakshan")).toBe(690);
    expect(owned(s, "Rakshan")).toHaveLength(1);
    expect(s.sales[0].basePrice).toBe(1);
    expect(s.sales[0].price).toBe(10);
    expect(s.auction).toBeNull();
    expect(available(s).some((q) => q.id === p.id)).toBe(false);
    expect(() =>
      apply(s, { type: "nominate", playerId: p.id, nominator: "Lord" }),
    ).toThrow(/already sold/);
  });
  it("does not assume nominated players are sold and supports unsold/re-nomination", () => {
    let s = setup();
    s = apply(s, {
      type: "nominate",
      playerId: s.players[2].id,
      nominator: "Lord",
    });
    expect(() => apply(s, { type: "sold" })).toThrow(/winning bid/);
    s = apply(s, { type: "unsold" });
    expect(s.unsold).toEqual(["2"]);
    expect(available(s).length).toBe(150);
    s = buy(s, s.players[2]);
    expect(s.unsold).toHaveLength(0);
  });
  it("enforces increment grid, ascending bids and missing budgets", () => {
    const s = setup();
    s.rules.increment = 0.25;
    const p = s.players[0];
    expect(() => checkBid(s, p, "Lord", 1.1)).toThrow(/increment/);
    expect(() => checkBid(s, p, "Lord", 1, 1)).toThrow(/increase/);
    expect(() => checkBid(s, p, "Lord", 1.25, 1)).not.toThrow();
    s.budgets.Lord = null;
    expect(() => checkBid(s, p, "Lord", 2)).toThrow(/budget/);
  });
  it("rejects a bid that consumes the positional completion reserve", () => {
    const s = setup(),
      p = s.players[0],
      f = financial(s, "Pranav Kumsi", p);
    expect(f.reserve).toBeGreaterThan(0);
    expect(() => checkBid(s, p, "Pranav Kumsi", f.ceiling + 1)).toThrow(
      /at most/,
    );
    expect(() => checkBid(s, p, "Pranav Kumsi", f.ceiling)).not.toThrow();
  });
  it("blocks impossible positional coverage even when cash is abundant", () => {
    const s = setup();
    s.players = s.players.filter((p) => !p.positions.includes("GK"));
    expect(completion(s, "Pranav Kumsi").feasible).toBe(false);
    expect(() => checkBid(s, s.players[0], "Lord", 3)).toThrow(
      /cannot complete/,
    );
  });
  it("does not count a versatile player twice", () => {
    const s = setup();
    s.rules.minimums = { GK: 1, CB: 1, FB: 0, MID: 0, FWD: 0 };
    s.rules.minSquad = 11;
    s.players = [
      player("one", ["GK", "CB"]),
      ...Array.from({ length: 10 }, (_, i) => player("F" + i, ["ST"])),
    ];
    expect(completion(s, "Lord").feasible).toBe(false);
    s.players.push(player("two", ["CB"]));
    expect(completion(s, "Lord").feasible).toBe(true);
  });
  it("finds a globally feasible completion when greedy position matching would fail", () => {
    const s = setup();
    s.rules.minimums = { GK: 1, CB: 1, FB: 0, MID: 0, FWD: 0 };
    s.rules.minSquad = 11;
    s.players = [
      player("versatile", ["GK", "CB"], 1),
      player("keeper", ["GK"], 2),
      ...Array.from({ length: 9 }, (_, i) => player("F" + i, ["ST"])),
    ];
    const c = completion(s, "Lord");
    expect(c.feasible).toBe(true);
    expect(c.cost).toBe(12);
  });
  it("corrects bid and sale, updates both purses, and can void with refund", () => {
    let s = setup();
    s = apply(s, {
      type: "nominate",
      playerId: s.players[0].id,
      nominator: "Lord",
    });
    s = apply(s, { type: "bid", manager: "Lord", amount: 20 });
    s = apply(s, {
      type: "bid",
      manager: "Pranav Kumsi",
      amount: 10,
      correct: true,
    });
    expect(s.auction!.bids).toHaveLength(1);
    s = apply(s, { type: "sold" });
    expect(remaining(s, "Pranav Kumsi")).toBe(490);
    s = apply(s, {
      type: "correctSale",
      id: s.sales[0].id,
      manager: "LS",
      price: 15,
    });
    expect(remaining(s, "Pranav Kumsi")).toBe(500);
    expect(remaining(s, "LS")).toBe(785);
    s = apply(s, { type: "voidSale", id: s.sales[0].id });
    expect(remaining(s, "LS")).toBe(800);
    expect(s.sales).toHaveLength(0);
  });
  it("enforces maximum squad size", () => {
    let s = setup();
    s.rules.minSquad = 11;
    s.rules.maxSquad = 11;
    s.rules.minimums = { GK: 1, CB: 1, FB: 1, MID: 1, FWD: 1 };
    for (const i of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 14])
      s = buy(s, s.players[i]);
    expect(owned(s, "Pranav Kumsi")).toHaveLength(11);
    expect(() => checkBid(s, s.players[11], "Pranav Kumsi", 3)).toThrow(
      /Maximum/,
    );
  });
  it("validates settings without modifying current state and disallows change mid-auction", () => {
    const s = setup();
    expect(() =>
      apply(s, {
        type: "settings",
        budgets: s.budgets,
        rules: { ...s.rules, increment: 0 },
        profile: s.profile,
      }),
    ).toThrow(/increment/);
    const n = apply(s, { type: "nominate", playerId: "0", nominator: "Lord" });
    expect(() =>
      apply(n, {
        type: "settings",
        budgets: n.budgets,
        rules: n.rules,
        profile: n.profile,
      }),
    ).toThrow(/nomination/);
  });
  it("reset keeps authoritative imports, budgets and preferences and an undo snapshot can restore it", () => {
    const before = buy(setup(), setup().players[0]);
    const reset = apply(before, { type: "reset" });
    expect(reset.players).toEqual(before.players);
    expect(reset.sales).toEqual([]);
    expect(validateState(before).sales).toHaveLength(1);
  });
});
describe("adaptive recommendations and lineup selection", () => {
  it("caps every recommendation by both ceilings and rounds to a legal price", () => {
    const s = setup();
    s.rules.increment = 0.25;
    for (const p of s.players.slice(0, 25)) {
      const r = recommendation(s, p);
      expect(r.ceiling).toBeLessThanOrEqual(r.financial);
      expect(r.ceiling).toBeLessThanOrEqual(r.strategic);
      if (r.ceiling > 0)
        expect((cents(r.ceiling) - cents(floorPrice(s, p))) % 25).toBe(0);
    }
  });
  it("updates to WAIT while leading and PASS past the strategic ceiling", () => {
    let s = setup();
    const p = s.players[0];
    s = apply(s, { type: "nominate", playerId: p.id, nominator: "Lord" });
    s = apply(s, { type: "bid", manager: "Pranav Kumsi", amount: 1 });
    expect(recommendation(s, p).decision).toBe("WAIT");
    s = apply(s, { type: "bid", manager: "Lord", amount: 20 });
    expect(recommendation(s, p).decision).toBe("PASS");
    expect(recommendation(s, p).suggested).toBeNull();
  });
  it("deprioritizes a third pure striker after two are owned", () => {
    let s = setup();
    const strikers = s.players.filter((p) => p.positions.includes("ST"));
    s = buy(s, strikers[0]);
    s = buy(s, strikers[1]);
    const r = recommendation(s, strikers[2]);
    expect(r.redundant).toBe(true);
    expect(r.decision).not.toBe("BID");
  });
  it("uses supplied style attributes and favorites, with honest rating fallback", () => {
    const s = setup(),
      p = player("fast", ["ST"]);
    p.attributes = { pace: 99, shooting: 50 };
    s.profile.pace = 5;
    s.profile.finishing = 0;
    const fast = score(s, p).fit;
    s.profile.pace = 0;
    s.profile.finishing = 5;
    expect(score(s, p).fit).toBeLessThan(fast);
    p.attributes = {};
    expect(score(s, p).measured).toBe(false);
    const before = score(s, p).fit;
    s.profile.favorites = p.name;
    expect(score(s, p).fit).toBe(before + 3);
  });
  it("does not reuse a player in the optimized XI and identifies missing positions", () => {
    const s = setup();
    const players = s.players.slice(0, 15);
    const xi = bestLineup(s, players, "4-3-3");
    expect(new Set(Object.values(xi)).size).toBe(Object.values(xi).length);
    expect(Object.keys(xi).length).toBeLessThan(11);
    expect(
      Object.values(xi).every((id) => players.some((p) => p.id === id)),
    ).toBe(true);
  });
});
describe("backup integrity", () => {
  it("round-trips the complete saved state including live bids and sales", () => {
    let s = buy(setup(), setup().players[0]);
    s = apply(s, { type: "nominate", playerId: "1", nominator: "LS" });
    s = apply(s, { type: "bid", manager: "Lord", amount: 10 });
    expect(validateState(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
  it("rejects duplicate ownership, negative budgets, Liverpool sales and illegal live bids", () => {
    const s = buy(setup(), setup().players[0]);
    const dup = structuredClone(s);
    dup.sales.push({ ...dup.sales[0], id: "other" });
    expect(() => validateState(dup)).toThrow(/duplicate/);
    const neg = structuredClone(s);
    neg.budgets.Lord = -1;
    expect(() => validateState(neg)).toThrow(/budget/);
    const liv = structuredClone(s);
    liv.players[0].club = "Liverpool";
    expect(() => validateState(liv)).toThrow(/Liverpool/);
    let live = apply(setup(), {
      type: "nominate",
      playerId: "0",
      nominator: "Lord",
    });
    live.auction!.bids = [
      { id: "bad", manager: "Lord", amount: 999999, at: "" },
    ];
    expect(() => validateState(live)).toThrow(/at most/);
  });
  it("supports historical sales after raising the future minimum purchase price", () => {
    let s = buy(setup(), setup().players[0]);
    s = apply(s, {
      type: "settings",
      budgets: s.budgets,
      rules: { ...s.rules, minPrice: 2 },
      profile: s.profile,
    });
    expect(() => validateState(s)).not.toThrow();
  });
});
