import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchRecipes } from '../api/recipes';
import { DEMO_USER_ID } from '../lib/config';
import { Card } from '../components/shared/Card';
import { generateRecipeAi } from '../api/recipes';
import { useLlmAction } from '../hooks/useLlmAction';

export function RecipesPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [aiNote, setAiNote] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAiForm, setShowAiForm] = useState(false);
  const { runWithLlmLoader } = useLlmAction({
    kind: 'generic-llm',
    title: 'Creating your recipe with AI...',
    subtitle: 'Drafting ingredients and steps based on your description.',
  });

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
          onClick={() => setShowCreateModal(true)}
          className="flex h-11 items-center gap-2 rounded-full bg-emerald-600 px-4 text-sm font-medium text-white shadow-lg hover:bg-emerald-700"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/80 text-xs">+</span>
          <span>New recipe</span>
        </button>
      </div>

      {showCreateModal && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
          onClick={() => {
            if (isGenerating) return;
            setShowCreateModal(false);
            setShowAiForm(false);
            setAiNote('');
          }}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {showAiForm ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-xs uppercase text-slate-500">Describe with AI</div>
                    <h2 className="text-lg font-semibold text-slate-900">Tell us about the recipe</h2>
                  </div>
                  <button
                    className="text-slate-500 hover:text-slate-800 disabled:opacity-50"
                    disabled={isGenerating}
                    onClick={() => setShowAiForm(false)}
                  >
                    ✕
                  </button>
                </div>
                <div className="space-y-3">
                  <textarea
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-200 min-h-[140px]"
                    placeholder="High-protein veggie lunch, under £5, quick to cook..."
                    value={aiNote}
                    onChange={(e) => setAiNote(e.target.value)}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                    disabled={isGenerating}
                    onClick={() => {
                      setAiNote('');
                      setShowAiForm(false);
                    }}
                  >
                      Cancel
                    </button>
                    <button
                    className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                    onClick={async () => {
                      const note = aiNote.trim();
                      if (!note) {
                        setShowCreateModal(false);
                          navigate('/recipes/new');
                          return;
                      }
                      try {
                        setIsGenerating(true);
                        const created = await runWithLlmLoader(() =>
                          generateRecipeAi({ userId: DEMO_USER_ID, note }),
                        );
                        setShowCreateModal(false);
                        setShowAiForm(false);
                        setAiNote('');
                        navigate(`/recipes/${created.id}`);
                      } catch (e) {
                          setShowCreateModal(false);
                          setShowAiForm(false);
                          navigate('/recipes/new');
                        } finally {
                          setIsGenerating(false);
                        }
                      }}
                      disabled={isGenerating}
                    >
                      {isGenerating ? 'Generating...' : 'Create with AI'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase text-slate-500">New recipe</div>
                    <h2 className="text-lg font-semibold text-slate-900">How would you like to start?</h2>
                  </div>
                  <button
                    className="text-slate-500 hover:text-slate-800 disabled:opacity-50"
                    disabled={isGenerating}
                    onClick={() => {
                      setShowCreateModal(false);
                      setShowAiForm(false);
                      setAiNote('');
                    }}
                  >
                    ✕
                  </button>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <Card className="p-4 flex flex-col gap-3">
                    <div className="text-sm font-semibold text-slate-900">From an image</div>
                    <p className="text-xs text-slate-500">Upload a dish photo and let AI draft the recipe.</p>
                    <button
                      className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 cursor-not-allowed"
                      title="Coming soon"
                      disabled
                    >
                      Coming soon
                    </button>
                  </Card>
                  <Card className="p-4 flex flex-col gap-3">
                    <div className="text-sm font-semibold text-slate-900">Describe with AI</div>
                    <p className="text-xs text-slate-500">Type a short description and we will build it.</p>
                    <button
                      className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                      onClick={() => setShowAiForm(true)}
                    >
                      Create with AI
                    </button>
                  </Card>
                  <Card className="p-4 flex flex-col gap-3">
                    <div className="text-sm font-semibold text-slate-900">Create from scratch</div>
                    <p className="text-xs text-slate-500">Start with a blank recipe and fill in details.</p>
                    <button
                      className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                      onClick={() => {
                        setShowCreateModal(false);
                        navigate('/recipes/new');
                      }}
                    >
                      Start blank
                    </button>
                  </Card>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
