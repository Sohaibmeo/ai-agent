import { NavLink } from 'react-router-dom';
import { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { key: 'profile', label: 'Profile', to: '/' },
  { key: 'plans', label: 'Plans', to: '/plans' },
  { key: 'groceries', label: 'Groceries', to: '/groceries' },
  { key: 'recipes', label: 'Recipes', to: '/recipes' },
];

export function Sidebar() {
  const items = useMemo(() => navItems, []);
  const { user, logout } = useAuth();
  return (
    <div className="flex h-full flex-col justify-between p-4">
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
            <NavLink
              key={item.key}
              to={item.to}
              className={({ isActive }) =>
                [
                  'block w-full rounded-lg px-3 py-2 text-left text-sm font-medium',
                  isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100',
                ].join(' ')
              }
              end={item.to === '/'}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="space-y-3">
        {user && (
          <button
            onClick={logout}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Log out
          </button>
        )}
        <div className="text-xs text-slate-500">V2 Demo</div>
      </div>
    </div>
  );
}
