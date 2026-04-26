export default function ZoneLegend() {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h3 className="font-bold mb-4">Chú thích</h3>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded bg-blue-400"></div>
          <span>Còn trống</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded bg-yellow-400"></div>
          <span>Đang giữ</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded bg-red-400"></div>
          <span>Đã bán</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded bg-green-500"></div>
          <span>Đã chọn</span>
        </div>
      </div>
    </div>
  );
}
