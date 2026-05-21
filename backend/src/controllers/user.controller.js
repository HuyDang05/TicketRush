const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { toPublicUser } = require('../utils/user.util');

const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
    }

    return res.json({ user: toPublicUser(user) });
  } catch (error) {
    console.error('[User][GetMe]', error);
    return res.status(500).json({ message: 'Đã có lỗi xảy ra' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { fullName, avatarUrl } = req.body || {};

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ message: 'Tên tài khoản không được để trống' });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        fullName: fullName.trim(),
        avatarUrl: avatarUrl || null,
      },
    });

    return res.json({
      message: 'Cập nhật tài khoản thành công',
      user: toPublicUser(user),
    });
  } catch (error) {
    console.error('[User][UpdateProfile]', error);
    return res.status(500).json({ message: 'Đã có lỗi xảy ra' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ mật khẩu' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 8 ký tự' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword },
    });

    await prisma.refreshToken.deleteMany({
      where: { userId: req.user.id },
    });

    return res.json({ message: 'Đổi mật khẩu thành công' });
  } catch (error) {
    console.error('[User][ChangePassword]', error);
    return res.status(500).json({ message: 'Đã có lỗi xảy ra' });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    await prisma.$transaction(async (tx) => {
      const bookings = await tx.booking.findMany({
        where: { userId },
        select: { seatId: true },
      });

      const seatIds = bookings.map((booking) => booking.seatId);

      await tx.booking.deleteMany({
        where: { userId },
      });

      if (seatIds.length > 0) {
        await tx.seat.updateMany({
          where: { id: { in: seatIds } },
          data: {
            status: 'AVAILABLE',
            lockedAt: null,
          },
        });
      }

      await tx.passwordResetToken.deleteMany({
        where: { userId },
      });

      await tx.refreshToken.deleteMany({
        where: { userId },
      });

      await tx.user.delete({
        where: { id: userId },
      });
    });

    return res.json({ message: 'Tài khoản đã được xóa' });
  } catch (error) {
    console.error('[User][DeleteAccount]', error);
    return res.status(500).json({ message: 'Không thể xóa tài khoản' });
  }
};

module.exports = {
  getMe,
  updateProfile,
  changePassword,
  deleteAccount,
};
