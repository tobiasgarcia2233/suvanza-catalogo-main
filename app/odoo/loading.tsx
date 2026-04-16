export default function Loading() {
  return (
    <div className="mx-auto p-8 max-w-6xl animate-pulse">
      <div className="h-8 w-56 bg-gray-200 rounded mb-2" />
      <div className="h-3 w-96 bg-gray-200 rounded mb-6" />
      <div className="h-12 bg-gray-100 rounded mb-4" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-white border border-gray-200 rounded-lg h-32 mb-3"
        />
      ))}
    </div>
  );
}
