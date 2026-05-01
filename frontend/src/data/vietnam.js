export const provinces = [
  {
    name: 'Hà Nội',
    districts: [
      { name: 'Ba Đình', wards: ['Phúc Xá', 'Trúc Bạch', 'Vĩnh Phúc'] },
      { name: 'Hoàn Kiếm', wards: ['Hàng Bạc', 'Hàng Bồ', 'Hàng Trống'] },
      { name: 'Cầu Giấy', wards: ['Dịch Vọng', 'Nghĩa Đô'] },
    ],
    streets: ['Phố Hàng Bạc', 'Đường Điện Biên Phủ', 'Phố Tràng Tiền'],
  },
  {
    name: 'Hồ Chí Minh',
    districts: [
      { name: 'Quận 1', wards: ['Bến Nghé', 'Bến Thành', 'Tân Định'] },
      { name: 'Quận 3', wards: ['Phường 6', 'Phường 7'] },
    ],
    streets: ['Đường Lê Lợi', 'Đường Nguyễn Huệ', 'Đường Đồng Khởi'],
  },
  {
    name: 'Đà Nẵng',
    districts: [
      { name: 'Hải Châu', wards: ['Thạch Thang', 'Thuận Phước'] },
      { name: 'Thanh Khê', wards: ['An Khê', 'Tam Thuận'] },
    ],
    streets: ['Đường Bạch Đằng', 'Đường 2/9'],
  },
];

export default provinces;
