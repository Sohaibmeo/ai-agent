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

function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AgentPipelineProvider>
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
        <AgentPipelineModal />
        <Toaster position="top-right" toastOptions={{ className: 'text-sm' }} />
      </AgentPipelineProvider>
    </div>
  );
}

export default App;
