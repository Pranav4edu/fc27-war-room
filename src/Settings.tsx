import { useState } from "react";
import { Check, Download, SlidersHorizontal } from "lucide-react";
import {
  MANAGERS,
  CATEGORIES,
  FORMATIONS,
  normalize,
  type State,
  type Profile,
} from "./model";
import { completion, remaining, type Action } from "./engine";
import { parseCSV, download } from "./importer";
import { Panel, Button, Field, Badge, fmt } from "./components";
export default function Settings({
  s,
  act,
}: {
  s: State;
  act: (a: Action) => boolean;
}) {
  const [d, setD] = useState(() => structuredClone(s)),
    [saved, setSaved] = useState(false),
    [error, setError] = useState("");
  const setP = (key: keyof Profile, value: Profile[keyof Profile]) => {
    setSaved(false);
    setD({ ...d, profile: { ...d.profile, [key]: value } });
  };
  const select = (key: keyof Profile, label: string, options: string[]) => (
    <Field label={label}>
      <select
        value={String(d.profile[key])}
        onChange={(e) => setP(key, e.target.value)}
      >
        {options.map((v) => (
          <option key={v}>{v}</option>
        ))}
      </select>
    </Field>
  );
  return (
    <div className="stack">
      <div className="page-title">
        <div>
          <span className="eyebrow">MAKE THE ROOM YOURS</span>
          <h1>Rules & gameplay</h1>
          <p>
            Five individual budgets. One strategy built around how you play.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            if (
              act({
                type: "settings",
                rules: d.rules,
                budgets: d.budgets,
                profile: d.profile,
              })
            ) {
              setSaved(true);
              setError("");
            }
          }}
        >
          <Check size={16} />
          {saved ? "Settings saved" : "Save all settings"}
        </Button>
      </div>
      {s.auction && (
        <div className="notice amber">
          Finish or cancel the active nomination before saving configuration
          changes.
        </div>
      )}
      {error && (
        <div role="alert" className="notice amber">
          {error}
        </div>
      )}
      <Panel
        title="The five purses"
        eyebrow="01 / AUCTION SETUP"
        action={<Badge>Never assumed equal</Badge>}
      >
        <div className="budget-inputs">
          {MANAGERS.map((m) => (
            <Field key={m} label={m}>
              <input
                aria-label={`${m} initial budget`}
                type="number"
                min="0"
                step=".01"
                placeholder="Not set"
                value={d.budgets[m] ?? ""}
                onChange={(e) => {
                  setSaved(false);
                  setD({
                    ...d,
                    budgets: {
                      ...d.budgets,
                      [m]:
                        e.target.value === "" ? null : Number(e.target.value),
                    },
                  });
                }}
              />
            </Field>
          ))}
        </div>
        <div className="toolbar">
          <label className="button">
            Import budget CSV
            <input
              type="file"
              accept=".csv"
              className="file-hidden"
              onChange={async (e) => {
                try {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const parsed = parseCSV(await f.text());
                  const next = { ...d.budgets };
                  for (const row of parsed.rows) {
                    const manager = MANAGERS.find(
                      (m) =>
                        normalize(m) ===
                        normalize(row.manager || row.Manager || ""),
                    );
                    const raw = row.budget ?? row.Budget;
                    const budget = Number(raw);
                    if (
                      !manager ||
                      !raw?.trim() ||
                      !Number.isFinite(budget) ||
                      budget < 0
                    )
                      throw new Error(
                        "Use columns manager,budget with exact manager names and nonnegative budgets.",
                      );
                    next[manager] = budget;
                  }
                  setD({ ...d, budgets: next });
                  setSaved(false);
                  setError(
                    "Budgets loaded into this draft. Review, then save all settings.",
                  );
                } catch (err) {
                  setError(String(err));
                }
              }}
            />
          </label>
          <Button
            onClick={() =>
              download(
                "fc27-budgets.csv",
                "manager,budget\n" + MANAGERS.map((m) => `${m},`).join("\n"),
                "text/csv",
              )
            }
          >
            <Download size={15} />
            Budget template
          </Button>
        </div>
        <p className="fineprint">
          Pinky receives Liverpool and has no auction purse. Prices use your
          chosen units; no real-world currency conversion is applied.
        </p>
      </Panel>
      <Panel title="Auction rules" eyebrow="02 / EDITABLE DEFAULTS">
        <div className="form-grid four">
          {(["minSquad", "maxSquad", "minPrice", "increment"] as const).map(
            (key, i) => (
              <Field
                key={key}
                label={
                  [
                    "Minimum squad size",
                    "Maximum squad size",
                    "Minimum purchase price",
                    "Minimum bid increment",
                  ][i]
                }
              >
                <input
                  type="number"
                  min={i < 2 ? 11 : 0.01}
                  step={i < 2 ? 1 : 0.01}
                  value={d.rules[key]}
                  onChange={(e) => {
                    setSaved(false);
                    setD({
                      ...d,
                      rules: { ...d.rules, [key]: Number(e.target.value) },
                    });
                  }}
                />
              </Field>
            ),
          )}
        </div>
        <div className="form-grid six">
          {CATEGORIES.map((c) => (
            <Field key={c} label={`${c} minimum`}>
              <input
                type="number"
                min="0"
                step="1"
                value={d.rules.minimums[c]}
                onChange={(e) =>
                  setD({
                    ...d,
                    rules: {
                      ...d.rules,
                      minimums: {
                        ...d.rules.minimums,
                        [c]: Number(e.target.value),
                      },
                    },
                  })
                }
              />
            </Field>
          ))}
          <Field label="Price unit">
            <input
              maxLength={12}
              value={d.rules.currency}
              onChange={(e) =>
                setD({ ...d, rules: { ...d.rules, currency: e.target.value } })
              }
            />
          </Field>
        </div>
        <p className="fineprint">
          Opening price = max(base price, minimum purchase price). Every bid
          must be opening price + a whole number of increments. Positions: GK;
          CB; FB = LB/RB/LWB/RWB; MID = CDM/CM/CAM/LM/RM; FWD = LW/RW/CF/ST.
          Each player fills one minimum slot.
        </p>
        <div className="toolbar">
          <Button
            onClick={() =>
              download("fc27-rules.json", JSON.stringify(d.rules, null, 2))
            }
          >
            Export rules
          </Button>
          <label className="button">
            Import rules JSON
            <input
              className="file-hidden"
              type="file"
              accept=".json"
              onChange={async (e) => {
                try {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const r = JSON.parse(await f.text());
                  if (!r.minimums)
                    throw new Error("Expected an exported rules file");
                  setD({ ...d, rules: { ...d.rules, ...r } });
                  setError("Rules loaded into the draft. Review and save.");
                } catch (err) {
                  setError(String(err));
                }
              }}
            />
          </label>
        </div>
      </Panel>
      <Panel
        title="My gameplay profile"
        eyebrow="03 / PERSONALIZE THE SCOUTING"
        action={
          <Badge tone={s.profile.confirmed ? "lime" : "amber"}>
            {s.profile.confirmed ? "Personalized" : "Awaiting your answers"}
          </Badge>
        }
      >
        <p className="muted">
          How do you actually play on PS5? Rankings stay provisional until you
          confirm your answers.
        </p>
        <div className="form-grid three">
          {select("formation", "Favorite formation", Object.keys(FORMATIONS))}
          {select("approach", "Preferred attacking approach", [
            "Direct passing",
            "Through balls",
            "Skill moves",
            "Crossing",
          ])}
          {select("tempo", "Counterattack or possession?", [
            "Balanced",
            "Counterattack",
            "Possession",
          ])}
          {select("channel", "Where do you attack?", [
            "Balanced",
            "Wings",
            "Central",
          ])}
          {select("skills", "How often do you use skill moves?", [
            "Occasional",
            "Frequent",
            "Rarely",
          ])}
          {select("attacker", "Preferred attackers", [
            "Balanced",
            "Fast",
            "Physical",
          ])}
          {select("press", "Defensive approach", [
            "Balanced",
            "High press",
            "Hold shape",
          ])}
          {select("defending", "Manual defending ability", [
            "Average",
            "Confident",
            "Needs support",
          ])}
          {select("strikers", "One or two strikers?", ["One", "Two"])}
        </div>
        <div className="form-grid four">
          {(["pace", "agility", "strength", "finishing"] as const).map((k) => (
            <Field key={k} label={`${k} importance · ${d.profile[k]}/5`}>
              <input
                type="range"
                min="0"
                max="5"
                value={d.profile[k]}
                onChange={(e) => setP(k, Number(e.target.value))}
              />
            </Field>
          ))}
        </div>
        <div className="form-grid three">
          <Field
            label="Players you perform well with"
            hint="Matched supplied names receive a modest +3 fit bonus; no attributes are inferred."
          >
            <input
              placeholder="Enter names from your uploaded list"
              value={d.profile.favorites}
              onChange={(e) => setP("favorites", e.target.value)}
            />
          </Field>
          <Field
            label="PlayStyles you value"
            hint="Matched against supplied PlayStyles; comma separated."
          >
            <input
              placeholder="Only score attributes you have supplied"
              value={d.profile.playStyles}
              onChange={(e) => setP("playStyles", e.target.value)}
            />
          </Field>
          <Field label="Substitute and tactical preferences">
            <input
              value={d.profile.subs}
              onChange={(e) => setP("subs", e.target.value)}
            />
          </Field>
        </div>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={d.profile.confirmed}
            onChange={(e) => setP("confirmed", e.target.checked)}
          />
          These answers describe my gameplay. Use them for personalized
          rankings.
        </label>
      </Panel>
      <Panel
        title="Transparent scoring controls"
        eyebrow="04 / STRATEGY ENGINE"
        action={<SlidersHorizontal size={18} />}
      >
        <div className="form-grid four">
          {(
            [
              "qualityWeight",
              "fitWeight",
              "scarcityWeight",
              "versatilityWeight",
            ] as const
          ).map((k) => (
            <Field key={k} label={k.replace("Weight", " weight")}>
              <input
                type="number"
                min="0"
                max="100"
                value={d.profile[k]}
                onChange={(e) => setP(k, Number(e.target.value))}
              />
            </Field>
          ))}
        </div>
        <div className="form-grid">
          <Field
            label="Base-price multiplier"
            hint="Adjust willingness to pay; default 1.5. Strategic ceiling also adjusts for role urgency, scarcity, redundant depth and rivals."
          >
            <input
              type="number"
              min=".1"
              max="10"
              step=".1"
              value={d.profile.priceMultiplier}
              onChange={(e) => setP("priceMultiplier", Number(e.target.value))}
            />
          </Field>
          <Field
            label="Extra cash reserve for Pranav"
            hint="Added on top of the cheapest feasible remaining squad. Helps protect against future auction premiums."
          >
            <input
              type="number"
              min="0"
              step=".01"
              value={d.profile.reserveBuffer}
              onChange={(e) => setP("reserveBuffer", Number(e.target.value))}
            />
          </Field>
        </div>
        <details>
          <summary>How the engine calculates value and your ceiling</summary>
          <p>
            Value score is the weighted average of uploaded overall rating,
            tactical fit, scarcity/urgency, and versatility. Fit uses only
            supplied relevant attributes, formation eligibility, selected
            PlayStyles and weak foot/skill moves. Missing relevant attributes
            fall back to rating and are labeled as limited evidence. Pace,
            agility, strength and finishing use your 0–5 weights. Scarcity
            counts comparable available players within three rating points.
            Urgency uses outstanding positional minimums.
          </p>
          <p>
            Strategic ceiling = opening × multiplier × (0.6 + value/100) × (0.8
            + urgency × 0.35 + scarcity/500) × 0.6 for redundant depth × 0.85
            when no funded rival needs the role. Applicable discounts only.
            Absolute maximum is the lower of the strategic and financial
            ceilings, rounded down to a legal bid.
          </p>
          <p>
            Financial ceiling = remaining purse − cheapest feasible completion −
            extra reserve. Minimum-cost assignment accounts for alternative
            positions, eligible available players, base-price floors and unique
            ownership. It is a feasibility check at today’s price floors, not a
            guarantee that rivals leave those players available. Rival demand is
            a heuristic from budgets and missing categories, not knowledge of
            their plans.
          </p>
        </details>
      </Panel>
      <Button
        variant="primary"
        onClick={() => {
          if (
            act({
              type: "settings",
              rules: d.rules,
              budgets: d.budgets,
              profile: d.profile,
            })
          )
            setSaved(true);
        }}
      >
        <Check size={16} />
        {saved ? "Settings saved" : "Save all settings"}
      </Button>
    </div>
  );
}
