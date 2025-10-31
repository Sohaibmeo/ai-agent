import { useMemo } from "react";
import type { AnalyzeResponse } from "../types/api";

type TraceViewerProps = {
  response: AnalyzeResponse | null;
  open: boolean;
};

const TraceViewer = ({ response, open }: TraceViewerProps) => {
  const json = useMemo(() => {
    if (!response) return "";
    return JSON.stringify(response, null, 2);
  }, [response]);

  if (!response) return null;

  return (
    <div className={`drawer ${open ? "drawer--open" : ""}`}>
      <div className="drawer__content">
        <header className="drawer__header">
          <h3>Raw payload</h3>
          <p>Reference JSON returned by the backend (includes trace when verbose).</p>
        </header>
        <pre className="drawer__code">
          {json}
        </pre>
      </div>
    </div>
  );
};

export default TraceViewer;
