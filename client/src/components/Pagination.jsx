export default function Pagination({ page, pages, onChange }) {
  if (!pages || pages <= 1) return null;
  const btn = 'px-3.5 py-2 rounded-lg text-sm font-semibold border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer disabled:cursor-default';
  return (
    <div className="flex items-center justify-center gap-3 mt-6">
      <button className={btn} disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</button>
      <span className="text-sm text-slate-500">Page {page} of {pages}</span>
      <button className={btn} disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</button>
    </div>
  );
}
