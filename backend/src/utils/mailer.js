const nodemailer = require('nodemailer');

console.log('[Mailer] Initializing with user:', process.env.GMAIL_USER);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// Verify connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('[Mailer] Connection error:', error.message);
  } else {
    console.log('[Mailer] SMTP connection verified successfully');
  }
});

const sendPasswordResetEmail = async (to, resetLink) => {
  console.log('[Mailer] Attempting to send email to:', to);
  
  try {
    const info = await transporter.sendMail({
      from: `"TicketRush" <${process.env.GMAIL_USER}>`,
      to,
      subject: 'Đặt lại mật khẩu TicketRush',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#1a1a1a;color:#fff;border-radius:12px;">
          <h2 style="color:#FF6B35;margin-bottom:8px;">⚡ TicketRush</h2>
          <h3 style="margin-bottom:16px;">Đặt lại mật khẩu</h3>
          <p style="color:#aaa;margin-bottom:24px;">
            Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.
            Nhấn nút bên dưới để tiếp tục. Link có hiệu lực trong <strong style="color:#fff;">15 phút</strong>.
          </p>
          <a href="${resetLink}" style="display:inline-block;padding:14px 32px;background:#FF6B35;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">
            Đặt lại mật khẩu
          </a>
          <p style="color:#555;font-size:12px;margin-top:24px;">
            Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.
          </p>
        </div>
      `,
    });
    console.log('[Mailer] Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('[Mailer] Failed to send email:', {
      message: error.message,
      code: error.code,
      to
    });
    throw error;
  }
};

module.exports = { sendPasswordResetEmail };
