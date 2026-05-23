// Purpose: Component UI dung de hien thi danh sach va thong tin su kien.
import { Search } from 'lucide-react';

export default function EmptyState({ searchQuery }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Search className="w-16 h-16 text-gray-300 mb-4" />
      <h3 className="text-2xl font-semibold text-gray-700 mb-2">
        {searchQuery ? 'Không tìm thấy sự kiện' : 'Không có sự kiện nào'}
      </h3>
      <p className="text-gray-500 mb-6">
        {searchQuery 
          ? `Không có sự kiện nào phù hợp với từ khóa "${searchQuery}"`
          : 'Hiện tại chưa có sự kiện nào. Vui lòng quay lại sau!'}
      </p>
    </div>
  );
}
