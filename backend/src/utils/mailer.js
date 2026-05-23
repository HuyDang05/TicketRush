// Purpose: File code TicketRush; doc comment gan logic ben duoi de nam vai tro va luong xu ly.
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

// tickets: [{ seatLabel, zoneName, eventTitle, eventVenue, eventDate, totalPrice, qrCode }]
const sendTicketEmail = async (to, tickets) => {
  const first = tickets[0];
  const eventDateStr = first.eventDate
    ? new Date(first.eventDate).toLocaleString('vi-VN', {
        weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '';

  // Build CID attachments from base64 data URLs (Gmail blocks inline data: URLs)
  const attachments = tickets.map((t, i) => {
    const cid = `qr_seat_${i}`;
    const base64Data = t.qrCode.replace(/^data:image\/png;base64,/, '');
    return { cid, filename: `qr_${t.seatLabel}.png`, content: Buffer.from(base64Data, 'base64'), contentType: 'image/png' };
  });

  const ticketRows = tickets.map((t, i) => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #2a2a2a;color:#fff;font-weight:600;">${t.zoneName} · Ghế ${t.seatLabel}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #2a2a2a;color:#FF6B35;font-weight:700;text-align:right;">
        ${Number(t.totalPrice).toLocaleString('vi-VN')}đ
      </td>
    </tr>
    <tr>
      <td colspan="2" style="padding:8px 16px 20px;border-bottom:1px solid #333;text-align:center;">
        <img src="cid:qr_seat_${i}" alt="QR Code ${t.seatLabel}" width="160" height="160"
          style="border-radius:8px;background:#fff;padding:8px;" />
        <div style="color:#888;font-size:11px;margin-top:6px;">Mã QR vào cổng · ${t.zoneName} · Ghế ${t.seatLabel}</div>
      </td>
    </tr>
  `).join('');

  const grandTotal = tickets.reduce((s, t) => s + Number(t.totalPrice), 0);
  const fee = Math.round(grandTotal * 0.05);

  const html = `
    <div style="font-family:'Segoe UI',sans-serif;max-width:560px;margin:auto;background:#111;border-radius:16px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#FF6B35,#c8440a);padding:32px 32px 24px;">
        <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">⚡ TicketRush</div>
        <div style="font-size:28px;font-weight:800;color:#fff;margin-top:12px;line-height:1.2;">
          Vé của bạn đã sẵn sàng!
        </div>
        <div style="color:rgba(255,255,255,0.8);margin-top:8px;font-size:14px;">
          Đặt vé thành công · ${tickets.length} vé
        </div>
      </div>

      <div style="padding:24px 32px;background:#1a1a1a;border-bottom:1px solid #2a2a2a;">
        <div style="font-size:20px;font-weight:700;color:#fff;margin-bottom:8px;">${first.eventTitle}</div>
        <div style="color:#aaa;font-size:14px;margin-bottom:4px;">📅 ${eventDateStr}</div>
        <div style="color:#aaa;font-size:14px;">📍 ${first.eventVenue || ''}</div>
      </div>

      <div style="background:#111;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#1e1e1e;">
              <th style="padding:12px 16px;text-align:left;color:#888;font-size:12px;font-weight:600;letter-spacing:0.5px;">VÉ</th>
              <th style="padding:12px 16px;text-align:right;color:#888;font-size:12px;font-weight:600;letter-spacing:0.5px;">GIÁ</th>
            </tr>
          </thead>
          <tbody>${ticketRows}</tbody>
        </table>
      </div>

      <div style="padding:20px 32px;background:#1a1a1a;border-top:1px solid #2a2a2a;">
        <div style="display:flex;justify-content:space-between;color:#aaa;font-size:13px;margin-bottom:6px;">
          <span>Phí dịch vụ (5%)</span>
          <span>${fee.toLocaleString('vi-VN')}đ</span>
        </div>
        <div style="display:flex;justify-content:space-between;color:#fff;font-size:16px;font-weight:700;margin-top:8px;padding-top:12px;border-top:1px solid #333;">
          <span>Tổng cộng</span>
          <span style="color:#FF6B35;">${(grandTotal + fee).toLocaleString('vi-VN')}đ</span>
        </div>
      </div>

      <div style="padding:24px 32px;background:#111;text-align:center;">
        <div style="color:#555;font-size:12px;line-height:1.6;">
          Vui lòng xuất trình mã QR tại cổng vào sự kiện.<br/>
          Mỗi mã QR chỉ sử dụng được một lần.<br/>
          Liên hệ hỗ trợ: <a href="mailto:${process.env.GMAIL_USER}" style="color:#FF6B35;">${process.env.GMAIL_USER}</a>
        </div>
      </div>
    </div>
  `;

  const info = await transporter.sendMail({
    from: `"TicketRush" <${process.env.GMAIL_USER}>`,
    to,
    subject: `🎟️ Vé của bạn: ${first.eventTitle}`,
    html,
    attachments,
  });

  return info;
};

module.exports = { sendPasswordResetEmail, sendTicketEmail };
