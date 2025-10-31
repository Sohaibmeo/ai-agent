import { useRef, useState } from "react";
import type { RunStatus } from "../hooks/useAnalyze";

type CsvUploaderProps = {
  fileName?: string;
  csvPreview: string;
  period: "week" | "month";
  goal: number;
  status: RunStatus;
  canAnalyze: boolean;
  onCsvLoaded: (csv: string, fileName?: string) => void;
  onCsvEdited: (csv: string) => void;
  onPeriodChange: (period: "week" | "month") => void;
  onGoalChange: (goal: number) => void;
  onAnalyze: () => void;
  onLoadSample: () => void;
};

function normaliseNewlines(text: string) {
  return text.replace(/\r\n/g, "\n");
}

const CsvUploader = ({
  fileName,
  csvPreview,
  period,
  goal,
  status,
  canAnalyze,
  onCsvLoaded,
  onCsvEdited,
  onPeriodChange,
  onGoalChange,
  onAnalyze,
  onLoadSample,
}: CsvUploaderProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setDragging] = useState(false);

  const handleFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      onCsvLoaded(normaliseNewlines(result), file.name);
    };
    reader.readAsText(file);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    handleFile(file);
    event.target.value = "";
  };

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0] ?? null;
    handleFile(file);
  };

  const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
  };

  const firstPreviewLines = csvPreview
    .trim()
    .split("\n")
    .slice(0, 6)
    .join("\n");

  const busy = status === "processing";
  const dropClasses = ["dropzone"];
  if (isDragging) dropClasses.push("dropzone--active");

  return (
    <section className="panel">
      <header className="panel__header">
        <div>
          <h2>Input</h2>
          <p className="panel__subtitle">Upload a CSV or paste it directly to analyse your spend.</p>
        </div>
        <button className="button button--ghost" type="button" onClick={onLoadSample}>
          Use sample
        </button>
      </header>

      <div className="uploader">
        <div className="uploader__controls">
          <label
            className={dropClasses.join(" ")}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              hidden
            />
            <span className="dropzone__icon">📄</span>
            <div>
              <strong>{isDragging ? "Release to upload" : "Drag & drop CSV"}</strong>
              <p className="dropzone__hint">or <button className="link" type="button" onClick={() => fileInputRef.current?.click()}>browse files</button></p>
              {fileName && <p className="dropzone__file">{fileName}</p>}
            </div>
          </label>

          <div className="form-grid">
            <label className="form-field">
              <span>Period</span>
              <select value={period} onChange={event => onPeriodChange(event.target.value as "week" | "month")} disabled={busy}>
                <option value="week">Week (last 7 days)</option>
                <option value="month">Month (last 30 days)</option>
              </select>
            </label>
            <label className="form-field">
              <span>Goal (£)</span>
              <input
                type="number"
                min={0}
                step={1}
                value={goal}
                onChange={event => onGoalChange(Number(event.target.value) || 0)}
                disabled={busy}
              />
            </label>
          </div>
        </div>

        <label className="form-field form-field--textarea">
          <span>Preview / paste CSV</span>
          <textarea
            value={csvPreview}
            onChange={event => onCsvEdited(event.target.value)}
            placeholder="date,description,amount"
            rows={8}
            spellCheck={false}
          />
          {firstPreviewLines && (
            <small className="form-hint">
              Showing first {firstPreviewLines.split("\n").length} lines
            </small>
          )}
        </label>
      </div>

      <footer className="panel__footer">
        <button
          className="button"
          type="button"
          onClick={onAnalyze}
          disabled={!canAnalyze || busy}
        >
          {busy ? "Analysing…" : "Run analysis"}
        </button>
      </footer>
    </section>
  );
};

export default CsvUploader;
