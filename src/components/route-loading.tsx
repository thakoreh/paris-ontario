export function RouteLoading({ label = "Finding your local updates…" }: { label?: string }) {
  return (
    <div className="page-wrap" role="status" aria-live="polite">
      <span className="eyebrow">PARIS PULSE</span>
      <h1>{label}</h1>
    </div>
  );
}
