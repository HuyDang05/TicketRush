// Purpose: Schema validate input API truoc khi controller xu ly nghiep vu.
const { z } = require('zod');

const MAX_PRICE = 100_000_000;
const MAX_ZONES = 50;
const MAX_SEATS_PER_EVENT = 5000;

const uuid = z.string().uuid('ID không hợp lệ');

const idParams = z.object({
  id: uuid,
}).strict();

const eventIdParams = z.object({
  eventId: uuid,
}).strict();

const eventIdQuery = z.object({
  eventId: uuid.optional(),
}).strict();

const nonEmptyTrimmedString = (field, min = 1, max = 255) =>
  z
    .string({ message: `${field} phải là chuỗi` })
    .trim()
    .min(min, `${field} phải có ít nhất ${min} ký tự`)
    .max(max, `${field} tối đa ${max} ký tự`)
    .refine((value) => !/[\u0000-\u001F\u007F]/.test(value), `${field} chứa ký tự không hợp lệ`);

const optionalTrimmedString = (field, max = 255) =>
  z
    .string({ message: `${field} phải là chuỗi` })
    .trim()
    .max(max, `${field} tối đa ${max} ký tự`)
    .refine((value) => !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value), `${field} chứa ký tự không hợp lệ`)
    .optional();

const email = z
  .string({ message: 'Email phải là chuỗi' })
  .trim()
  .toLowerCase()
  .email('Email không hợp lệ')
  .max(254, 'Email tối đa 254 ký tự');

const password = z
  .string({ message: 'Mật khẩu phải là chuỗi' })
  .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
  .max(128, 'Mật khẩu tối đa 128 ký tự');

const dateString = (field) =>
  z
    .string({ message: `${field} phải là chuỗi ngày giờ` })
    .trim()
    .refine((value) => !Number.isNaN(new Date(value).getTime()), `${field} không hợp lệ`);

const optionalHttpsUrl = z
  .string({ message: 'URL ảnh phải là chuỗi' })
  .trim()
  .max(2048, 'URL ảnh tối đa 2048 ký tự')
  .refine((value) => value === '' || /^https:\/\//i.test(value) || /^data:image\//i.test(value), {
    message: 'URL ảnh phải dùng https:// hoặc là data image',
  })
  .optional()
  .transform((value) => (value ? value : undefined));

const searchQuery = z.object({
  search: z.string().trim().max(100, 'Từ khóa tìm kiếm tối đa 100 ký tự').optional(),
}).passthrough();

const paginationQuery = searchQuery.extend({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

module.exports = {
  MAX_PRICE,
  MAX_SEATS_PER_EVENT,
  MAX_ZONES,
  dateString,
  email,
  eventIdParams,
  eventIdQuery,
  idParams,
  nonEmptyTrimmedString,
  optionalHttpsUrl,
  optionalTrimmedString,
  paginationQuery,
  password,
  searchQuery,
  uuid,
};
