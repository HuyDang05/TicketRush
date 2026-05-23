// Purpose: Schema validate input API truoc khi controller xu ly nghiep vu.
const { z } = require('zod');
const { email, nonEmptyTrimmedString, password } = require('./common.validator');

const allowedGenders = ['MALE', 'FEMALE', 'OTHER'];

const dobSchema = z
  .string({ message: 'Ngày sinh phải là chuỗi' })
  .trim()
  .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Ngày sinh không hợp lệ')
  .refine((value) => new Date(value) <= new Date(), 'Ngày sinh không được ở tương lai')
  .refine((value) => {
    const dob = new Date(value);
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const monthDelta = now.getMonth() - dob.getMonth();
    if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < dob.getDate())) age -= 1;
    return age >= 13 && age <= 120;
  }, 'Tuổi phải từ 13 đến 120');

const registerBody = z.object({
  email,
  password,
  fullName: nonEmptyTrimmedString('Họ tên', 2, 100),
  dob: dobSchema,
  gender: z
    .string({ message: 'Giới tính phải là chuỗi' })
    .trim()
    .toUpperCase()
    .refine((value) => allowedGenders.includes(value), 'Giới tính không hợp lệ'),
}).strict();

const loginBody = z.object({
  email,
  password: z.string({ message: 'Mật khẩu phải là chuỗi' }).min(1, 'Mật khẩu không được để trống').max(128, 'Mật khẩu tối đa 128 ký tự'),
}).strict();

const forgotPasswordBody = z.object({
  email,
}).strict();

const resetPasswordBody = z.object({
  token: z.string().trim().regex(/^[a-f0-9]{64}$/i, 'Token không hợp lệ'),
  password,
}).strict();

module.exports = {
  forgotPasswordBody,
  loginBody,
  registerBody,
  resetPasswordBody,
};
