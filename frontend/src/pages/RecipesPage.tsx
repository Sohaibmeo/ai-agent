import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchRecipes } from '../api/recipes';
import { DEMO_USER_ID } from '../lib/config';

export function RecipesPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const { data: recipes, isLoading } = useQuery({
    queryKey: ['recipes', debouncedSearch],
    queryFn: () => fetchRecipes({ userId: DEMO_USER_ID, search: debouncedSearch }),
  });

  return (
    <div className="relative flex h-full flex-col px-4 py-4 sm:px-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Your recipes</h1>
          <p className="text-xs text-slate-500">Browse, search and create recipes you can reuse in your plans.</p>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search recipes by name or ingredient…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      <div className="flex-1 overflow-auto pb-16">
        {isLoading ? (
          <p className="text-xs text-slate-500">Loading recipes…</p>
        ) : !recipes || recipes.length === 0 ? (
          <div className="mt-8 flex flex-col items-center text-center text-slate-500">
            <p className="text-sm font-medium">No recipes yet</p>
            <p className="mt-1 text-xs">Use the + button to create your first recipe.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.map((recipe: any) => (
              <button
                key={recipe.id}
                type="button"
                onClick={() => navigate(`/recipes/${recipe.id}`)}
                className="flex flex-col items-start rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm hover:border-emerald-400 hover:shadow-md"
              >
                {recipe.image_url && (
                  <img src={recipe.image_url} alt={recipe.name} className="mb-2 h-28 w-full rounded-lg object-cover" />
                )}
                <h2 className="text-sm font-semibold text-slate-900">{recipe.name}</h2>
                {recipe.instructions && (
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">{recipe.instructions}</p>
                )}
                {(recipe.base_kcal || recipe.base_protein) && (
                  <p className="mt-2 text-[11px] text-slate-500">
                    {recipe.base_kcal && `${Math.round(recipe.base_kcal)} kcal`}
                    {recipe.base_kcal && recipe.base_protein ? ' · ' : ''}
                    {recipe.base_protein && `${Math.round(recipe.base_protein)} g protein`}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="fixed bottom-5 right-5">
        <button
          type="button"
          onClick={() => navigate('/recipes/new')}
          className="flex h-11 items-center gap-2 rounded-full bg-emerald-600 px-4 text-sm font-medium text-white shadow-lg hover:bg-emerald-700"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/80 text-xs">+</span>
          <span>New recipe</span>
        </button>
      </div>
    </div>
  );
}
