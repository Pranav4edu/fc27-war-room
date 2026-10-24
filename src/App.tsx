import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Check,
  ChevronRight,
  Command as CommandIcon,
  Database,
  Download,
  History,
  LayoutDashboard,
  Menu,
  Radio,
  RotateCcw,
  Search,
  Settings2,
  Shield,
  Target,
  Trophy,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { MANAGERS, type Player } from "./model";
import { useAuction, STORAGE_KEY } from "./storage";
import { recommendation, validateState } from "./engine";
import { download } from "./importer";
import {
  ActionErrorContext,
  Badge,
  BudgetStrip,
  Button,
  Modal,
  fmt,
} from "./components";
import { ImportDialog, PlayerEditor } from "./ImportDialog";
import Command from "./Command";
import Scout from "./Scout";
import Settings from "./Settings";
import { DreamTeam, Opponents } from "./Squads";
import { Finance, HistoryPage } from "./Finance";
const NAV = [
  ["command", "Command center", LayoutDashboard],
  ["squad", "My dream team", Shield],
  ["opponents", "Opponent intelligence", Users],
  ["scouting", "Scouting & targets", Target],
  ["finance", "Financial war room", Wallet],
  ["history", "History & analytics", History],
] as const;
export default function App() {
  const { s, env, act, undo, restore, error, setError, locked, corrupt } =
    useAuction();
  const [page, setPage] = useState("command"),
    [showImport, setShowImport] = useState(false),
    [editor, setEditor] = useState<Player | "new" | null>(null),
    [menu, setMenu] = useState(false),
    [reset, setReset] = useState(false),
    [resetText, setResetText] = useState(""),
    [restoreModal, setRestoreModal] = useState(false),
    [restoreData, setRestoreData] = useState<unknown>(null),
    [restoreSummary, setRestoreSummary] = useState(""),
    [restoreError, setRestoreError] = useState("");
  const activePlayer = s.players.find((p) => p.id === s.auction?.playerId);
  const liveRecommendation = useMemo(
    () => (activePlayer ? recommendation(s, activePlayer) : null),
    [s, activePlayer],
  );
  const changePage = (p: string) => {
    setPage(p);
    setMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const backup = () =>
    download(
      `fc27-auction-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(env, null, 2),
    );
  useEffect(() => {
    const hotkey = (e: KeyboardEvent) => {
      if (e.altKey && e.key === "1") {
        e.preventDefault();
        changePage("command");
      }
      if (e.altKey && e.key === "4") {
        e.preventDefault();
        changePage("scouting");
      }
    };
    window.addEventListener("keydown", hotkey);
    return () => window.removeEventListener("keydown", hotkey);
  }, []);
  return (
    <ActionErrorContext.Provider value={error}>
      <div className="app-shell">
        <aside className={`sidebar ${menu ? "open" : ""}`}>
          <a
            className="brand"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              changePage("command");
            }}
          >
            <div className="brand-mark">
              FC<span>27</span>
            </div>
            <div>
              <strong>WAR ROOM</strong>
              <span>THE AUCTION ADVANTAGE</span>
            </div>
          </a>
          <div className="workspace-label">
            <span>PRIVATE LEAGUE</span>
            <Badge>PS5</Badge>
          </div>
          <nav>
            {NAV.map(([id, label, Icon], i) => (
              <button
                className={page === id ? "active" : ""}
                key={id}
                onClick={() => changePage(id)}
              >
                <Icon size={19} />
                <span>{label}</span>
                <small>0{i + 1}</small>
              </button>
            ))}
          </nav>
          <div className="sidebar-rule" />
          <button
            className={`settings-nav ${page === "settings" ? "active" : ""}`}
            onClick={() => changePage("settings")}
          >
            <Settings2 size={18} />
            Rules & gameplay
          </button>
          <button className="settings-nav" onClick={() => setShowImport(true)}>
            <Database size={18} />
            Import player database
          </button>
          <div className="sidebar-bottom">
            <div className="league-card">
              <div className="league-emblem">
                <Trophy size={23} />
              </div>
              <span>ONE ROOM. SIX RIVALS.</span>
              <strong>
                Build the team
                <br />
                they fear.
              </strong>
              <small>Pranav’s private auction desk</small>
            </div>
            <div className="operator">
              <span>PK</span>
              <div>
                <strong>Pranav Kumsi</strong>
                <small>Manager & auction operator</small>
              </div>
              <i />
            </div>
          </div>
        </aside>
        {menu && (
          <div className="sidebar-scrim" onClick={() => setMenu(false)} />
        )}
        <div className="main-shell">
          <header className="topbar">
            <div className="breadcrumb">
              <button
                className="icon-button mobile-menu"
                aria-label="Open navigation"
                onClick={() => setMenu(!menu)}
              >
                <Menu size={21} />
              </button>
              <span>FC 27</span>
              <ChevronRight size={13} />
              <strong>Auction war room</strong>
              <Badge>SEASON 2026 / 27</Badge>
            </div>
            <div className="top-actions">
              <span className={`save-status ${locked ? "text-amber" : ""}`}>
                <span className="live-dot" />
                {locked
                  ? "Read-only tab"
                  : env.savedAt
                    ? "Saved in this browser"
                    : "Local autosave ready"}
              </span>
              <button
                className="icon-button"
                title="Save complete backup"
                aria-label="Save complete backup"
                onClick={backup}
              >
                <Download size={17} />
              </button>
              <button
                className="icon-button"
                title="Undo last action"
                aria-label="Undo last action"
                disabled={!env.past.length || locked}
                onClick={undo}
              >
                <RotateCcw size={17} />
              </button>
              <span className="avatar">PK</span>
            </div>
          </header>
          <div className="purse-bar">
            <div className="purse-heading">
              <span className="eyebrow">THE LIVE PURSES</span>
              <span>
                {s.sales.length} confirmed transfers <i>·</i> {s.players.length}{" "}
                players loaded
              </span>
            </div>
            <BudgetStrip s={s} onSetup={() => changePage("settings")} />
            {activePlayer && liveRecommendation && (
              <div className="active-bid-dock">
                <span className="live-dot" />
                <strong>{activePlayer.name}</strong>
                <span>
                  {s.auction?.bids.at(-1)
                    ? `${fmt(s.auction.bids.at(-1)!.amount)} ${s.rules.currency} · ${s.auction.bids.at(-1)!.manager}`
                    : "No bids yet"}
                </span>
                <Badge
                  tone={
                    liveRecommendation.decision === "BID"
                      ? "lime"
                      : liveRecommendation.decision === "WAIT"
                        ? "amber"
                        : "red"
                  }
                >
                  {liveRecommendation.decision} · MAX{" "}
                  {fmt(liveRecommendation.ceiling)}
                </Badge>
                <Button variant="ghost" onClick={() => changePage("command")}>
                  Live controls
                  <ChevronRight size={13} />
                </Button>
              </div>
            )}
          </div>
          <main>
            {error && (
              <div className="global-error" role="alert">
                <div>
                  <strong>Action needs attention</strong>
                  <p>{error}</p>
                  {corrupt && (
                    <Button
                      onClick={() =>
                        download(
                          "fc27-raw-recovery.json",
                          localStorage.getItem(STORAGE_KEY) || "{}",
                        )
                      }
                    >
                      Export raw recovery
                    </Button>
                  )}
                </div>
                <button
                  className="icon-button"
                  aria-label="Dismiss error"
                  onClick={() => setError("")}
                >
                  <X size={18} />
                </button>
              </div>
            )}
            {page === "command" && (
              <Command
                s={s}
                act={act}
                onImport={() => setShowImport(true)}
                onSetup={() => changePage("settings")}
                onScout={() => changePage("scouting")}
              />
            )}{" "}
            {page === "squad" && <DreamTeam s={s} act={act} />}{" "}
            {page === "opponents" && <Opponents s={s} />}{" "}
            {page === "scouting" && (
              <Scout
                s={s}
                act={act}
                onImport={() => setShowImport(true)}
                onEdit={(p) => setEditor(p || "new")}
                onNominate={(p) => {
                  if (
                    act({
                      type: "nominate",
                      playerId: p.id,
                      nominator: "Pranav Kumsi",
                    })
                  )
                    changePage("command");
                }}
              />
            )}{" "}
            {page === "finance" && <Finance s={s} />}{" "}
            {page === "history" && (
              <HistoryPage
                s={s}
                act={act}
                undo={undo}
                canUndo={!!env.past.length}
                onBackup={backup}
                onRestore={() => {
                  setRestoreModal(true);
                  setRestoreData(null);
                  setRestoreError("");
                  setRestoreSummary("");
                }}
                onReset={() => {
                  setReset(true);
                  setResetText("");
                }}
              />
            )}{" "}
            {page === "settings" && <Settings key={page} s={s} act={act} />}
            <footer>
              <span>
                <Radio size={13} />
                Single operator · browser-local data · no cross-device
                synchronization
              </span>
              <span>
                ALT + 1 Command <i>·</i> ALT + 4 Scouting
              </span>
            </footer>
          </main>
        </div>
        {showImport && (
          <ImportDialog s={s} act={act} onClose={() => setShowImport(false)} />
        )}{" "}
        {editor && (
          <PlayerEditor
            player={editor === "new" ? undefined : editor}
            act={act}
            onClose={() => setEditor(null)}
          />
        )}{" "}
        {reset && (
          <Modal title="Reset this auction?" onClose={() => setReset(false)}>
            <p>
              All sales, provisional bids, unsold statuses, lineups and activity
              will be cleared. Player data, budgets and gameplay preferences
              stay. The reset can be undone while it remains in the last 25
              actions.
            </p>
            <Button onClick={backup}>Download backup first</Button>
            <label className="field">
              <span>Type RESET to confirm</span>
              <input
                aria-label="Reset confirmation"
                value={resetText}
                onChange={(e) => setResetText(e.target.value)}
              />
            </label>
            <div className="modal-footer">
              <Button onClick={() => setReset(false)}>Cancel</Button>
              <Button
                variant="danger"
                disabled={resetText !== "RESET"}
                onClick={() => {
                  if (act({ type: "reset" })) setReset(false);
                }}
              >
                Reset auction
              </Button>
            </div>
          </Modal>
        )}{" "}
        {restoreModal && (
          <Modal
            title="Restore an auction backup"
            onClose={() => setRestoreModal(false)}
          >
            <p className="muted">
              Choose a complete JSON backup. Review the summary before replacing
              this browser’s auction. Your current state becomes an undo
              snapshot.
            </p>
            <input
              type="file"
              accept=".json"
              aria-label="Auction backup file"
              onChange={async (e) => {
                try {
                  setRestoreData(null);
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 15 * 1024 * 1024)
                    throw new Error("Backup exceeds 15 MB");
                  const raw = JSON.parse(await file.text());
                  const state = validateState(raw.state || raw);
                  setRestoreData(raw);
                  setRestoreSummary(
                    `${state.players.length} players · ${state.sales.length} confirmed sales · ${state.auction ? "1 live nomination" : "no live nomination"}. Budgets: ${MANAGERS.map((m) => `${m} ${fmt(state.budgets[m])}`).join(" / ")}.`,
                  );
                  setRestoreError("");
                } catch (err) {
                  setRestoreError(String(err));
                }
              }}
            />
            {restoreSummary && <div className="notice">{restoreSummary}</div>}
            {restoreError && (
              <p role="alert" className="error-text">
                {restoreError}
              </p>
            )}
            <div className="modal-footer">
              <Button onClick={backup}>Back up current state</Button>
              <Button
                variant="primary"
                disabled={!restoreData}
                onClick={() => {
                  if (restore(restoreData)) setRestoreModal(false);
                }}
              >
                Confirm restore
              </Button>
            </div>
          </Modal>
        )}
      </div>
    </ActionErrorContext.Provider>
  );
}
