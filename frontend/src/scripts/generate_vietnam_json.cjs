const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '..', 'data', 'vn_only_simplified_json_generated_data_vn_units.json');
const outPath = path.join(__dirname, '..', 'data', 'vietnam.json');

if (!fs.existsSync(srcPath)) {
  console.error('Source file not found:', srcPath);
  process.exit(1);
}

const raw = fs.readFileSync(srcPath, 'utf8');
let data;
try { data = JSON.parse(raw); } catch (e) { console.error('Invalid JSON:', e); process.exit(1); }
if (!Array.isArray(data)) { console.error('Unexpected data format: expected array'); process.exit(1); }

function cleanProvinceName(full) {
  if (!full) return '';
  return full.replace(/^(Tỉnh|Thành phố|Thành phố trực thuộc trung ương|Thành phố|Tỉnh thành)\s*/i, '').trim();
}
function cleanWardName(full) {
  if (!full) return '';
  return full.replace(/^(Phường|Xã|Thị trấn|Thị xã|Quận|Huyện|Phố|Tổ|Khu|Xã phường)\s*/i, '').trim();
}

const provinces = data.map(p => {
  const name = cleanProvinceName(p.FullName || p.Fullname || p.name || '');
  const wardsRaw = Array.isArray(p.Wards) ? p.Wards : [];
  const wards = wardsRaw.map(w => cleanWardName(w.FullName || w.Fullname || w));
  const uniqueWards = Array.from(new Set(wards)).filter(Boolean).sort((a,b) => a.localeCompare(b, 'vi'));
  return { name, districts: [{ name, wards: uniqueWards }], streets: [] };
});

fs.writeFileSync(outPath, JSON.stringify(provinces, null, 2), 'utf8');
console.log('Generated', outPath, 'with', provinces.length, 'provinces');
