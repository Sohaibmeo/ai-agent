import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import { FiSettings } from 'react-icons/fi';

const navItems = [
  { key: 'plans', label: 'Plans', to: '/plans' },
  { key: 'groceries', label: 'Groceries', to: '/groceries' },
  { key: 'recipes', label: 'Recipes', to: '/recipes' },
];

export function Sidebar() {
  const items = useMemo(() => navItems, []);
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <div className="flex h-full flex-col p-5">
      <div className="mb-8 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-slate-900 text-white text-center leading-9 font-semibold">MP</div>
          <div>
            <div className="text-sm font-semibold text-slate-900">Meal Planner</div>
            <div className="text-xs text-slate-500">AI-assisted</div>
          </div>
        </div>
        <button
          type="button"
          aria-label="Open settings"
          className="rounded-full p-2 text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-200"
          onClick={() => {
            if (location.pathname !== '/') navigate('/');
          }}
          title="Profile settings"
        >
          <FiSettings size={18} />
        </button>
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
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
