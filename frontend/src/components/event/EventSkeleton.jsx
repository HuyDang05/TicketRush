export default function EventSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
      <div className="w-full h-48 bg-gray-300" />
      <div className="p-4">
        <div className="h-6 bg-gray-300 rounded mb-3 w-3/4" />
        <div className="h-4 bg-gray-300 rounded mb-2" />
        <div className="h-4 bg-gray-300 rounded mb-4 w-5/6" />
        <div className="h-4 bg-gray-300 rounded mb-4 w-1/2" />
        <div className="flex justify-between items-center">
          <div className="h-4 bg-gray-300 rounded w-1/3" />
          <div className="h-10 bg-gray-300 rounded w-1/4" />
        </div>
      </div>
    </div>
  );
}
