import { useMemo, useState } from "react";
import {
  ArrowDownUp,
  ArrowUpRight,
  Check,
  GitCompareArrows,
  Pencil,
  Plus,
  Search,
  Star,
  Upload,
} from "lucide-react";
import {
  CATEGORIES,
  MANAGERS,
  cats,
  isLiverpool,
  type Player,
  type State,
} from "./model";
import {
  floorPrice,
  recommendation,
  score,
  status,
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
  StatusBadge,
  fmt,
} from "./components";
export default function Scout({
  s,
  act,
  onImport,
  onEdit,
  onNominate,
}: {
  s: State;
  act: (a: Action) => boolean;
  onImport: () => void;
  onEdit: (p?: Player) => void;
  onNominate: (p: Player) => void;
}) {
  const [query, setQuery] = useState(""),
    [position, setPosition] = useState("All positions"),
    [club, setClub] = useState("All clubs"),
    [availability, setAvailability] = useState("Available"),
    [minRating, setMinRating] = useState(""),
    [maxPrice, setMaxPrice] = useState(""),
    [board, setBoard] = useState("All players"),
    [sort, setSort] = useState<{ key: string; dir: number }>({
      key: "value",
      dir: -1,
    }),
    [compared, setCompared] = useState<string[]>([]),
    [showCompare, setShowCompare] = useState(false);
  const players = useMemo(
    () => s.players.map((p) => ({ p, v: score(s, p) })),
    [s],
  );
  let list = players.filter(
    ({ p }) =>
      `${p.name} ${p.club}`.toLowerCase().includes(query.toLowerCase()) &&
      (position === "All positions" || cats(p).includes(position as never)) &&
      (club === "All clubs" || p.club === club) &&
      (availability === "All statuses" ||
        (availability === "Available"
          ? ["Available", "Unsold", "Nominated"].includes(status(s, p))
          : status(s, p) === availability)) &&
      (!minRating || p.rating >= Number(minRating)) &&
      (!maxPrice || p.basePrice <= Number(maxPrice)) &&
      (board !== "My shortlist" || s.targets.includes(p.id)),
  );
  if (board === "Best strikers")
    list = list.filter(
      ({ p }) => p.positions.includes("ST") || p.positions.includes("CF"),
    );
  if (board === "Best wingers")
    list = list.filter(({ p }) =>
      p.positions.some((x) => ["LW", "RW", "LM", "RM"].includes(x)),
    );
  if (
    [
      "Best midfielders",
      "Best centre-backs",
      "Best full-backs",
      "Best goalkeepers",
    ].includes(board)
  ) {
    const c = (
      {
        "Best midfielders": "MID",
        "Best centre-backs": "CB",
        "Best full-backs": "FB",
        "Best goalkeepers": "GK",
      } as const
    )[board as "Best midfielders"];
    list = list.filter(({ p }) => cats(p).includes(c));
  }
  const metric = ({ p, v }: (typeof players)[number], key: string) =>
    key === "name"
      ? p.name
      : key === "club"
        ? p.club
        : key === "position"
          ? p.positions.join("/")
          : key === "rating"
            ? p.rating
            : key === "price"
              ? p.basePrice
              : key === "fit"
                ? v.fit
                : key === "efficiency"
                  ? v.value / floorPrice(s, p)
                  : key === "subs"
                    ? (p.attributes.pace ?? p.rating) * 0.45 +
                      (p.attributes.agility ?? p.rating) * 0.25 +
                      v.versatility * 0.3
                    : key === "avoid"
                      ? (floorPrice(s, p) / Math.max(1, v.value)) *
                        (v.urgency === 0 ? 1.5 : 1)
                      : v.value;
  list.sort((a, b) => {
    const av = metric(a, sort.key),
      bv = metric(b, sort.key);
    return (
      (typeof av === "string"
        ? av.localeCompare(String(bv))
        : av - Number(bv)) * sort.dir
    );
  });
  if (board === "Top 20 targets") list = list.slice(0, 20);
  const rankChange = (v: string) => {
    setBoard(v);
    setSort({
      key: ["Best value", "Undervalued"].includes(v)
        ? "efficiency"
        : v === "Super-subs"
          ? "subs"
          : v === "Overpriced / avoid"
            ? "avoid"
            : "value",
      dir: -1,
    });
  };
  const col = (label: string, key: string) => (
    <button
      onClick={() => setSort({ key, dir: sort.key === key ? -sort.dir : -1 })}
    >
      {label}
      <ArrowDownUp size={11} />
    </button>
  );
  const toggle = (id: string) =>
    setCompared(
      compared.includes(id)
        ? compared.filter((x) => x !== id)
        : compared.length < 4
          ? [...compared, id]
          : compared,
    );
  return (
    <div className="stack">
      <div className="page-title">
        <div>
          <span className="eyebrow">BUILD AN INFORMATION ADVANTAGE</span>
          <h1>Scouting & targets</h1>
          <p>Your entire player pool, ranked for the way you play.</p>
        </div>
        <div className="toolbar">
          <Button onClick={() => onEdit()}>
            <Plus size={16} />
            Add player
          </Button>
          <Button variant="primary" onClick={onImport}>
            <Upload size={16} />
            Import players
          </Button>
        </div>
      </div>
      <div className="scouting-stats">
        <div>
          <strong>{s.players.length}</strong>
          <span>uploaded players</span>
        </div>
        <div>
          <strong>
            {
              s.players.filter((p) =>
                ["Available", "Unsold", "Nominated"].includes(status(s, p)),
              ).length
            }
          </strong>
          <span>available to bid</span>
        </div>
        <div>
          <strong>{s.targets.length}</strong>
          <span>on your shortlist</span>
        </div>
        <div>
          <strong>{s.players.filter(isLiverpool).length}</strong>
          <span>reserved for Liverpool</span>
        </div>
      </div>
      <Panel>
        <div className="scout-tabs">
          {[
            "All players",
            "Top 20 targets",
            "My shortlist",
            "Best value",
            "Best strikers",
            "Best wingers",
            "Best midfielders",
            "Best centre-backs",
            "Best full-backs",
            "Best goalkeepers",
            "Super-subs",
            "Undervalued",
            "Overpriced / avoid",
          ].map((b) => (
            <button
              className={board === b ? "selected" : ""}
              key={b}
              onClick={() => rankChange(b)}
            >
              {b}
            </button>
          ))}
        </div>
        <div className="scout-filters">
          <div className="search-input">
            <Search size={17} />
            <input
              aria-label="Search players"
              placeholder="Search players or clubs…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            aria-label="Position filter"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
          >
            {["All positions", ...CATEGORIES].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            aria-label="Club filter"
            value={club}
            onChange={(e) => setClub(e.target.value)}
          >
            {[
              "All clubs",
              ...[...new Set(s.players.map((p) => p.club))].sort(),
            ].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            aria-label="Status filter"
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
          >
            {[
              "Available",
              "All statuses",
              "Nominated",
              "Unsold",
              "Sold",
              "Liverpool",
            ].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
          <input
            aria-label="Minimum rating"
            type="number"
            placeholder="Min OVR"
            min="1"
            max="99"
            value={minRating}
            onChange={(e) => setMinRating(e.target.value)}
          />
          <input
            aria-label="Maximum base price"
            type="number"
            placeholder="Max base"
            min="0"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
        </div>
        <div className="table-meta">
          <span>
            {list.length} records ·{" "}
            {s.profile.confirmed
              ? "Personalized"
              : "Provisional · complete your gameplay profile"}
          </span>
          {compared.length > 0 && (
            <Button
              onClick={() => setShowCompare(true)}
              disabled={compared.length < 2}
            >
              <GitCompareArrows size={14} />
              Compare {compared.length}/4
            </Button>
          )}
        </div>
        {list.length ? (
          <div className="table-scroll">
            <table className="scout-table">
              <thead>
                <tr>
                  <th>Compare</th>
                  <th>{col("Player", "name")}</th>
                  <th>{col("Position", "position")}</th>
                  <th>{col("OVR", "rating")}</th>
                  <th>{col("Base", "price")}</th>
                  <th>{col("Value", "value")}</th>
                  <th>{col("Fit", "fit")}</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map(({ p, v }) => (
                  <tr key={p.id}>
                    <td>
                      <input
                        aria-label={`Compare ${p.name}`}
                        type="checkbox"
                        checked={compared.includes(p.id)}
                        disabled={
                          !compared.includes(p.id) && compared.length >= 4
                        }
                        onChange={() => toggle(p.id)}
                      />
                    </td>
                    <td>
                      <PlayerName p={p} />
                      {!v.measured && (
                        <small className="evidence">Limited attributes</small>
                      )}
                    </td>
                    <td>{p.positions.join(" / ")}</td>
                    <td>{p.rating}</td>
                    <td>{fmt(p.basePrice)}</td>
                    <td>
                      <Badge tone={v.value >= 75 ? "lime" : "muted"}>
                        {v.value}
                      </Badge>
                    </td>
                    <td>{v.fit}</td>
                    <td>
                      <StatusBadge s={s} p={p} />
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          className={`icon-button ${s.targets.includes(p.id) ? "text-lime" : ""}`}
                          aria-label={`Shortlist ${p.name}`}
                          onClick={() => act({ type: "target", id: p.id })}
                        >
                          <Star
                            size={16}
                            fill={
                              s.targets.includes(p.id) ? "currentColor" : "none"
                            }
                          />
                        </button>
                        <button
                          className="icon-button"
                          aria-label={`Edit ${p.name}`}
                          onClick={() => onEdit(p)}
                          disabled={["Sold", "Nominated"].includes(
                            status(s, p),
                          )}
                        >
                          <Pencil size={15} />
                        </button>
                        <Button
                          variant="ghost"
                          onClick={() => onNominate(p)}
                          disabled={
                            !!s.auction ||
                            ["Sold", "Liverpool"].includes(status(s, p))
                          }
                        >
                          Nominate
                          <ArrowUpRight size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title={
              s.players.length
                ? "No players match these filters"
                : "Your scouting starts with your data"
            }
            detail={
              s.players.length
                ? "Change the filters or choose All statuses to see sold and Liverpool records."
                : "Import your FC 27 list or add players manually. Ratings, prices and availability are never invented."
            }
            action={
              !s.players.length && (
                <Button variant="primary" onClick={onImport}>
                  Import player list
                </Button>
              )
            }
          />
        )}
        <p className="fineprint">
          Value is the stated weighted model, not a prediction of match
          performance. Best value/undervalued use score ÷ opening price;
          super-subs weight supplied pace, agility and versatility (rating
          fallback); avoid ranks high cost per score and redundant roles. No
          market value or FC 27 mechanic is assumed.
        </p>
      </Panel>
      {showCompare && (
        <Modal
          title="Player comparison"
          onClose={() => setShowCompare(false)}
          wide
        >
          <div
            className="compare-grid"
            style={{
              gridTemplateColumns: `repeat(${compared.length},minmax(190px,1fr))`,
            }}
          >
            {compared.map((id) => {
              const p = s.players.find((p) => p.id === id)!;
              const r = recommendation(s, p);
              return (
                <div className="compare-card" key={id}>
                  <PlayerName p={p} />
                  <dl>
                    <dt>Base price</dt>
                    <dd>{fmt(p.basePrice)}</dd>
                    <dt>Value score</dt>
                    <dd>{r.value}/100</dd>
                    <dt>Tactical fit</dt>
                    <dd>{r.fit}/100</dd>
                    <dt>Strategic ceiling</dt>
                    <dd>{fmt(r.strategic)}</dd>
                    <dt>Attributes supplied</dt>
                    <dd>{Object.keys(p.attributes).length}</dd>
                    {Object.entries(p.attributes).map(([k, v]) => (
                      <div className="contents" key={k}>
                        <dt>{k}</dt>
                        <dd>{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="muted">
                    {p.playStyles.join(" · ") || "No PlayStyles supplied"}
                  </p>
                  <p>{p.notes}</p>
                  <Button
                    onClick={() => {
                      toggle(id);
                      if (compared.length <= 2) setShowCompare(false);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              );
            })}
          </div>
        </Modal>
      )}
    </div>
  );
}
