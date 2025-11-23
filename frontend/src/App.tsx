import { AppShell } from './components/layout/AppShell';
import { Sidebar } from './components/layout/Sidebar';

function App() {
  return (
    <div className="min-h-screen bg-neutralBg text-slate-900">
      <AppShell sidebar={<Sidebar />}>
        <div className="p-6 text-sm text-slate-600">Start building screens here.</div>
      </AppShell>
    </div>
  );
}

export default App;
