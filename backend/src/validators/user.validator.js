const { z } = require('zod');
const { nonEmptyTrimmedString, optionalHttpsUrl, password } = require('./common.validator');

const updateProfileBody = z.object({
  fullName: nonEmptyTrimmedString('Tên tài khoản', 2, 100),
  avatarUrl: optionalHttpsUrl,
}).strict();

const changePasswordBody = z.object({
  currentPassword: z.string({ message: 'Mật khẩu hiện tại phải là chuỗi' }).min(1, 'Mật khẩu hiện tại không được để trống').max(128, 'Mật khẩu hiện tại tối đa 128 ký tự'),
  newPassword: password,
}).strict().refine((value) => value.currentPassword !== value.newPassword, {
  path: ['newPassword'],
  message: 'Mật khẩu mới phải khác mật khẩu hiện tại',
});

module.exports = {
  changePasswordBody,
  updateProfileBody,
};
