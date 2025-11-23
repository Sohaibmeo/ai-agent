export function PlansPage() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Plans</h1>
        <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
          Generate New Week
        </button>
      </div>
      <p className="mt-2 text-sm text-slate-600">Current plan and swaps will appear here.</p>
    </div>
  );
}
