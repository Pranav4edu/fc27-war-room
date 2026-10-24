import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { X, ArrowUpRight, ChevronRight } from "lucide-react";
import { MANAGERS, type Manager, type Player, type State } from "./model";
import { owned, remaining, spent, status } from "./engine";
export const ActionErrorContext = createContext("");
export const fmt = (n: number | null | undefined) =>
  n === null || n === undefined || !Number.isFinite(n)
    ? "—"
    : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
export function Badge({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function Button({
  children,
  variant = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) {
  return (
    <button {...props} className={`button ${variant} ${props.className || ""}`}>
      {children}
    </button>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Panel({
  title,
  eyebrow,
  children,
  action,
  className = "",
}: {
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {(title || action) && (
        <div className="panel-heading">
          <div>
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            <h2>{title}</h2>
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function Empty({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-mark">↗</div>
      <h3>{title}</h3>
      <p>{detail}</p>
      {action}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const actionError = useContext(ActionErrorContext);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} className={wide ? "wide" : ""} onCancel={onClose}>
      <div className="modal-heading">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {actionError && (
        <p className="notice amber" role="alert">
          {actionError}
        </p>
      )}
      {children}
    </dialog>
  );
}
export function ManagerSelect({
  value,
  onChange,
  label = "Manager",
}: {
  value: Manager;
  onChange: (v: Manager) => void;
  label?: string;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value as Manager)}
    >
      {MANAGERS.map((m) => (
        <option key={m}>{m}</option>
      ))}
    </select>
  );
}
export function BudgetStrip({ s, onSetup }: { s: State; onSetup: () => void }) {
  return (
    <div className="budget-strip">
      {MANAGERS.map((m, i) => {
        const rem = remaining(s, m),
          percent = s.budgets[m] ? (spent(s, m) / s.budgets[m]!) * 100 : 0;
        return (
          <button
            className={`manager-tile ${i === 0 ? "mine" : ""}`}
            key={m}
            onClick={onSetup}
          >
            <div>
              <span
                className="manager-dot"
                style={{
                  background: [
                    "#c6f465",
                    "#9c9bfb",
                    "#f2b36c",
                    "#79c6e0",
                    "#e693af",
                  ][i],
                }}
              />
              {i === 0 ? "PRANAV · YOU" : m.toUpperCase()}
              <ArrowUpRight size={12} />
            </div>
            <strong>
              {fmt(rem)}
              <small>{rem === null ? "SET BUDGET" : s.rules.currency}</small>
            </strong>
            <div className="tiny-track">
              <i style={{ width: `${Math.min(100, percent)}%` }} />
            </div>
            <small>
              {owned(s, m).length}/{s.rules.maxSquad} players{" "}
              <span>{Math.round(percent)}% spent</span>
            </small>
          </button>
        );
      })}
      <div className="pinky-tile">
        <span className="badge red">LFC</span>
        <strong>Pinky</strong>
        <small>Liverpool · no bidding</small>
      </div>
    </div>
  );
}
export function PlayerName({ p, sub = true }: { p: Player; sub?: boolean }) {
  return (
    <div className="player-name">
      <span className="rating-mini">{p.rating}</span>
      <div>
        <strong>{p.name}</strong>
        {sub && (
          <small>
            {p.club} · {p.positions.join(" / ")}
          </small>
        )}
      </div>
    </div>
  );
}
export function StatusBadge({ s, p }: { s: State; p: Player }) {
  const st = status(s, p);
  return (
    <Badge
      tone={
        st === "Sold"
          ? "purple"
          : st === "Liverpool"
            ? "red"
            : st === "Nominated"
              ? "lime"
              : "muted"
      }
    >
      {st}
    </Badge>
  );
}
export function Progress({
  value,
  max = 100,
  tone = "lime",
}: {
  value: number;
  max?: number;
  tone?: string;
}) {
  return (
    <div className={`progress ${tone}`}>
      <i
        style={{
          width: `${Math.max(0, Math.min(100, (value / (max || 1)) * 100))}%`,
        }}
      />
    </div>
  );
}
export function Step({
  number,
  title,
  detail,
  done,
  onClick,
}: {
  number: number;
  title: string;
  detail: string;
  done: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`setup-step ${done ? "done" : ""}`} onClick={onClick}>
      <span>{done ? "✓" : `0${number}`}</span>
      <div>
        <strong>{title}</strong>
        <small>{detail}</small>
      </div>
      <ChevronRight size={16} />
    </button>
  );
}
