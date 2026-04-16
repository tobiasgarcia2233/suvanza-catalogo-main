export default function Loading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="h-7 w-48 bg-gray-200 rounded" />
      <div className="bg-white border border-gray-200 rounded-lg p-5 h-48" />
      <div className="bg-white border border-gray-200 rounded-lg p-5 h-40" />
    </div>
  );
}
