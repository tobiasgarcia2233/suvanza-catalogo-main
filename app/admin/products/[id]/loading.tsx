export default function Loading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div>
        <div className="h-3 w-24 bg-gray-200 rounded" />
        <div className="h-7 w-56 bg-gray-200 rounded mt-2" />
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="h-5 w-40 bg-gray-200 rounded mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-5 h-40" />
      <div className="bg-white border border-gray-200 rounded-lg p-5 h-40" />
    </div>
  );
}
