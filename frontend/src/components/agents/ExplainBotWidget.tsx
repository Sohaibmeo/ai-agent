import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { explainChat } from '../../api/agents';
import { notify } from '../../lib/toast';
import { useAuth } from '../../context/AuthContext';

type ChatMessage = { id: string; role: 'user' | 'bot' | 'error'; text: string };

const OverCookedIcon = ({ pulse }: { pulse?: boolean }) => {
  const floatStyle = pulse ? { animation: 'bot-float 4s ease-in-out infinite' } : undefined;
  const stroke = '#b57a3d';
  return (
    <div className="relative h-14 w-14" style={floatStyle} aria-hidden="true">
      <div className="absolute inset-0 rounded-2xl bg-white shadow-[0_10px_25px_rgba(0,0,0,0.12)]" />
      <svg viewBox="0 0 120 120" className="absolute inset-2">
        <g fill="none" stroke={stroke} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M32 50c-6 0-11-5-11-11s5-11 11-11c1.5 0 3 .3 4.3.9C37.4 23 43 18 49.7 18c5.5 0 10.3 3.2 12.6 7.8C64.4 23.2 69.2 20 74.7 20 83 20 90 27 90 35.3 90 41 86.7 46 81.8 48.5"
            fill="none"
          />
          <rect x="28" y="50" width="64" height="44" rx="18" ry="18" fill="white" />
          <path d="M28 66h-8" />
          <path d="M20 66h-8" />
          <path d="M92 66h8" />
          <path d="M100 66h8" />
          <circle cx="48" cy="68" r="4" fill={stroke} />
          <circle cx="72" cy="68" r="4" fill={stroke} />
          <path d="M36 50c0-9 7-16 16-16h16c9 0 16 7 16 16" />
          <path d="M20 62l-10 4" />
          <path d="M100 62l10 4" />
          <path d="M18 78l-8 2" />
          <path d="M102 78l8 2" />
          <path d="M20 70l-8-2" />
          <path d="M100 70l8-2" />
        </g>
        <g fill={stroke}>
          <circle cx="48" cy="68" r="3" />
          <circle cx="72" cy="68" r="3" />
        </g>
      </svg>
      <div className="absolute -right-1 -top-2 h-3 w-3 rounded-full bg-amber-300 blur-[1px]" />
    </div>
  );
};

