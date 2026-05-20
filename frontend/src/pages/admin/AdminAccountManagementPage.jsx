import { useEffect, useState } from 'react';
import AdminLayout from '../../components/shared/AdminLayout';
import api from '../../services/api';
import './admin.css';

export default function AdminAccountManagementPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', fullName: '', dob: '', gender: 'OTHER' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const loadAccounts = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/admin/accounts');
      setAccounts(res.data?.data || []);
    } catch (err) {
      console.error(err);
      setError('Khong tai duoc danh sach tai khoan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    try {
      setCreating(true);
      setCreateError('');
      await api.post('/admin/accounts', formData);
      setShowCreateModal(false);
      setFormData({ email: '', password: '', fullName: '', dob: '', gender: 'OTHER' });
      loadAccounts();
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Có lỗi xảy ra khi tạo tài khoản');
    } finally {
      setCreating(false);
    }
  };

  return (
    <AdminLayout>
      <div className="admin-topbar">
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Quản lý tài khoản</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
            Danh sách tài khoản có trên nền tảng
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowCreateModal(true)}
            className="dash-refresh-btn"
            style={{ borderColor: 'transparent', backgroundColor: '#30D158', color: 'var(--text)', fontWeight: 600 }}
          >
            Tạo tài khoản Admin
          </button>
          <button
            onClick={loadAccounts}
            className="dash-refresh-btn"
            style={{ borderColor: 'var(--border)' }}
          >
            Làm mới
          </button>
        </div>
      </div>

      <div className="admin-scroll-area">
        <div className="admin-table-card">

          {loading && <div style={{ color: 'var(--muted)', fontSize: 12 }}>Đang tải dữ liệu...</div>}
          {!loading && error && <div style={{ color: 'var(--accent)', fontSize: 12 }}>{error}</div>}

          {!loading && !error && (
            <table className="admin-table" style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>Người dùng</th>
                  <th>Vai trò</th>
                  <th>Hoạt động gần nhất</th>
                </tr>
              </thead>
              <tbody>
                {accounts.length === 0 && (
                  <tr>
                    <td colSpan="3" className="admin-table__empty">
                      Chưa có tài khoản nào
                    </td>
                  </tr>
                )}
                {accounts.map((account) => (
                  <tr key={account.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img 
                          src={account.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + account.id} 
                          alt="avatar" 
                          style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} 
                        />
                        <div>
                          <div style={{ fontWeight: 600, color: 'inherit' }}>{account.fullName || 'Người dùng ẩn danh'}</div>
                          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{account.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        backgroundColor: account.role === 'ADMIN' ? 'rgba(255, 69, 58, 0.2)' : 'rgba(48, 209, 88, 0.2)',
                        color: account.role === 'ADMIN' ? 'var(--danger)' : '#30D158'
                      }}>
                        {account.role === 'ADMIN' ? 'Admin' : 'Khách hàng'}
                      </span>
                    </td>
                    <td>
                      {account.lastLoginAt ? new Date(account.lastLoginAt).toLocaleString('vi-VN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : <span style={{ color: 'var(--muted-2)' }}>Chưa từng online</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'var(--overlay-strong)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ backgroundColor: 'var(--card-hover)', padding: '24px', borderRadius: '12px', width: '400px', border: '1px solid var(--border)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px', color: 'var(--text)', fontSize: '18px' }}>Tạo tài khoản Admin</h3>
            {createError && <div style={{ color: 'var(--danger)', marginBottom: '16px', fontSize: '13px', background: 'rgba(255, 69, 58, 0.1)', padding: '8px', borderRadius: '4px' }}>{createError}</div>}
            
            <form onSubmit={handleCreateAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--muted)' }}>Họ tên <span style={{color: 'var(--danger)'}}>*</span></label>
                <input required type="text" value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: '#0A0A0A', color: 'var(--text)' }} placeholder="Nhập họ tên đầy đủ" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--muted)' }}>Email <span style={{color: 'var(--danger)'}}>*</span></label>
                <input required type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: '#0A0A0A', color: 'var(--text)' }} placeholder="admin@example.com" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--muted)' }}>Mật khẩu <span style={{color: 'var(--danger)'}}>*</span> (Tối thiểu 8 ký tự)</label>
                <input required type="password" minLength={8} value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: '#0A0A0A', color: 'var(--text)' }} placeholder="••••••••" />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--muted)' }}>Ngày sinh</label>
                  <input type="date" value={formData.dob} onChange={(e) => setFormData({...formData, dob: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: '#0A0A0A', color: 'var(--text)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--muted)' }}>Giới tính</label>
                  <select value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: '#0A0A0A', color: 'var(--text)' }}>
                    <option value="MALE">Nam</option>
                    <option value="FEMALE">Nữ</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} style={{ padding: '10px 16px', borderRadius: '6px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', fontWeight: 600 }}>Hủy</button>
                <button type="submit" disabled={creating} style={{ padding: '10px 16px', borderRadius: '6px', background: '#30D158', border: 'none', color: 'var(--text)', cursor: creating ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: creating ? 0.7 : 1 }}>
                  {creating ? 'Đang tạo...' : 'Tạo tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
