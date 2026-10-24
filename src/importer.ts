import Papa from "papaparse";
import {
  ATTRIBUTES,
  POSITIONS,
  normalize,
  uid,
  type Player,
  type Position,
} from "./model";
import { playerErrors } from "./engine";
export type RawRow = Record<string, string>;
export const FIELDS = [
  "name",
  "club",
  "rating",
  "positions",
  "basePrice",
  "alternatePositions",
  ...ATTRIBUTES,
  "playStyles",
  "notes",
] as const;
export const ALIASES: Record<string, string[]> = {
  name: ["name", "player", "playername", "fullname"],
  club: ["club", "team", "clubname"],
  rating: ["rating", "overall", "ovr", "overallrating"],
  positions: ["positions", "position", "pos", "primaryposition"],
  basePrice: ["baseprice", "price", "cost", "startingprice", "reserveprice"],
  alternatePositions: [
    "alternatepositions",
    "alternativepositions",
    "altpositions",
    "secondarypositions",
  ],
  pace: ["pace", "pac"],
  shooting: ["shooting", "sho"],
  passing: ["passing", "pas"],
  dribbling: ["dribbling", "dri"],
  defending: ["defending", "def"],
  physical: ["physical", "physicality", "phy"],
  weakFoot: ["weakfoot", "wf"],
  skillMoves: ["skillmoves", "sm"],
  playStyles: ["playstyles", "playstyle"],
};
export function autoMapping(headers: string[]) {
  return Object.fromEntries(
    FIELDS.map((f) => [
      f,
      headers.find((h) =>
        (ALIASES[f] || [normalize(f)]).includes(normalize(h)),
      ) || "",
    ]),
  );
}
export function parseCSV(text: string) {
  const parsed = Papa.parse<RawRow>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });
  if (parsed.errors.length)
    throw new Error(
      `CSV row ${(parsed.errors[0].row ?? 0) + 2}: ${parsed.errors[0].message}`,
    );
  if (!parsed.meta.fields?.length) throw new Error("No column headers found.");
  return { headers: parsed.meta.fields, rows: parsed.data };
}
export type ImportSheet = {
  name: string;
  headers: string[];
  rows: RawRow[];
  matrix?: string[][];
  headerIndex?: number;
};
export function tableFromMatrix(matrix: string[][], headerIndex: number) {
  const raw = matrix[headerIndex] || [];
  const last = Math.max(0, ...raw.map((v, i) => (v.trim() ? i : 0)));
  const counts = new Map<string, number>();
  const headers = raw.slice(0, last + 1).map((v, i) => {
    const base = v.trim() || `Column ${i + 1}`;
    const count = (counts.get(base) || 0) + 1;
    counts.set(base, count);
    return count === 1 ? base : `${base} (${count})`;
  });
  const rows = matrix
    .slice(headerIndex + 1)
    .filter((row) => row.some((v) => v.trim()))
    .map((row) => Object.fromEntries(headers.map((h, i) => [h, row[i] || ""])));
  return { headers, rows };
}
export async function parseFile(file: File): Promise<ImportSheet[]> {
  if (file.size > 10 * 1024 * 1024)
    throw new Error("Please use a file smaller than 10 MB.");
  if (/\.csv$/i.test(file.name))
    return [{ name: file.name, ...parseCSV(await file.text()) }];
  if (!/\.xlsx$/i.test(file.name))
    throw new Error(
      "Use CSV or Excel .xlsx. Export older .xls or PDF files to one of these formats first.",
    );
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  return workbook.worksheets
    .filter((ws) => ws.actualRowCount > 0)
    .map((ws) => {
      if (ws.rowCount > 5000 || ws.columnCount > 200)
        throw new Error(
          `Worksheet ${ws.name} exceeds 5,000 rows or 200 columns. Export just the player table.`,
        );
      const matrix: string[][] = [];
      for (let i = 1; i <= ws.rowCount; i++) {
        const values: string[] = [];
        for (let j = 1; j <= ws.columnCount; j++)
          values.push(ws.getRow(i).getCell(j).text.trim());
        matrix.push(values);
      }
      const first = matrix.findIndex((row) => row.some(Boolean));
      const detected = matrix
        .slice(0, 30)
        .findIndex(
          (row) =>
            row.filter((v) =>
              Object.values(ALIASES).some((a) => a.includes(normalize(v))),
            ).length >= 3,
        );
      const headerIndex = detected >= 0 ? detected : Math.max(0, first);
      return {
        name: ws.name,
        matrix,
        headerIndex,
        ...tableFromMatrix(matrix, headerIndex),
      };
    });
}
export function mappedPlayers(
  rows: RawRow[],
  mapping: Record<string, string>,
  existing: Player[],
) {
  const seen = new Set(existing.map((p) => normalize(p.name)));
  return rows.map((row, index) => {
    const get = (key: string) => (row[mapping[key]] || "").trim();
    const numeric = (key: string) => {
      const value = get(key);
      if (!value) return NaN;
      if (value.includes(",") && !/^[+-]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(value))
        return NaN;
      return Number(value.replace(/,/g, ""));
    };
    const positions = [
      ...new Set(
        (get("positions") + "," + get("alternatePositions"))
          .toUpperCase()
          .split(/[,;/|\s]+/)
          .filter(Boolean),
      ),
    ] as Position[];
    const attributes: Player["attributes"] = {};
    for (const a of ATTRIBUTES) if (get(a)) attributes[a] = numeric(a);
    const p: Player = {
      id: uid(),
      name: get("name"),
      club: get("club"),
      rating: numeric("rating"),
      positions,
      basePrice: numeric("basePrice"),
      attributes,
      playStyles: get("playStyles")
        .split(/[,;|]/)
        .map((x) => x.trim())
        .filter(Boolean),
      notes: get("notes"),
    };
    const errors = playerErrors(p);
    if (seen.has(normalize(p.name)))
      errors.push(
        "Duplicate name — edit the existing record or remove this row",
      );
    seen.add(normalize(p.name));
    return { player: p, errors, row: index + 2 };
  });
}
export const template = () =>
  Papa.unparse({
    fields: [
      "name",
      "club",
      "rating",
      "positions",
      "basePrice",
      "alternatePositions",
      ...ATTRIBUTES,
      "playStyles",
      "notes",
    ],
    data: [],
  });
export function download(
  name: string,
  text: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function exportPlayers(players: Player[]) {
  return Papa.unparse(
    players.map((p) => ({
      name: p.name,
      club: p.club,
      rating: p.rating,
      positions: p.positions.join(", "),
      basePrice: p.basePrice,
      ...p.attributes,
      playStyles: p.playStyles.join(", "),
      notes: p.notes,
    })),
    { escapeFormulae: true },
  );
}
