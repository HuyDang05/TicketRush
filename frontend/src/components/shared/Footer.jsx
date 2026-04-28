import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer style={{ background: 'var(--nav)', borderTop: '3px solid var(--accent)', padding: '48px 40px 0' }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '2fr 1fr 1fr',
        gap: 40, paddingBottom: 40,
      }}>
        <div>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginBottom: 14 }}>
            <span style={{ color: 'var(--accent)', fontSize: 22 }}>⚡</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px' }}>TicketRush</span>
          </Link>
          <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, maxWidth: 320, marginBottom: 20 }}>
            Nền tảng đặt vé sự kiện hàng đầu Việt Nam. Nhanh chóng, an toàn và tiện lợi — mọi lúc mọi nơi.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            {['f', 'in', 'yt', 'tk'].map((s) => (
              <a key={s} href="#" style={{
                width: 36, height: 36, border: '1px solid var(--border)', borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: 'var(--muted)', textDecoration: 'none',
                textTransform: 'uppercase',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)'; }}
              >{s}</a>
            ))}
          </div>
        </div>

        <div>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Hỗ trợ</h4>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {['Trung tâm hỗ trợ', 'Chính sách hoàn tiền', 'Điều khoản sử dụng', 'Chính sách bảo mật', 'Liên hệ'].map((l) => (
              <li key={l}>
                <a href="#" style={{ color: 'var(--muted)', fontSize: 14, textDecoration: 'none' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
                >{l}</a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Khám phá</h4>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {['Nhạc sống', 'Sân khấu & Nghệ thuật', 'Thể thao', 'Hội thảo & Workshop', 'Lễ hội'].map((l) => (
              <li key={l}>
                <a href="#" style={{ color: 'var(--muted)', fontSize: 14, textDecoration: 'none' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
                >{l}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div style={{
        borderTop: '1px solid var(--border)', padding: '20px 0',
        textAlign: 'center', fontSize: 13, color: 'var(--muted)',
      }}>
        © 2026 TicketRush. Tất cả quyền được bảo lưu. · Được xây dựng với ❤️ tại Việt Nam
      </div>
    </footer>
  );
}
