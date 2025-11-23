import { useMemo } from 'react';

const navItems = [
  { key: 'profile', label: 'Profile' },
  { key: 'plans', label: 'Plans' },
  { key: 'groceries', label: 'Groceries' },
];

export function Sidebar() {
  const items = useMemo(() => navItems, []);
  return (
    <div className="flex min-h-screen flex-col justify-between p-4">
      <div>
        <div className="mb-6 flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-slate-900 text-white text-center leading-9 font-semibold">MP</div>
          <div>
            <div className="text-sm font-semibold text-slate-900">Meal Planner</div>
            <div className="text-xs text-slate-500">AI-assisted</div>
          </div>
        </div>
        <nav className="space-y-1">
          {items.map((item) => (
            <button
              key={item.key}
              className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="text-xs text-slate-500">V2 Demo</div>
    </div>
  );
}
