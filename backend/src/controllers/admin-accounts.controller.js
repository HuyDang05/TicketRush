const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
async function getAdminAccounts(req, res) {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    const data = users.map((user) => ({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    }));

    return res.json({ success: true, data });
  } catch (error) {
    console.error('[Admin][Accounts] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Khong lay duoc danh sach tai khoan',
    });
  }
}

async function createAdminAccount(req, res) {
  const { email, password, fullName, dob, gender } = req.body || {};
  
  if (!email || !password || !fullName || password.length < 8) {
    return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ. Mật khẩu phải có ít nhất 8 ký tự.' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Email đã tồn tại' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const dobDate = dob ? new Date(dob) : null;

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        fullName: fullName.trim(),
        dob: dobDate,
        gender: gender || 'OTHER',
        role: 'ADMIN',
      },
    });

    return res.status(201).json({ success: true, message: 'Tạo tài khoản Admin thành công', data: { id: user.id } });
  } catch (error) {
    console.error('[Admin][CreateAccount] Error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server khi tạo tài khoản' });
  }
}

module.exports = {
  getAdminAccounts,
  createAdminAccount,
};
