import { useMemo, useState } from "react";
import { Download, Upload, Plus, Trash2 } from "lucide-react";
import {
  FIELDS,
  autoMapping,
  download,
  mappedPlayers,
  parseFile,
  tableFromMatrix,
  template,
  type ImportSheet,
  type RawRow,
} from "./importer";
import {
  ATTRIBUTES,
  POSITIONS,
  isLiverpool,
  uid,
  type Player,
  type Position,
  type State,
} from "./model";
import { playerErrors, type Action } from "./engine";
import { Button, Field, Modal, Badge, fmt } from "./components";
export function ImportDialog({
  s,
  act,
  onClose,
}: {
  s: State;
  act: (a: Action) => boolean;
  onClose: () => void;
}) {
  const [sheets, setSheets] = useState<ImportSheet[]>([]),
    [sheet, setSheet] = useState(0),
    [rows, setRows] = useState<RawRow[]>([]),
    [mapping, setMapping] = useState<Record<string, string>>({}),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [step, setStep] = useState(0);
  const headers = sheets[sheet]?.headers || [];
  const preview = useMemo(
    () => mappedPlayers(rows, mapping, s.players),
    [rows, mapping, s.players],
  );
  const issues = preview.filter((r) => r.errors.length).length;
  const changeSheet = (i: number) => {
    setSheet(i);
    setRows(sheets[i].rows);
    setMapping(autoMapping(sheets[i].headers));
    setStep(1);
  };
  return (
    <Modal title="Import your player database" onClose={onClose} wide>
      <p className="muted">
        Your file is the source of truth. Review column mapping and every
        flagged record before committing. Files stay in your browser.
      </p>
      {!sheets.length ? (
        <>
          <label className="drop-zone">
            <Upload size={32} />
            <strong>
              {loading ? "Reading file…" : "Choose a CSV or Excel file"}
            </strong>
            <span>
              .csv or .xlsx · up to 10 MB · first row contains headers
            </span>
            <input
              type="file"
              accept=".csv,.xlsx"
              aria-label="Upload players"
              disabled={loading}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setLoading(true);
                try {
                  const result = await parseFile(file);
                  if (!result.length) throw new Error("No worksheets found");
                  if (result.some((s) => s.rows.length > 2000))
                    throw new Error("Maximum 2,000 player rows");
                  setSheets(result);
                  setSheet(0);
                  setRows(result[0].rows);
                  setMapping(autoMapping(result[0].headers));
                  setStep(1);
                  setError("");
                } catch (e) {
                  setError(String(e));
                } finally {
                  setLoading(false);
                }
              }}
            />
          </label>
          <Button
            onClick={() =>
              download("fc27-player-template.csv", template(), "text/csv")
            }
          >
            <Download size={16} />
            Download empty CSV template
          </Button>
          <p className="fineprint">
            Required: name, club, rating, positions, base price. Optional:
            alternate positions, attributes, weak foot, skill moves and
            PlayStyles. Use dot decimals (12.5); ambiguous comma decimals are
            flagged. Convert PDF or legacy .xls to CSV/.xlsx first; no player
            data is inferred.
          </p>
        </>
      ) : (
        <>
          <div className="toolbar">
            <Field label="Worksheet">
              <select
                value={sheet}
                onChange={(e) => changeSheet(Number(e.target.value))}
              >
                {sheets.map((v, i) => (
                  <option value={i} key={i}>
                    {v.name}
                  </option>
                ))}
              </select>
            </Field>
            {sheets[sheet]?.matrix && (
              <Field label="Header row">
                <select
                  value={sheets[sheet].headerIndex || 0}
                  onChange={(e) => {
                    const headerIndex = Number(e.target.value);
                    const parsed = tableFromMatrix(
                      sheets[sheet].matrix!,
                      headerIndex,
                    );
                    setSheets(
                      sheets.map((v, i) =>
                        i === sheet ? { ...v, ...parsed, headerIndex } : v,
                      ),
                    );
                    setRows(parsed.rows);
                    setMapping(autoMapping(parsed.headers));
                    setStep(1);
                  }}
                >
                  {sheets[sheet].matrix!.slice(0, 30).map((row, i) => (
                    <option key={i} value={i}>
                      Row {i + 1}:{" "}
                      {row.filter(Boolean).slice(0, 4).join(" / ").slice(0, 95)}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Badge tone={issues ? "amber" : "lime"}>
              {preview.length} records · {issues} need attention
            </Badge>
            <Button onClick={() => setStep(step === 1 ? 2 : 1)}>
              {step === 1 ? "Review records →" : "← Column mapping"}
            </Button>
          </div>
          {step === 1 ? (
            <div className="mapping-grid">
              {FIELDS.map((f, i) => (
                <Field key={f} label={`${f}${i < 5 ? " *" : ""}`}>
                  <select
                    value={mapping[f] || ""}
                    onChange={(e) =>
                      setMapping({ ...mapping, [f]: e.target.value })
                    }
                  >
                    <option value="">Not supplied</option>
                    {headers.map((h, j) => (
                      <option key={j} value={h}>
                        {h || "(blank)"}
                      </option>
                    ))}
                  </select>
                </Field>
              ))}
            </div>
          ) : (
            <div className="table-scroll import-table">
              <table>
                <thead>
                  <tr>
                    <th>Row</th>
                    {headers.map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                    <th>Validation</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i}>
                      <td>{i + 2}</td>
                      {headers.map((h) => (
                        <td key={h}>
                          <input
                            aria-label={`Row ${i + 2} ${h}`}
                            value={r[h] || ""}
                            onChange={(e) =>
                              setRows(
                                rows.map((row, j) =>
                                  j === i
                                    ? { ...row, [h]: e.target.value }
                                    : row,
                                ),
                              )
                            }
                          />
                        </td>
                      ))}
                      <td className="validation-cell">
                        {preview[i].errors.length ? (
                          <span className="text-amber">
                            {preview[i].errors.join("; ")}
                          </span>
                        ) : (
                          <Badge
                            tone={
                              isLiverpool(preview[i].player) ? "red" : "lime"
                            }
                          >
                            {isLiverpool(preview[i].player)
                              ? "Liverpool · Pinky"
                              : "Ready"}
                          </Badge>
                        )}
                      </td>
                      <td>
                        <button
                          aria-label={`Remove row ${i + 2}`}
                          className="icon-button"
                          onClick={() =>
                            setRows(rows.filter((_, j) => j !== i))
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="notice">
            {preview.filter((r) => isLiverpool(r.player)).length} Liverpool
            records will be assigned to Pinky’s separate roster. Duplicate names
            are blocked, including accent and punctuation variants.
          </div>
          <div className="modal-footer">
            <Button
              onClick={() => {
                setSheets([]);
                setStep(0);
              }}
            >
              Choose another file
            </Button>
            <Button
              variant="primary"
              disabled={!!issues || !preview.length || step !== 2}
              onClick={() => {
                if (
                  act({
                    type: "players",
                    players: preview.map((r) => r.player),
                  })
                )
                  onClose();
              }}
            >
              Import {preview.length} reviewed players
            </Button>
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
    </Modal>
  );
}
export function PlayerEditor({
  player,
  act,
  onClose,
}: {
  player?: Player;
  act: (a: Action) => boolean;
  onClose: () => void;
}) {
  const [p, setP] = useState<Player>(
    player
      ? structuredClone(player)
      : {
          id: uid(),
          name: "",
          club: "",
          rating: NaN,
          positions: [],
          basePrice: NaN,
          attributes: {},
          playStyles: [],
          notes: "",
        },
  );
  const [pos, setPos] = useState(player?.positions.join(", ") || "");
  const [error, setError] = useState("");
  return (
    <Modal
      title={player ? "Edit player record" : "Add a player"}
      onClose={onClose}
      wide
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const parsed = {
            ...p,
            positions: pos
              .toUpperCase()
              .split(/[,;/|\s]+/)
              .filter(Boolean) as Position[],
          };
          const errors = playerErrors(parsed);
          if (errors.length) {
            setError(errors.join("; "));
            return;
          }
          if (
            act(
              player
                ? { type: "editPlayer", player: parsed }
                : { type: "players", players: [parsed] },
            )
          )
            onClose();
        }}
      >
        <div className="form-grid">
          <Field label="Player name">
            <input
              required
              value={p.name}
              onChange={(e) => setP({ ...p, name: e.target.value })}
            />
          </Field>
          <Field label="Club">
            <input
              required
              value={p.club}
              onChange={(e) => setP({ ...p, club: e.target.value })}
            />
          </Field>
          <Field label="Overall rating">
            <input
              required
              type="number"
              min="1"
              max="99"
              value={Number.isNaN(p.rating) ? "" : p.rating}
              onChange={(e) =>
                setP({
                  ...p,
                  rating: e.target.value === "" ? NaN : Number(e.target.value),
                })
              }
            />
          </Field>
          <Field label="Base price">
            <input
              required
              type="number"
              min="0"
              step=".01"
              value={Number.isNaN(p.basePrice) ? "" : p.basePrice}
              onChange={(e) =>
                setP({
                  ...p,
                  basePrice:
                    e.target.value === "" ? NaN : Number(e.target.value),
                })
              }
            />
          </Field>
          <Field
            label="Primary, then alternate positions"
            hint={POSITIONS.join(" · ")}
          >
            <input
              required
              placeholder="ST, LW"
              value={pos}
              onChange={(e) => setPos(e.target.value)}
            />
          </Field>
          <Field label="PlayStyles (comma separated)">
            <input
              value={p.playStyles.join(",")}
              onChange={(e) =>
                setP({ ...p, playStyles: e.target.value.split(",") })
              }
            />
          </Field>
        </div>
        <details>
          <summary>Optional attributes · leave unknown values blank</summary>
          <div className="mapping-grid">
            {ATTRIBUTES.map((a) => (
              <Field key={a} label={a}>
                <input
                  type="number"
                  min="0"
                  max={["weakFoot", "skillMoves"].includes(a) ? 5 : 99}
                  value={p.attributes[a] ?? ""}
                  onChange={(e) => {
                    const attributes = { ...p.attributes };
                    if (e.target.value === "") delete attributes[a];
                    else attributes[a] = Number(e.target.value);
                    setP({ ...p, attributes });
                  }}
                />
              </Field>
            ))}
          </div>
        </details>
        <Field label="Scouting notes">
          <textarea
            value={p.notes}
            onChange={(e) => setP({ ...p, notes: e.target.value })}
          />
        </Field>
        {error && (
          <p role="alert" className="error-text">
            {error}
          </p>
        )}
        <div className="modal-footer">
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit">
            <Plus size={16} />
            {player ? "Save record" : "Add player"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
