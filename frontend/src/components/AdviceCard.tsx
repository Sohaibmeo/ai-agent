type AdviceCardProps = {
  advice: string;
};

const ICONS: Record<string, string> = {
  Goal: "🎯",
  Obstacle: "🚧",
  Action: "✅",
  "Backup action": "🛡️",
  "When/Where": "🗓️",
  "Why it helps": "💡",
};

const formatLine = (line: string) => line.trim().replace(/^-+\s*/, "");

const splitAdvice = (advice: string) => {
  return advice
    .split("\n")
    .map(formatLine)
    .filter(Boolean)
    .map(entry => {
      const [rawLabel, ...rest] = entry.split(":");
      const label = rawLabel?.trim() ?? "Note";
      const value = rest.join(":").trim();
      return { label, value };
    });
};

const AdviceCard = ({ advice }: AdviceCardProps) => {
  const entries = splitAdvice(advice);
  if (!entries.length) return null;

  return (
    <div className="advice-card">
      <header className="advice-card__header">
        <div>
          <h4>Coach Playbook</h4>
          <p>Personalised actions based on your latest spend.</p>
        </div>
        <span className="advice-card__badge">LLM coach</span>
      </header>

      <ul className="advice-card__list">
        {entries.map(({ label, value }) => (
          <li key={label} className="advice-card__item">
            <span className="advice-card__icon" aria-hidden>
              {ICONS[label] ?? "📝"}
            </span>
            <div>
              <strong>{label}</strong>
              <p>{value || "—"}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AdviceCard;
