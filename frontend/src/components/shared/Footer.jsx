export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white mt-12">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="font-bold mb-4">Về TicketRush</h3>
            <ul className="text-gray-400 space-y-2">
              <li><a href="#" className="hover:text-white">Giới thiệu</a></li>
              <li><a href="#" className="hover:text-white">Liên hệ</a></li>
              <li><a href="#" className="hover:text-white">Blog</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold mb-4">Hỗ trợ</h3>
            <ul className="text-gray-400 space-y-2">
              <li><a href="#" className="hover:text-white">FAQ</a></li>
              <li><a href="#" className="hover:text-white">Điều khoản</a></li>
              <li><a href="#" className="hover:text-white">Chính sách</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold mb-4">Mạng xã hội</h3>
            <ul className="text-gray-400 space-y-2">
              <li><a href="#" className="hover:text-white">Facebook</a></li>
              <li><a href="#" className="hover:text-white">Instagram</a></li>
              <li><a href="#" className="hover:text-white">Twitter</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold mb-4">Liên hệ</h3>
            <p className="text-gray-400">Email: support@ticketrush.com</p>
            <p className="text-gray-400">Phone: (84) 123-456-789</p>
          </div>
        </div>
        <div className="border-t border-gray-700 pt-8 text-center text-gray-400">
          <p>&copy; 2024 TicketRush. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
