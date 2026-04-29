const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { sendPasswordResetEmail } = require('../utils/mailer');

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3001';
const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 phút

const forgotPassword = async (req, res) => {
  const { email } = req.body || {};
  if (typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ message: 'Email không hợp lệ' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    // Luôn trả về 200 để tránh email enumeration
    if (!user) {
      return res.status(200).json({ message: 'Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu.' });
    }

    // Xoá token cũ của user này
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    await prisma.passwordResetToken.create({
      data: { userId: user.id, token: rawToken, expiresAt },
    });

    const resetLink = `${CLIENT_URL}/reset-password?token=${rawToken}`;
    console.log('[Password][ForgotPassword] Reset link:', resetLink);
    console.log('[Password][ForgotPassword] Sending email to:', user.email);
    
    try {
      await sendPasswordResetEmail(user.email, resetLink);
      console.log('[Password][ForgotPassword] Email sent successfully');
    } catch (emailErr) {
      console.error('[Password][ForgotPassword] Email Error:', {
        message: emailErr.message,
        code: emailErr.code,
        command: emailErr.command,
        stack: emailErr.stack
      });
      // Không trả về lỗi email cho client để tránh tiết lộ thông tin
    }

    return res.status(200).json({ message: 'Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu.' });
  } catch (err) {
    console.error('[Password][ForgotPassword] Error:', {
      message: err.message,
      code: err.code,
      stack: err.stack
    });
    return res.status(500).json({ message: 'Đã có lỗi xảy ra' });
  }
};

const resetPassword = async (req, res) => {
  const { token, password } = req.body || {};
  if (typeof token !== 'string' || !token.trim()) {
    return res.status(400).json({ message: 'Token không hợp lệ' });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 8 ký tự' });
  }

  try {
    const record = await prisma.passwordResetToken.findUnique({ where: { token } });

    if (!record || record.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: record.userId },
      data: { password: hashedPassword },
    });

    await prisma.passwordResetToken.delete({ where: { token } });

    return res.status(200).json({ message: 'Đặt lại mật khẩu thành công' });
  } catch (err) {
    console.error('[Password][ResetPassword] Error:', err);
    return res.status(500).json({ message: 'Đã có lỗi xảy ra' });
  }
};

module.exports = { forgotPassword, resetPassword };
