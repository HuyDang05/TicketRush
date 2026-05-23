// Purpose: Controller nhan request HTTP, goi service/Prisma va chuan hoa response cho API.
const prisma = require('../config/prisma');
const cloudinary = require('../config/cloudinary');
const { validateImageFile } = require('../utils/imageValidation.util');

const ALLOWED_EVENT_STATUSES = ['PUBLISHED', 'ENDED'];

const uploadReviewImage = async (file) => {
  if (!file) return null;

  const validation = validateImageFile(file);
  if (!validation.valid) {
    const error = new Error(validation.message);
    error.statusCode = 400;
    throw error;
  }

  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'ticketrush/reviews',
        transformation: [
          { width: 1280, height: 720, crop: 'fill', quality: 'auto', fetch_format: 'auto' },
        ],
      },
      (error, uploadResult) => {
        if (error) reject(error);
        else resolve(uploadResult);
      }
    );
    stream.end(file.buffer);
  });

  return result?.secure_url || null;
};

const toPublicComment = (comment) => {
  if (!comment) return null;

  return {
    id: comment.id,
    rating: comment.rating,
    text: comment.text,
    imageUrl: comment.imageUrl,
    createdAt: comment.createdAt,
    user: comment.user
      ? {
          id: comment.user.id,
          name: comment.user.fullName,
          avatar: comment.user.avatarUrl,
        }
      : null,
  };
};

const getEventComments = async (req, res) => {
  try {
    const { id: eventId } = req.params;

    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        status: { in: ALLOWED_EVENT_STATUSES },
      },
      select: { id: true },
    });

    if (!event) {
      return res.status(404).json({ message: 'Sự kiện không tồn tại hoặc chưa được công khai' });
    }

    const comments = await prisma.comment.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return res.status(200).json({
      comments: comments.map(toPublicComment),
    });
  } catch (error) {
    console.error('[Comment][getEventComments] Error:', error);
    return res.status(500).json({ message: 'Đã có lỗi xảy ra' });
  }
};

const createEventComment = async (req, res) => {
  try {
    const { id: eventId } = req.params;
    const userId = req.user.id;
    const { rating, text } = req.body || {};

    const normalizedRating = Number(rating);
    if (!normalizedRating || normalizedRating < 1 || normalizedRating > 5) {
      return res.status(400).json({ message: 'Đánh giá phải từ 1 đến 5 sao' });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Nội dung đánh giá không được để trống' });
    }

    if (text.trim().length > 1000) {
      return res.status(400).json({ message: 'Nội dung đánh giá tối đa 1000 ký tự' });
    }

    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        status: { in: ALLOWED_EVENT_STATUSES },
      },
      select: { id: true },
    });

    if (!event) {
      return res.status(404).json({ message: 'Sự kiện không tồn tại hoặc chưa được công khai' });
    }

    const imageUrl = await uploadReviewImage(req.file);

    const comment = await prisma.comment.create({
      data: {
        eventId,
        userId,
        rating: normalizedRating,
        text: text.trim(),
        imageUrl,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return res.status(201).json({
      message: 'Gửi đánh giá thành công',
      comment: toPublicComment(comment),
    });
  } catch (error) {
    console.error('[Comment][createEventComment] Error:', error);
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Đã có lỗi xảy ra' });
  }
};

module.exports = {
  getEventComments,
  createEventComment,
};
