import type { ReactNode } from 'react';

interface AppShellProps {
  sidebar: ReactNode;
  children: ReactNode;
}

export function AppShell({ sidebar, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-neutralBg">
      <aside className="w-64 shrink-0 border-r border-slate-200 bg-white h-screen sticky top-0 overflow-hidden">
        {sidebar}
      </aside>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
