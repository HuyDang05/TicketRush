const bcrypt = require('bcryptjs');

const prisma = require('../config/prisma');
const { signAccessToken } = require('../utils/jwt.util');
const { toPublicUser } = require('../utils/user.util');

const INVALID_CREDENTIALS_MESSAGE = 'Email ho\u1eb7c m\u1eadt kh\u1ea9u kh\u00f4ng \u0111\u00fang';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_GENDERS = ['MALE', 'FEMALE', 'OTHER'];

const isValidDate = (value) => {
  if (typeof value !== 'string' || !value.trim()) {
    return false;
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return false;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return parsedDate.toISOString().slice(0, 10) === value;
  }

  return true;
};

const validateRegisterInput = ({ email, password, fullName, dob, gender }) => {
  const errors = [];

  if (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    errors.push({ field: 'email', message: 'Email kh\u00f4ng h\u1ee3p l\u1ec7' });
  }

  if (typeof password !== 'string' || password.length < 8) {
    errors.push({ field: 'password', message: 'M\u1eadt kh\u1ea9u ph\u1ea3i c\u00f3 \u00edt nh\u1ea5t 8 k\u00fd t\u1ef1' });
  }

  if (typeof fullName !== 'string' || !fullName.trim()) {
    errors.push({ field: 'fullName', message: 'H\u1ecd t\u00ean kh\u00f4ng \u0111\u01b0\u1ee3c \u0111\u1ec3 tr\u1ed1ng' });
  }

  if (!isValidDate(dob)) {
    errors.push({ field: 'dob', message: 'Ng\u00e0y sinh kh\u00f4ng h\u1ee3p l\u1ec7' });
  }

  if (typeof gender !== 'string' || !ALLOWED_GENDERS.includes(gender)) {
    errors.push({ field: 'gender', message: 'Gi\u1edbi t\u00ednh kh\u00f4ng h\u1ee3p l\u1ec7' });
  }

  return errors;
};

const register = async (req, res) => {
  const { email, password, fullName, dob, gender } = req.body || {};
  const normalizedInput = {
    email: typeof email === 'string' ? email.trim() : email,
    password,
    fullName,
    dob: typeof dob === 'string' ? dob.trim() : dob,
    gender: typeof gender === 'string' ? gender.trim().toUpperCase() : gender,
  };
  const errors = validateRegisterInput(normalizedInput);

  if (errors.length > 0) {
    return res.status(400).json({
      message: 'D\u1eef li\u1ec7u kh\u00f4ng h\u1ee3p l\u1ec7',
      errors,
    });
  }

  const normalizedEmail = normalizedInput.email.toLowerCase();

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(409).json({
        message: 'Email \u0111\u00e3 t\u1ed3n t\u1ea1i',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        fullName: fullName.trim(),
        dob: new Date(normalizedInput.dob),
        gender: normalizedInput.gender,
        role: 'CUSTOMER',
      },
    });

    return res.status(201).json({
      user: toPublicUser(user),
    });
  } catch (error) {
    if (error?.code === 'P2002') {
      return res.status(409).json({
        message: 'Email \u0111\u00e3 t\u1ed3n t\u1ea1i',
      });
    }

    console.error('[Auth][Register] Error:', error);
    return res.status(500).json({
      message: '\u0110\u00e3 c\u00f3 l\u1ed7i x\u1ea3y ra',
    });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body || {};

  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    !email.trim() ||
    !EMAIL_REGEX.test(email.trim()) ||
    !password
  ) {
    return res.status(400).json({
      message: 'D\u1eef li\u1ec7u kh\u00f4ng h\u1ee3p l\u1ec7',
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return res.status(401).json({
        message: INVALID_CREDENTIALS_MESSAGE,
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: INVALID_CREDENTIALS_MESSAGE,
      });
    }

    const token = signAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return res.status(200).json({
      token,
      user: toPublicUser(user),
    });
  } catch (error) {
    console.error('[Auth][Login] Error:', error);
    return res.status(500).json({
      message: '\u0110\u00e3 c\u00f3 l\u1ed7i x\u1ea3y ra',
    });
  }
};

module.exports = {
  register,
  login,
};
