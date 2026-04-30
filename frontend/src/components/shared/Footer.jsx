import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__grid">
        <div>
          <Link to="/" className="footer__logo">
            <span className="footer__logo-icon">⚡</span>
            <span className="footer__logo-text">TicketRush</span>
          </Link>
          <p className="footer__desc">
            Nền tảng đặt vé sự kiện hàng đầu Việt Nam. Nhanh chóng, an toàn và tiện lợi — mọi lúc mọi nơi.
          </p>
          <div className="footer__socials">
            {['f', 'in', 'yt', 'tk'].map((s) => (
              <a key={s} href="#" className="footer__social-btn">{s}</a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="footer__col-title">Hỗ trợ</h4>
          <ul className="footer__list">
            {['Trung tâm hỗ trợ', 'Chính sách hoàn tiền', 'Điều khoản sử dụng', 'Chính sách bảo mật', 'Liên hệ'].map((l) => (
              <li key={l}><a href="#" className="footer__list-link">{l}</a></li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="footer__col-title">Khám phá</h4>
          <ul className="footer__list">
            {['Nhạc sống', 'Sân khấu & Nghệ thuật', 'Thể thao', 'Hội thảo & Workshop', 'Lễ hội'].map((l) => (
              <li key={l}><a href="#" className="footer__list-link">{l}</a></li>
            ))}
          </ul>
        </div>
      </div>

      <div className="footer__bottom">
        © 2026 TicketRush. Tất cả quyền được bảo lưu. · Được xây dựng với ❤️ tại Việt Nam
      </div>
    </footer>
  );
}
