import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: string }
> {
  state = { error: "" };
  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }
  render() {
    return this.state.error ? (
      <div style={{ padding: 40, color: "white", background: "#101411" }}>
        <h1>Auction view needs recovery</h1>
        <p>{this.state.error}</p>
        <p>Your browser's saved auction has not been deleted.</p>
        <button
          onClick={() => {
            const a = document.createElement("a");
            a.href = URL.createObjectURL(
              new Blob([localStorage.getItem("fc27-war-room-v1") || "{}"], {
                type: "application/json",
              }),
            );
            a.download = "fc27-recovery.json";
            a.click();
          }}
        >
          Download recovery backup
        </button>
        <button onClick={() => location.reload()}>Reload</button>
      </div>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
