export const MANAGERS = [
  "Pranav Kumsi",
  "Lord",
  "Rakshan",
  "LS",
  "Sharan",
] as const;
export type Manager = (typeof MANAGERS)[number];
export const CATEGORIES = ["GK", "CB", "FB", "MID", "FWD"] as const;
export type Category = (typeof CATEGORIES)[number];
export const POSITIONS = [
  "GK",
  "CB",
  "LB",
  "RB",
  "LWB",
  "RWB",
  "CDM",
  "CM",
  "CAM",
  "LM",
  "RM",
  "LW",
  "RW",
  "CF",
  "ST",
] as const;
export type Position = (typeof POSITIONS)[number];
export const ATTRIBUTES = [
  "pace",
  "shooting",
  "passing",
  "dribbling",
  "defending",
  "physical",
  "agility",
  "finishing",
  "stamina",
  "reflexes",
  "diving",
  "handling",
  "weakFoot",
  "skillMoves",
] as const;
export type Attribute = (typeof ATTRIBUTES)[number];
export type Player = {
  id: string;
  name: string;
  club: string;
  rating: number;
  positions: Position[];
  basePrice: number;
  attributes: Partial<Record<Attribute, number>>;
  playStyles: string[];
  notes: string;
};
export type Bid = { id: string; manager: Manager; amount: number; at: string };
export type Auction = { playerId: string; nominator: Manager; bids: Bid[] };
export type Sale = {
  id: string;
  playerId: string;
  manager: Manager;
  price: number;
  basePrice: number;
  at: string;
  order: number;
  bidHistory: Bid[];
};
export type Rules = {
  minSquad: number;
  maxSquad: number;
  minPrice: number;
  increment: number;
  minimums: Record<Category, number>;
  currency: string;
};
export type Profile = {
  confirmed: boolean;
  formation: string;
  approach: string;
  tempo: string;
  channel: string;
  skills: string;
  attacker: string;
  press: string;
  defending: string;
  strikers: string;
  subs: string;
  favorites: string;
  playStyles: string;
  pace: number;
  agility: number;
  strength: number;
  finishing: number;
  qualityWeight: number;
  fitWeight: number;
  scarcityWeight: number;
  versatilityWeight: number;
  priceMultiplier: number;
  reserveBuffer: number;
};
export type Activity = { id: string; at: string; message: string };
export type State = {
  schemaVersion: 1;
  players: Player[];
  budgets: Record<Manager, number | null>;
  rules: Rules;
  profile: Profile;
  sales: Sale[];
  unsold: string[];
  auction: Auction | null;
  targets: string[];
  lineups: Record<string, Record<string, string>>;
  activity: Activity[];
};
export type Envelope = {
  revision: number;
  state: State;
  past: State[];
  savedAt: string;
};
export const uid = () => crypto.randomUUID();
export const money = (n: number) =>
  Math.round((n + Number.EPSILON) * 100) / 100;
export const cents = (n: number) => Math.round(n * 100);
export const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
export const isLiverpool = (p: Player) =>
  ["liverpool", "liverpoolfc", "fcliverpool", "liverpoolfootballclub"].includes(
    normalize(p.club),
  );
export const category = (pos: Position): Category =>
  pos === "GK"
    ? "GK"
    : pos === "CB"
      ? "CB"
      : ["LB", "RB", "LWB", "RWB"].includes(pos)
        ? "FB"
        : ["CDM", "CM", "CAM", "LM", "RM"].includes(pos)
          ? "MID"
          : "FWD";
export const cats = (p: Player) => [...new Set(p.positions.map(category))];
export function initialState(): State {
  return {
    schemaVersion: 1,
    players: [],
    budgets: Object.fromEntries(
      MANAGERS.map((m) => [m, null]),
    ) as State["budgets"],
    rules: {
      minSquad: 18,
      maxSquad: 20,
      minPrice: 1,
      increment: 1,
      minimums: { GK: 2, CB: 3, FB: 3, MID: 5, FWD: 3 },
      currency: "cr",
    },
    profile: {
      confirmed: false,
      formation: "4-3-3",
      approach: "Direct passing",
      tempo: "Counterattack",
      channel: "Wings",
      skills: "Occasional",
      attacker: "Fast",
      press: "Balanced",
      defending: "Average",
      strikers: "One",
      subs: "Fresh pace after 65 minutes",
      favorites: "",
      playStyles: "",
      pace: 4,
      agility: 3,
      strength: 3,
      finishing: 4,
      qualityWeight: 35,
      fitWeight: 35,
      scarcityWeight: 20,
      versatilityWeight: 10,
      priceMultiplier: 1.5,
      reserveBuffer: 0,
    },
    sales: [],
    unsold: [],
    auction: null,
    targets: [],
    lineups: {},
    activity: [],
  };
}
export const FORMATIONS: Record<
  string,
  { position: Position; x: number; y: number }[]
> = {
  "4-3-3": [
    ["GK", 50, 89],
    ["LB", 14, 68],
    ["CB", 38, 72],
    ["CB", 62, 72],
    ["RB", 86, 68],
    ["CM", 25, 46],
    ["CDM", 50, 54],
    ["CM", 75, 46],
    ["LW", 18, 22],
    ["ST", 50, 15],
    ["RW", 82, 22],
  ],
  "4-2-3-1": [
    ["GK", 50, 89],
    ["LB", 14, 70],
    ["CB", 38, 74],
    ["CB", 62, 74],
    ["RB", 86, 70],
    ["CDM", 35, 54],
    ["CDM", 65, 54],
    ["LM", 18, 32],
    ["CAM", 50, 35],
    ["RM", 82, 32],
    ["ST", 50, 14],
  ],
  "4-4-2": [
    ["GK", 50, 89],
    ["LB", 14, 70],
    ["CB", 38, 74],
    ["CB", 62, 74],
    ["RB", 86, 70],
    ["LM", 14, 44],
    ["CM", 38, 49],
    ["CM", 62, 49],
    ["RM", 86, 44],
    ["ST", 35, 19],
    ["ST", 65, 19],
  ],
  "3-5-2": [
    ["GK", 50, 89],
    ["CB", 25, 72],
    ["CB", 50, 75],
    ["CB", 75, 72],
    ["LWB", 12, 45],
    ["CM", 32, 50],
    ["CDM", 50, 57],
    ["CM", 68, 50],
    ["RWB", 88, 45],
    ["ST", 35, 20],
    ["ST", 65, 20],
  ],
  "4-1-2-1-2": [
    ["GK", 50, 89],
    ["LB", 14, 69],
    ["CB", 38, 74],
    ["CB", 62, 74],
    ["RB", 86, 69],
    ["CDM", 50, 58],
    ["CM", 25, 43],
    ["CM", 75, 43],
    ["CAM", 50, 30],
    ["ST", 33, 13],
    ["ST", 67, 13],
  ],
} as unknown as Record<string, { position: Position; x: number; y: number }[]>;
for (const key of Object.keys(FORMATIONS))
  FORMATIONS[key] = (
    FORMATIONS[key] as unknown as [Position, number, number][]
  ).map(([position, x, y]) => ({ position, x, y }));
