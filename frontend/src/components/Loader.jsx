export default function Loader({ label = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center py-10 text-slate-500 text-sm">
      <div className="animate-spin h-5 w-5 border-2 border-brand-600 border-t-transparent rounded-full mr-2" />
      {label}
    </div>
  );
}
