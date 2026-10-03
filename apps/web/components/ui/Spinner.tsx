export function Spinner({ label = "Chargement…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 p-8 text-slate-600">
      <span
        aria-hidden="true"
        className="size-6 animate-spin rounded-full border-2 border-slate-300 border-t-brand-700"
      />
      <span className="text-sm">{label}</span>
    </div>
  );
}
