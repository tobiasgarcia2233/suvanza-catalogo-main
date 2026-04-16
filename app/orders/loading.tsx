export default function Loading() {
  return (
    <div className="mx-auto p-8 max-w-7xl animate-pulse">
      <div className="mb-8">
        <div className="h-8 w-64 bg-gray-200 rounded" />
        <div className="h-3 w-72 bg-gray-200 rounded mt-2" />
      </div>
      <div className="h-12 bg-gray-100 rounded mb-6" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="bg-white border border-gray-200 rounded-lg h-20 mb-3"
        />
      ))}
    </div>
  );
}
