const cloudinary = require('../config/cloudinary');

/**
 * POST /api/admin/upload
 * Nhận 1 file ảnh (field name: "image"), upload lên Cloudinary
 * Trả về: { url, publicId }
 */
const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Không có file ảnh được gửi lên' });
    }

    // Upload buffer lên Cloudinary
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'ticketrush/events',
          transformation: [
            { width: 1280, height: 720, crop: 'fill', quality: 'auto', fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    return res.status(200).json({
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    console.error('[Upload][uploadImage] Error:', error);
    return res.status(500).json({ message: 'Upload ảnh thất bại: ' + error.message });
  }
};

module.exports = { uploadImage };
