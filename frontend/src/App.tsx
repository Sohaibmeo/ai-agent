import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import type { ReactElement } from 'react';
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
import { OnboardingPage } from './pages/OnboardingPage';
import { SignupPage } from './pages/SignupPage';
import { SetPasswordPage } from './pages/SetPasswordPage';
import { useAuth } from './context/AuthContext';

function Protected({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  if (!user) {
    return <Navigate to="/auth/login" replace state={{ from: location }} />;
  }
  if (!user.hasProfile && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }
  return children;
}

function PublicRoute({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  if (user) {
    const redirect = user.hasProfile ? '/plans' : '/onboarding';
    return <Navigate to={redirect} replace state={{ from: location }} />;
  }
  return children;
}

function App() {
  const { loading, user } = useAuth();
  if (loading) {
    return <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center">Loading...</div>;
  }
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AgentPipelineProvider>
        <Routes>
          <Route
            path="/auth/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path="/auth/signup"
            element={
              <PublicRoute>
                <SignupPage />
              </PublicRoute>
            }
          />
          <Route path="/auth/set-password" element={<SetPasswordPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route
            path="/*"
            element={
              <Protected>
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
              </Protected>
            }
          />
        </Routes>
        <AgentPipelineModal />
        {user && <ExplainBotWidget />}
        <Toaster position="top-right" toastOptions={{ className: 'text-sm' }} />
      </AgentPipelineProvider>
    </div>
  );
}

export default App;
