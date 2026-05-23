// Purpose: Controller nhan request HTTP, goi service/Prisma va chuan hoa response cho API.
const { OAuth2Client } = require('google-auth-library');
const prisma = require('../config/prisma');
const { issueAuthTokens } = require('../services/auth-token.service');
const { toPublicUser } = require('../utils/user.util');

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3001';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/auth/google/callback`;

const oauthClient = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT_URI);

const googleRedirect = (req, res) => {
  const url = oauthClient.generateAuthUrl({
    access_type: 'offline',
    scope: ['profile', 'email'],
    prompt: 'select_account',
  });
  res.redirect(url);
};

const googleCallback = async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.redirect(`${CLIENT_URL}/login?error=google_failed`);
  }

  try {
    const { tokens } = await oauthClient.getToken(code);
    oauthClient.setCredentials(tokens);

    const ticket = await oauthClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          fullName: name || email.split('@')[0],
          avatarUrl: picture || null,
          password: '',
          role: 'CUSTOMER',
        },
      });
    }

    if (user && picture && user.avatarUrl !== picture) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl: picture },
      });
    }

    const token = await issueAuthTokens(res, user);
    const publicUser = toPublicUser(user);

    // Redirect về frontend kèm token
    const params = new URLSearchParams({
      token,
      user: JSON.stringify(publicUser),
    });
    return res.redirect(`${CLIENT_URL}/auth/callback?${params.toString()}`);
  } catch (err) {
    console.error('[Google OAuth] Error:', err);
    return res.redirect(`${CLIENT_URL}/login?error=google_failed`);
  }
};

module.exports = { googleRedirect, googleCallback };
