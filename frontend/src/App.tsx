import { useEffect, useState } from "react";
import "./App.css";
import CsvUploader from "./components/CsvUploader";
import StepTimeline from "./components/StepTimeline";
import InsightsPanel from "./components/InsightsPanel";
import TraceViewer from "./components/TraceViewer";
import { useAnalyze, PIPELINE_META } from "./hooks/useAnalyze";
import type { StepKey } from "./types/api";

const SAMPLE_CSV = `date,description,amount
2025-10-01,Salary,1200.00
2025-10-02,Tesco Superstore,-28.40
2025-10-03,Starbucks,-3.50
2025-10-04,Uber Trip,-12.80
2025-10-05,Netflix,-10.99
2025-10-06,Tesco Superstore,-22.10
2025-10-07,Starbucks,-4.00
2025-10-08,Uber Trip,-11.20`;

function App() {
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState<string | undefined>();
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [goal, setGoal] = useState(30);
  const [selectedStep, setSelectedStep] = useState<StepKey | null>(PIPELINE_META[0]?.key ?? null);
  const [showTrace, setShowTrace] = useState(false);
  const [slowMode, setSlowMode] = useState(false);

  const { analyze, status, response, steps, error } = useAnalyze();
  const canAnalyze = csvText.trim().length > 0;

  useEffect(() => {
    if (status === "processing") {
      const running = steps.find(step => step.status === "running");
      setSelectedStep(running?.key ?? PIPELINE_META[0]?.key ?? null);
    }
  }, [status, steps]);

  const handleCsvLoaded = (text: string, name?: string) => {
    setCsvText(text);
    setFileName(name);
  };

  const handleCsvEdited = (text: string) => {
    setCsvText(text);
    if (!text.trim()) setFileName(undefined);
  };

  const handleAnalyze = () => {
    if (!canAnalyze || status === "processing") return;
    setSelectedStep(PIPELINE_META[0]?.key ?? null);
    analyze({ csv: csvText, goal, period, delayMs: slowMode ? 1000 : 0 });
  };

  const handleLoadSample = () => {
    setCsvText(SAMPLE_CSV);
    setFileName("sample.csv");
  };

  const handleSelectStep = (key: StepKey) => {
    setSelectedStep(prev => (prev === key ? null : key));
  };

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>Walletwise Studio</h1>
          <p className="topbar__subtitle">Trace the agent pipeline from CSV upload through insights and coaching.</p>
        </div>
        <div className="topbar__actions">
          <button
            className="button button--toggle"
            type="button"
            aria-pressed={slowMode}
            onClick={() => setSlowMode(prev => !prev)}
          >
            {slowMode ? "Slow mode: on" : "Slow mode: off"}
          </button>
          {error && <span className="badge badge--error">Error: {error}</span>}
          {response && (
            <button
              className="button button--ghost"
              type="button"
              onClick={() => setShowTrace(prev => !prev)}
            >
              {showTrace ? "Hide raw JSON" : "Show raw JSON"}
            </button>
          )}
        </div>
      </header>

      <main className="layout">
        <div className="layout__left">
          <CsvUploader
            fileName={fileName}
            csvPreview={csvText}
            period={period}
            goal={goal}
            status={status}
            canAnalyze={canAnalyze}
            onCsvLoaded={handleCsvLoaded}
            onCsvEdited={handleCsvEdited}
            onPeriodChange={setPeriod}
            onGoalChange={setGoal}
            onAnalyze={handleAnalyze}
            onLoadSample={handleLoadSample}
          />

          <StepTimeline
            steps={steps}
            selectedStep={selectedStep}
            onSelectStep={handleSelectStep}
          />
        </div>

        <div className="layout__right">
          <InsightsPanel response={response} status={status} />
        </div>
      </main>

      <TraceViewer response={response} open={showTrace} />
    </div>
  );
}

export default App;
