import { Link } from 'react-router-dom';
import './Footer.css';
import { useLang } from '../../context/LangContext';

export default function Footer() {
  const { lang } = useLang();

  return (
    <footer className="footer">
      <div className="footer__grid">

        <div>
          <Link to="/" className="footer__logo">
            <span className="footer__logo-icon">⚡</span>
            <span className="footer__logo-text">TicketRush</span>
          </Link>

          <p className="footer__desc">
            {lang === 'en'
              ? 'Leading event ticket booking platform in Vietnam. Fast, safe and convenient — anytime, anywhere.'
              : 'Nền tảng đặt vé sự kiện hàng đầu Việt Nam. Nhanh chóng, an toàn và tiện lợi — mọi lúc mọi nơi.'}
          </p>

          <div className="footer__socials">
            {['f', 'in', 'yt', 'tk'].map((s) => (
              <a key={s} href="#" className="footer__social-btn">{s}</a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="footer__col-title">
            {lang === 'en' ? 'Support' : 'Hỗ trợ'}
          </h4>

          <ul className="footer__list">
            {[
              lang === 'en' ? 'Help Center' : 'Trung tâm hỗ trợ',
              lang === 'en' ? 'Refund Policy' : 'Chính sách hoàn tiền',
              lang === 'en' ? 'Terms of Use' : 'Điều khoản sử dụng',
              lang === 'en' ? 'Privacy Policy' : 'Chính sách bảo mật',
              lang === 'en' ? 'Contact' : 'Liên hệ'
            ].map((l) => (
              <li key={l}>
                <a href="#" className="footer__list-link">{l}</a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="footer__col-title">
            {lang === 'en' ? 'Explore' : 'Khám phá'}
          </h4>

          <ul className="footer__list">
            {[
              lang === 'en' ? 'Live Music' : 'Nhạc sống',
              lang === 'en' ? 'Stage & Arts' : 'Sân khấu & Nghệ thuật',
              lang === 'en' ? 'Sports' : 'Thể thao',
              lang === 'en' ? 'Conference & Workshop' : 'Hội thảo & Workshop',
              lang === 'en' ? 'Festival' : 'Lễ hội'
            ].map((l) => (
              <li key={l}>
                <a href="#" className="footer__list-link">{l}</a>
              </li>
            ))}
          </ul>
        </div>

      </div>

      <div className="footer__bottom">
        © 2026 TicketRush.
        {lang === 'en'
          ? ' All rights reserved. · Built with ❤️ in Vietnam'
          : ' Tất cả quyền được bảo lưu. · Được xây dựng với ❤️ tại Việt Nam'}
      </div>
    </footer>
  );
}