import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FiSettings } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { key: 'plans', label: 'Plans', to: '/plans' },
  { key: 'groceries', label: 'Groceries', to: '/groceries' },
  { key: 'recipes', label: 'Recipes', to: '/recipes' },
];

export function Sidebar() {
  const items = useMemo(() => navItems, []);
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex h-full flex-col p-5">
      <div className="mb-8 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-slate-900 text-white text-center leading-9 font-semibold">MP</div>
          <div>
            <div className="text-sm font-semibold text-slate-900">OverCooked</div>
            <div className="text-xs text-slate-500">AI-assisted</div>
          </div>
        </div>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            aria-label="Open settings"
            className="rounded-full p-2 text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-200"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <FiSettings size={18} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full z-10 mt-2 w-52 rounded-2xl border border-slate-200 bg-white shadow-xl">
              <Link
                to="/"
                className="block rounded-t-2xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setMenuOpen(false)}
              >
                Profile
              </Link>
              <Link
                to="/auth/set-password"
                className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setMenuOpen(false)}
              >
                Reset password
              </Link>
              <button
                type="button"
                onClick={() => {
                  logout();
                  setMenuOpen(false);
                  navigate('/auth/login');
                }}
                className="block w-full rounded-b-2xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                Log out
              </button>
            </div>
          )}
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
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
