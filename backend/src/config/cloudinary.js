const cloudinary = require('cloudinary').v2;

// CLOUDINARY_URL env var được tự động đọc bởi SDK nếu đặt đúng tên
// Nhưng để chắc chắn, parse thủ công nếu cần
if (!process.env.CLOUDINARY_URL) {
  console.warn('[Cloudinary] CLOUDINARY_URL không tìm thấy trong .env');
} else {
  cloudinary.config({ cloudinary_url: process.env.CLOUDINARY_URL });
  console.log('[Cloudinary] Đã khởi tạo thành công');
}

module.exports = cloudinary;
