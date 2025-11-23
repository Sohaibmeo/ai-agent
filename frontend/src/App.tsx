import { Routes, Route } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { Sidebar } from './components/layout/Sidebar';
import { ProfilePage } from './pages/ProfilePage';
import { PlansPage } from './pages/PlansPage';
import { GroceriesPage } from './pages/GroceriesPage';

function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AppShell sidebar={<Sidebar />}>
        <Routes>
          <Route path="/" element={<ProfilePage />} />
          <Route path="/plans" element={<PlansPage />} />
          <Route path="/groceries" element={<GroceriesPage />} />
        </Routes>
      </AppShell>
    </div>
  );
}

export default App;
