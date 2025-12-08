import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppShell } from './components/layout/AppShell';
import { Sidebar } from './components/layout/Sidebar';
import { ProfilePage } from './pages/ProfilePage';
import { PlansPage } from './pages/PlansPage';
import { GroceriesPage } from './pages/GroceriesPage';
import { RecipeDetailPage } from './pages/RecipeDetailPage';
import { RecipesPage } from './pages/RecipesPage';
import { AgentPipelineProvider } from './hooks/useAgentPipeline';
import { AgentPipelineModal } from './components/agents/AgentPipelineModal';
import { ExplainBotWidget } from './components/agents/ExplainBotWidget';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { useAuth } from './context/AuthContext';

function App() {
  const { loading } = useAuth();
  if (loading) {
    return <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center">Loading...</div>;
  }
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AgentPipelineProvider>
        <Routes>
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route
            path="/*"
            element={
              <AppShell sidebar={<Sidebar />}>
                <Routes>
                  <Route path="/" element={<ProfilePage />} />
                  <Route path="/plans" element={<PlansPage />} />
                  <Route path="/plans/meal/:mealId" element={<RecipeDetailPage />} />
                  <Route path="/groceries" element={<GroceriesPage />} />
                  <Route path="/recipes" element={<RecipesPage />} />
                  <Route path="/recipes/new" element={<RecipeDetailPage />} />
                  <Route path="/recipes/:recipeId" element={<RecipeDetailPage />} />
                </Routes>
              </AppShell>
            }
          />
        </Routes>
        <AgentPipelineModal />
        <ExplainBotWidget />
        <Toaster position="top-right" toastOptions={{ className: 'text-sm' }} />
      </AgentPipelineProvider>
    </div>
  );
}

export default App;
