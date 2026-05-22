const { z } = require('zod');
const {
  MAX_PRICE,
  dateString,
  nonEmptyTrimmedString,
  optionalHttpsUrl,
  optionalTrimmedString,
  paginationQuery,
  searchQuery,
} = require('./common.validator');

const futureDate = (field) =>
  dateString(field).refine((value) => new Date(value) > new Date(), `${field} phải trong tương lai`);

const eventDateFields = z.object({
  startDate: futureDate('Ngày bắt đầu').optional(),
  date: futureDate('Ngày bắt đầu').optional(),
  endDate: dateString('Ngày kết thúc').optional(),
});

const eventBase = z.object({
  title: nonEmptyTrimmedString('Tên sự kiện', 3, 150),
  description: optionalTrimmedString('Mô tả', 5000),
  venue: nonEmptyTrimmedString('Địa điểm', 3, 255),
  imageUrl: optionalHttpsUrl,
  cardImageUrl: optionalHttpsUrl,
});

const normalizeEventDates = (value) => ({
  ...value,
  startDate: value.startDate || value.date,
});

const validateEventDateOrder = (value) => {
  if (!value.endDate || !value.startDate) return true;
  return new Date(value.endDate) > new Date(value.startDate);
};

const CATEGORY_SLUGS = [
  'music',
  'seminarsworkshops',
  'sport',
  'theatersandart',
  'attractionsexperiences',
  'others',
];

const categorySlug = z.enum(CATEGORY_SLUGS);

const categoryListQuery = z
  .string({ message: 'Danh sách thể loại phải là chuỗi' })
  .trim()
  .max(200, 'Danh sách thể loại tối đa 200 ký tự')
  .refine((value) => {
    const categories = value.split(',').map((item) => item.trim()).filter(Boolean);
    return categories.length > 0 && categories.every((item) => CATEGORY_SLUGS.includes(item));
  }, 'Danh sách thể loại không hợp lệ');

const createEventBody = eventBase
  .merge(eventDateFields)
  .extend({
    category: categorySlug.optional(),
    zones: z.array(z.object({
      name: nonEmptyTrimmedString('Tên khu vực', 1, 80),
      rows: z.coerce.number().int().min(1).max(200),
      cols: z.coerce.number().int().min(1).max(200),
      price: z.coerce.number().positive().max(MAX_PRICE),
    }).strict()).max(50).optional(),
  })
  .strict()
  .transform(normalizeEventDates)
  .refine((value) => !!value.startDate, { path: ['startDate'], message: 'Ngày bắt đầu là bắt buộc' })
  .refine(validateEventDateOrder, { path: ['endDate'], message: 'Ngày kết thúc phải sau ngày bắt đầu' });

const updateEventBody = eventBase
  .partial()
  .merge(eventDateFields)
  .extend({
    category: categorySlug.optional(),
  })
  .strict()
  .transform(normalizeEventDates)
  .refine((value) => Object.keys(value).some((key) => value[key] !== undefined), {
    message: 'Cần gửi ít nhất một trường để cập nhật',
  })
  .refine(validateEventDateOrder, { path: ['endDate'], message: 'Ngày kết thúc phải sau ngày bắt đầu' });

const adminEventsQuery = paginationQuery.extend({
  status: z.enum(['pub', 'draft', 'ended', 'PUBLISHED', 'DRAFT', 'ENDED']).optional(),
});

const publicEventsQuery = paginationQuery.extend({
  category: categorySlug.optional(),
  categories: categoryListQuery.optional(),
}).strict();

module.exports = {
  adminEventsQuery,
  categorySlug,
  createEventBody,
  publicEventsQuery,
  updateEventBody,
};
