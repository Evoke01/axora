export function InfoCard({ title, value, compact = false }: { title: string; value: string; compact?: boolean }) {
  return (
    <div className={`info-card${compact ? " compact" : ""}`}>
      <span>{title}</span>
      <div>
        <input readOnly value={value} />
        <button type="button" onClick={() => navigator.clipboard.writeText(value)}>
          Copy
        </button>
      </div>
    </div>
  );
}
