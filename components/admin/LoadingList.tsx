export default function LoadingList({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 bg-gray-200 rounded" />
        <div className="h-9 w-36 bg-gray-200 rounded" />
      </div>
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 h-9" />
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 h-14 border-b border-gray-100 last:border-0 px-4"
          >
            <div className="w-10 h-10 bg-gray-200 rounded" />
            <div className="h-3 w-48 bg-gray-200 rounded" />
            <div className="h-3 w-24 bg-gray-200 rounded ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
