import { useCallback, useEffect, useState } from "react";
import { ProfileForm } from "./components/forms/ProfileForm";
import { PlanOverview } from "./components/plan/PlanOverview";
import { PlanTabs } from "./components/plan/PlanTabs";
import { PlanHistory } from "./components/plan/PlanHistory";
import { Button } from "./components/ui/button";
import { createOrUpdateUser, fetchPlans, requestPlanGeneration } from "./lib/api";
import type { PlanRecord, UserProfilePayload, WeeklyPlanResponse } from "./types";
import { Loader2, RefreshCw } from "lucide-react";
import "./index.css";

type DisplayedPlan = {
  plan: PlanRecord;
  macros?: WeeklyPlanResponse["macros"];
};

function App() {
  const [userId, setUserId] = useState<string>();
  const [activePlan, setActivePlan] = useState<DisplayedPlan>();
  const [history, setHistory] = useState<PlanRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async (id: string) => {
    const plans = await fetchPlans(id);
    setHistory(plans);
  }, []);

  useEffect(() => {
    if (userId) {
      loadHistory(userId).catch((err) => console.error(err));
    }
  }, [userId, loadHistory]);

  const handleProfileSubmit = async (payload: UserProfilePayload) => {
    setError(null);
    setIsLoading(true);
    try {
      const user = await createOrUpdateUser(payload);
      setUserId(user.id);
      const planResponse = await requestPlanGeneration(user.id);
      setActivePlan(planResponse);
      await loadHistory(user.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to generate plan";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!userId) return;
    setError(null);
    setIsLoading(true);
    try {
      const planResponse = await requestPlanGeneration(userId);
      setActivePlan(planResponse);
      await loadHistory(userId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to generate plan";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 px-4">
      <main className="mx-auto max-w-6xl space-y-6 py-10">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
          <div>
            <h1 className="text-3xl font-semibold">Agent-based fitness meal planner</h1>
            <p className="text-sm text-muted-foreground">
              Personalised, budget-aware meal plans powered by LangChain agents + Ollama.
            </p>
          </div>
          {userId && (
            <Button onClick={handleRegenerate} disabled={isLoading} className="flex items-center gap-2">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Regenerate plan
            </Button>
          )}
        </header>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]">
          <div className="space-y-6">
            <PlanOverview plan={activePlan} isGenerating={isLoading} />
            <PlanTabs plan={activePlan} />
          </div>
          <div className="space-y-6">
            <ProfileForm isSubmitting={isLoading} onSubmit={handleProfileSubmit} />
            <PlanHistory history={history} onSelect={(item) => setActivePlan({ plan: item })} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