export function ExplainBotWidget() {
  const { user } = useAuth();
  const userId = user?.id;
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const renderInline = (text: string) => {
    const parts: (string | ReactNode)[] = [];
    const regex = /\*\*(.+?)\*\*/g;
    let last = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > last) {
        parts.push(text.slice(last, match.index));
      }
      parts.push(
        <strong key={`${match.index}-${match[1]}`} className="font-semibold">
          {match[1]}
        </strong>,
      );
      last = regex.lastIndex;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts;
  };

  const renderMessageContent = (text: string) => {
    const blocks = text.trim().split(/\n\s*\n/).filter(Boolean);
    const rendered = blocks.map((block, idx) => {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
      const allBullets = lines.length > 1 && lines.every((l) => /^[-•]/.test(l));
      const allNumbers = lines.length > 1 && lines.every((l) => /^\d+[.)]/.test(l));

      if (allBullets) {
        return (
          <ul key={`b-${idx}`} className="ml-4 list-disc space-y-1">
            {lines.map((l, i) => {
              const content = l.replace(/^[-•]\s*/, '');
              return <li key={`b-${idx}-l-${i}`}>{renderInline(content)}</li>;
            })}
          </ul>
        );
      }
      if (allNumbers) {
        return (
          <ol key={`o-${idx}`} className="ml-4 list-decimal space-y-1">
            {lines.map((l, i) => {
              const content = l.replace(/^\d+[.)]\s*/, '');
              return <li key={`o-${idx}-l-${i}`}>{renderInline(content)}</li>;
            })}
          </ol>
        );
      }

      // Headings like ### or ##
      if (lines.length === 1 && /^#{1,6}\s+/.test(lines[0])) {
        const content = lines[0].replace(/^#{1,6}\s+/, '');
        return (
          <p key={`h-${idx}`} className="font-semibold text-slate-900">
            {renderInline(content)}
          </p>
        );
      }

      return (
        <p key={`p-${idx}`} className="leading-snug">
          {lines.map((line, i) => (
            <span key={`p-${idx}-l-${i}`}>
              {renderInline(line)}
              {i < lines.length - 1 && <br />}
            </span>
          ))}
        </p>
      );
    });
    return rendered;
  };

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [open, messages]);

  const placeholder = useMemo(
    () => [
      'Ask about cooking steps, swaps, or dietary tweaks.',
      'e.g., “Why toast spices first?” or “How do I make this dairy-free?”',
    ].join(' '),
    [],
  );

  const send = async () => {
    if (!userId) {
      notify.error('Please sign in to chat.');
      return;
    }
    const text = input.trim();
    if (!text || sending) return;
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);
    try {
      const res = await explainChat({ message: text, userId });
      const botMsg: ChatMessage = { id: `b-${Date.now()}`, role: 'bot', text: res.reply };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const botMsg: ChatMessage = {
        id: `e-${Date.now()}`,
        role: 'error',
        text: 'Sorry, I could not answer right now.',
      };
      setMessages((prev) => [...prev, botMsg]);
      notify.error(err?.message || 'Explain agent failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <style>
        {`
        @keyframes bot-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}
      </style>
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
      <div className="fixed bottom-4 left-4 z-50">
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="group flex items-center gap-3 rounded-full border border-emerald-200 bg-white px-3 py-2 pr-4 shadow-[0_18px_30px_rgba(0,0,0,0.12)] transition hover:-translate-y-[1px] hover:shadow-[0_22px_36px_rgba(0,0,0,0.16)]"
          >
            <OverCookedIcon pulse />
            <div className="text-left">
              <div className="text-[11px] uppercase tracking-wide text-emerald-600 font-semibold">Explain agent</div>
              <div className="text-xs text-slate-700">Need a tip? Ask me.</div>
            </div>
            <span className="ml-1 text-lg text-emerald-600 group-hover:rotate-6 transition">↗</span>
          </button>
        )}

        {open && (
          <div
            className={`mt-3 rounded-3xl border border-emerald-400 bg-white shadow-[0_20px_40px_rgba(0,0,0,0.18)] ${
              expanded ? 'fixed inset-4 left-1/2 right-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-4xl' : 'w-[360px]'
            }`}
            style={expanded ? { inset: '1.5rem', left: '50%', transform: 'translateX(-50%)' } : undefined}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between rounded-t-3xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                  <OverCookedIcon />
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-emerald-100">Explain agent</div>
                  <div className="text-sm font-semibold">OverCooked is listening</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="rounded-full bg-white/15 px-2 py-1 text-xs font-semibold text-white hover:bg-white/25"
                  onClick={() => setExpanded((v) => !v)}
                >
                  {expanded ? '▢' : '⬜'}
                </button>
                <button
                  className="rounded-full bg-white/15 px-2 py-1 text-xs font-semibold text-white hover:bg-white/25"
                  onClick={() => setOpen(false)}
                >
                  ✕
                </button>
              </div>
            </div>
            <div
              className={`flex flex-col gap-2 overflow-y-auto px-3 py-3 ${
                expanded ? 'max-h-[70vh]' : 'max-h-[320px]'
              }`}
              ref={scrollRef}
            >
              {messages.length === 0 && (
                <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/60 px-3 py-3 text-xs text-slate-700">
                  {placeholder}
                </div>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[95%] md:max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow ${
                    m.role === 'user'
                      ? 'ml-auto bg-emerald-600 text-white shadow-emerald-500/30'
                      : m.role === 'error'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-emerald-50/80 text-slate-900 border border-emerald-100 shadow-emerald-200/40'
                  }`}
                >
                  {m.role === 'user' ? m.text : renderMessageContent(m.text)}
                </div>
              ))}
              {sending && (
                <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Thinking...
                </div>
              )}
            </div>
            <div className="border-t border-slate-200 px-3 py-3">
              <div className="flex items-end gap-2">
                <textarea
                  rows={2}
                  className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  placeholder="Ask me to explain a recipe step, substitution, or technique..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                />
                <button
                  className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={send}
                  disabled={sending || !input.trim()}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
