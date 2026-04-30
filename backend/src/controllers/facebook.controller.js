const axios = require('axios');
const prisma = require('../config/prisma');
const { signAccessToken } = require('../utils/jwt.util');
const { toPublicUser } = require('../utils/user.util');

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3001';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const FB_APP_ID = process.env.FACEBOOK_APP_ID;
const FB_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const REDIRECT_URI = `${BACKEND_URL}/api/auth/facebook/callback`;

const facebookRedirect = (req, res) => {
  const params = new URLSearchParams({
    client_id: FB_APP_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'email,public_profile',
    response_type: 'code',
  });
  res.redirect(`https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`);
};

const facebookCallback = async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.redirect(`${CLIENT_URL}/login?error=facebook_failed`);
  }

  try {
    // Exchange code → access token
    const tokenRes = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
      params: {
        client_id: FB_APP_ID,
        client_secret: FB_APP_SECRET,
        redirect_uri: REDIRECT_URI,
        code,
      },
    });
    const accessToken = tokenRes.data.access_token;

    // Fetch user profile
    const profileRes = await axios.get('https://graph.facebook.com/me', {
      params: {
        fields: 'id,name,email',
        access_token: accessToken,
      },
    });
    const { email, name } = profileRes.data;

    if (!email) {
      // Facebook có thể không trả email nếu user chưa xác minh email
      return res.redirect(`${CLIENT_URL}/login?error=facebook_no_email`);
    }

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          fullName: name || email.split('@')[0],
          password: '',
          role: 'CUSTOMER',
        },
      });
    }

    const token = signAccessToken({ id: user.id, email: user.email, role: user.role });
    const publicUser = toPublicUser(user);

    const params = new URLSearchParams({
      token,
      user: JSON.stringify(publicUser),
    });
    return res.redirect(`${CLIENT_URL}/auth/callback?${params.toString()}`);
  } catch (err) {
    console.error('[Facebook OAuth] Error:', err.response?.data || err.message);
    return res.redirect(`${CLIENT_URL}/login?error=facebook_failed`);
  }
};

module.exports = { facebookRedirect, facebookCallback };
