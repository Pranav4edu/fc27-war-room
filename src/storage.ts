import { useCallback, useEffect, useState } from "react";
import { apply, initialState, validateState, type Action } from "./engine";
import { uid, type Envelope, type State } from "./model";
export const STORAGE_KEY = "fc27-war-room-v1";
function load(): Envelope {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw)
    return { revision: 0, state: initialState(), past: [], savedAt: "" };
  const doc = JSON.parse(raw);
  return {
    revision: Number(doc.revision) || 0,
    state: validateState(doc.state),
    past: (Array.isArray(doc.past) ? doc.past : [])
      .slice(-25)
      .map(validateState),
    savedAt: doc.savedAt || "",
  };
}
export function useAuction() {
  const [initial] = useState(() => {
    try {
      return { env: load(), error: "" };
    } catch (e) {
      return {
        env: {
          revision: 0,
          state: initialState(),
          past: [],
          savedAt: "",
        } as Envelope,
        error: `Saved data could not be loaded. Export raw recovery before replacing it. ${String(e)}`,
      };
    }
  });
  const [env, setEnv] = useState(initial.env),
    [error, setError] = useState(initial.error),
    [locked, setLocked] = useState(true);
  const [corrupt, setCorrupt] = useState(!!initial.error);
  useEffect(() => {
    let alive = true;
    let release: () => void = () => {};
    const controller = new AbortController();
    if (navigator.locks) {
      navigator.locks.query().then((info) => {
        if (alive && info.held?.some((lock) => lock.name === STORAGE_KEY))
          setError(
            "Another tab is operating this auction. This tab will become editable when that tab closes.",
          );
      });
      navigator.locks
        .request(STORAGE_KEY, { signal: controller.signal }, async () => {
          if (!alive) return;
          setLocked(false);
          setError((prev) =>
            prev.startsWith("Another tab is operating") ? "" : prev,
          );
          await new Promise<void>((r) => {
            release = r;
          });
        })
        .catch((err) => {
          if (alive && err.name !== "AbortError")
            setError(`Could not acquire the operator lock: ${String(err)}`);
        });
    } else {
      setLocked(false);
      setError(
        "This browser does not support tab locking. Operate the auction in one tab only.",
      );
    }
    const sync = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY)
        try {
          setEnv(load());
        } catch {
          setError("Another tab wrote invalid data; export your backup.");
        }
    };
    window.addEventListener("storage", sync);
    return () => {
      alive = false;
      controller.abort();
      release();
      window.removeEventListener("storage", sync);
    };
  }, []);

  const commit = useCallback(
    (next: State, past: State[], allowCorrupt = false) => {
      if (locked)
        throw new Error(
          "This tab is read-only. Close the other auction tab, then reload.",
        );
      if (corrupt && !allowCorrupt)
        throw new Error(
          "Recover or explicitly replace the damaged saved state first.",
        );
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && !corrupt) {
        const current = JSON.parse(stored);
        if (current.revision !== env.revision) {
          setEnv(load());
          throw new Error(
            "A newer state exists. Review it and retry your action.",
          );
        }
      }
      const update: Envelope = {
        revision: env.revision + 1,
        state: next,
        past: past.slice(-25),
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(update));
      setEnv(update);
      setCorrupt(false);
      setError("");
    },
    [env, locked, corrupt],
  );
  const act = useCallback(
    (a: Action) => {
      try {
        commit(apply(env.state, a), [...env.past, env.state]);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        return false;
      }
    },
    [env, commit],
  );
  const undo = () => {
    try {
      const prev = env.past.at(-1);
      if (!prev) throw new Error("Nothing to undo.");
      const n = structuredClone(prev);
      n.activity.push({
        id: uid(),
        at: new Date().toISOString(),
        message: "Undid the last action",
      });
      commit(n, env.past.slice(0, -1));
      return true;
    } catch (e) {
      setError(String(e));
      return false;
    }
  };
  const restore = (raw: unknown) => {
    try {
      const r = raw as { state?: State; past?: State[] };
      const next = validateState(r.state || r);
      const restoredPast = Array.isArray(r.past)
        ? r.past.slice(-24).map(validateState)
        : env.past;
      commit(next, corrupt ? restoredPast : [...restoredPast, env.state], true);
      return true;
    } catch (e) {
      setError(`Restore rejected: ${String(e)}`);
      return false;
    }
  };
  return {
    s: env.state,
    env,
    act,
    undo,
    restore,
    error,
    setError,
    locked,
    corrupt,
  };
}
