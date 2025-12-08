import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchRecipes } from '../api/recipes';
import { DEMO_USER_ID } from '../lib/config';
import { Card } from '../components/shared/Card';
import { generateRecipeAi, generateRecipeFromImage } from '../api/recipes';
import { useAgentPipeline } from '../hooks/useAgentPipeline';

export function RecipesPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [aiNote, setAiNote] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAiForm, setShowAiForm] = useState(false);
  const [showImageForm, setShowImageForm] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { startRun, updateStep, endRun, setError } = useAgentPipeline();

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result?.toString() || '';
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
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
            setShowImageForm(false);
            setAiNote('');
            setImageFile(null);
            setImagePreview(null);
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
                      onClick={() => {
                        setShowAiForm(false);
                        setShowImageForm(false);
                      }}
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
                        const steps = [
                          { id: 'capture-note', label: 'Capturing your request', status: 'active' as const, progressHint: 10 },
                          { id: 'draft-recipe', label: 'Drafting recipe with AI', status: 'pending' as const, progressHint: 45 },
                          { id: 'build-ingredients', label: 'Building ingredients', status: 'pending' as const, progressHint: 75 },
                          { id: 'finishing', label: 'Finishing up', status: 'pending' as const, progressHint: 98 },
                        ];
                        startRun('generic-llm', {
                          title: 'Creating your recipe with AI...',
                          subtitle: 'Drafting ingredients and steps based on your description.',
                          steps,
                        });
                        updateStep('capture-note', 'done', undefined, undefined, 18);
                        updateStep('draft-recipe', 'active', 'Generating recipe draft...', undefined, 36);
                        const created = await generateRecipeAi({ userId: DEMO_USER_ID, note });
                        updateStep('draft-recipe', 'done', undefined, undefined, 64);
                        updateStep('build-ingredients', 'active', 'Resolving ingredients...', undefined, 82);
                        updateStep('build-ingredients', 'done', undefined, undefined, 92);
                        updateStep('finishing', 'active', 'Saving recipe...', undefined, 98);
                        updateStep('finishing', 'done', undefined, undefined, 100);
                        setTimeout(() => endRun(), 400);
                        setShowCreateModal(false);
                        setShowAiForm(false);
                        setAiNote('');
                        navigate(`/recipes/${created.id}`);
                      } catch (e) {
                        setError('Could not create recipe. Try again or start from scratch.');
                        setShowCreateModal(false);
                        setShowAiForm(false);
                        navigate('/recipes/new');
                        setTimeout(() => endRun(), 600);
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
            ) : showImageForm ? (
              <>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-xs uppercase text-slate-500">From an image</div>
                      <h2 className="text-lg font-semibold text-slate-900">Upload a photo of the dish</h2>
                    </div>
                    <button
                      className="text-slate-500 hover:text-slate-800 disabled:opacity-50"
                      disabled={isGenerating}
                      onClick={() => {
                        setShowAiForm(false);
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div className="w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {imagePreview ? (
                          <img src={imagePreview} alt="Preview" className="h-16 w-16 rounded-lg object-cover border" />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400">
                            📷
                          </div>
                        )}
                        <div className="text-sm text-slate-700">
                          {imageFile ? imageFile.name : 'Choose an image of your dish'}
                          <div className="text-xs text-slate-500">JPEG/PNG up to ~8MB</div>
                        </div>
                      </div>
                      <label className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setImageFile(file);
                            if (file) {
                              const previewUrl = URL.createObjectURL(file);
                              setImagePreview(previewUrl);
                            } else {
                              setImagePreview(null);
                            }
                          }}
                          disabled={isGenerating}
                        />
                        Upload image
                      </label>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                        disabled={isGenerating}
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview(null);
                          setShowAiForm(false);
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                        onClick={async () => {
                          if (!imageFile) return;
                          try {
                            setIsGenerating(true);
                            const steps = [
                              { id: 'upload', label: 'Reading image', status: 'active' as const, progressHint: 10 },
                              { id: 'vision', label: 'Describing dish', status: 'pending' as const, progressHint: 40 },
                              { id: 'draft-recipe', label: 'Drafting recipe with AI', status: 'pending' as const, progressHint: 70 },
                              { id: 'finishing', label: 'Saving recipe', status: 'pending' as const, progressHint: 95 },
                            ];
                            startRun('generic-llm', {
                              title: 'Creating your recipe from the photo...',
                              subtitle: 'Analyzing the image and drafting the recipe.',
                              steps,
                            });
                            updateStep('upload', 'done', undefined, undefined, 18);
                            updateStep('vision', 'active', 'Describing the dish...', undefined, 36);
                            const base64 = await fileToBase64(imageFile);
                            updateStep('vision', 'done', undefined, undefined, 58);
                            updateStep('draft-recipe', 'active', 'Drafting recipe...', undefined, 76);
                            const created = await generateRecipeFromImage({
                              userId: DEMO_USER_ID,
                              imageBase64: base64,
                            });
                            updateStep('draft-recipe', 'done', undefined, undefined, 86);
                            updateStep('finishing', 'active', 'Saving recipe...', undefined, 96);
                            updateStep('finishing', 'done', undefined, undefined, 100);
                            setTimeout(() => endRun(), 400);
                            setShowCreateModal(false);
                            setShowAiForm(false);
                            setImageFile(null);
                            setImagePreview(null);
                            setAiNote('');
                            navigate(`/recipes/${created.id}`);
                          } catch (e) {
                            setError('Could not create recipe from image. Try again or use AI text.');
                            setTimeout(() => endRun(), 600);
                            setShowCreateModal(false);
                            setShowAiForm(false);
                            setImageFile(null);
                            setImagePreview(null);
                            navigate('/recipes/new');
                          } finally {
                            setIsGenerating(false);
                          }
                        }}
                        disabled={isGenerating || !imageFile}
                      >
                        {isGenerating ? 'Processing...' : 'Create from image'}
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
                      setShowImageForm(false);
                      setAiNote('');
                      setImageFile(null);
                      setImagePreview(null);
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
                      className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                      onClick={() => setShowImageForm(true)}
                    >
                      Create from image
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
