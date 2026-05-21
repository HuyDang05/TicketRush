const { imageSize } = require('image-size');

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['jpg', 'png', 'webp'];

const getMagicType = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';

  return null;
};

const dimensionRules = {
  banner: { width: 1280, height: 720, label: 'Ảnh banner' },
  card: { width: 720, height: 958, label: 'Ảnh card' },
};

const validateImageFile = (file, type) => {
  if (!file) {
    return { valid: false, message: 'Không có file ảnh được gửi lên' };
  }

  if (!file.buffer || file.buffer.length === 0) {
    return { valid: false, message: 'File ảnh rỗng' };
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return { valid: false, message: 'File ảnh tối đa 10 MB' };
  }

  const magicType = getMagicType(file.buffer);
  if (!magicType || !ALLOWED_IMAGE_TYPES.includes(magicType)) {
    return { valid: false, message: 'Chỉ chấp nhận ảnh JPG, PNG hoặc WebP hợp lệ' };
  }

  let dimensions;
  try {
    dimensions = imageSize(file.buffer);
  } catch (_error) {
    return { valid: false, message: 'Không đọc được kích thước ảnh' };
  }

  const rule = dimensionRules[type];
  if (rule && (dimensions.width !== rule.width || dimensions.height !== rule.height)) {
    return {
      valid: false,
      message: `${rule.label} phải có kích thước ${rule.width}x${rule.height}px`,
    };
  }

  return {
    valid: true,
    type: magicType,
    width: dimensions.width,
    height: dimensions.height,
  };
};

module.exports = {
  validateImageFile,
};
