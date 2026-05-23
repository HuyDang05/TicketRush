// Purpose: Trang admin quan ly du lieu va thao tac van hanh cua TicketRush.
import { useEffect, useState } from 'react';
import AdminLayout from '../../components/shared/AdminLayout';
import api from '../../services/api';
import './admin.css';
import { css, cx } from "../../lib/runtimeCss";
export default function AdminAccountManagementPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    dob: '',
    gender: 'OTHER'
  });
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
  const handleCreateAdmin = async e => {
    e.preventDefault();
    try {
      setCreating(true);
      setCreateError('');
      await api.post('/admin/accounts', formData);
      setShowCreateModal(false);
      setFormData({
        email: '',
        password: '',
        fullName: '',
        dob: '',
        gender: 'OTHER'
      });
      loadAccounts();
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Có lỗi xảy ra khi tạo tài khoản');
    } finally {
      setCreating(false);
    }
  };
  return <AdminLayout>
      <div className="admin-topbar">
        <div>
          <div className={css({
          fontSize: 18,
          fontWeight: 800
        }, "AdminAccountManagementPage")}>Quản lý tài khoản</div>
          <div className={css({
          fontSize: 12,
          color: 'var(--muted)',
          marginTop: 4
        }, "AdminAccountManagementPage")}>
            Danh sách tài khoản có trên nền tảng
          </div>
        </div>
        <div className={css({
        display: 'flex',
        gap: '8px'
      }, "AdminAccountManagementPage")}>
          <button onClick={() => setShowCreateModal(true)} className={cx("dash-refresh-btn", css({
          borderColor: 'transparent',
          backgroundColor: '#30D158',
          color: 'var(--text)',
          fontWeight: 600
        }, "AdminAccountManagementPage"))}>
            Tạo tài khoản Admin
          </button>
          <button onClick={loadAccounts} className={cx("dash-refresh-btn", css({
          borderColor: 'var(--border)'
        }, "AdminAccountManagementPage"))}>
            Làm mới
          </button>
        </div>
      </div>

      <div className="admin-scroll-area">
        <div className="admin-table-card">

          {loading && <div className={css({
          color: 'var(--muted)',
          fontSize: 12
        }, "AdminAccountManagementPage")}>Đang tải dữ liệu...</div>}
          {!loading && error && <div className={css({
          color: 'var(--accent)',
          fontSize: 12
        }, "AdminAccountManagementPage")}>{error}</div>}

          {!loading && !error && <table className={cx("admin-table", css({
          marginTop: 12
        }, "AdminAccountManagementPage"))}>
              <thead>
                <tr>
                  <th>Người dùng</th>
                  <th>Vai trò</th>
                  <th>Hoạt động gần nhất</th>
                </tr>
              </thead>
              <tbody>
                {accounts.length === 0 && <tr>
                    <td colSpan="3" className="admin-table__empty">
                      Chưa có tài khoản nào
                    </td>
                  </tr>}
                {accounts.map(account => <tr key={account.id}>
                    <td>
                      <div className={css({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }, "AdminAccountManagementPage")}>
                        <img src={account.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + account.id} alt="avatar" className={css({
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    objectFit: 'cover'
                  }, "AdminAccountManagementPage")} />
                        <div>
                          <div className={css({
                      fontWeight: 600,
                      color: 'inherit'
                    }, "AdminAccountManagementPage")}>{account.fullName || 'Người dùng ẩn danh'}</div>
                          <div className={css({
                      fontSize: '12px',
                      color: 'var(--muted)'
                    }, "AdminAccountManagementPage")}>{account.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={css({
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  backgroundColor: account.role === 'ADMIN' ? 'rgba(255, 69, 58, 0.2)' : 'rgba(48, 209, 88, 0.2)',
                  color: account.role === 'ADMIN' ? 'var(--danger)' : '#30D158'
                }, "AdminAccountManagementPage")}>
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
                }) : <span className={css({
                  color: 'var(--muted-2)'
                }, "AdminAccountManagementPage")}>Chưa từng online</span>}
                    </td>
                  </tr>)}
              </tbody>
            </table>}
        </div>
      </div>

      {showCreateModal && <div className={css({
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'var(--overlay-strong)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }, "AdminAccountManagementPage")}>
          <div className={css({
        backgroundColor: 'var(--card-hover)',
        padding: '24px',
        borderRadius: '12px',
        width: '400px',
        border: '1px solid var(--border)'
      }, "AdminAccountManagementPage")}>
            <h3 className={css({
          marginTop: 0,
          marginBottom: '16px',
          color: 'var(--text)',
          fontSize: '18px'
        }, "AdminAccountManagementPage")}>Tạo tài khoản Admin</h3>
            {createError && <div className={css({
          color: 'var(--danger)',
          marginBottom: '16px',
          fontSize: '13px',
          background: 'rgba(255, 69, 58, 0.1)',
          padding: '8px',
          borderRadius: '4px'
        }, "AdminAccountManagementPage")}>{createError}</div>}
            
            <form onSubmit={handleCreateAdmin} className={css({
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }, "AdminAccountManagementPage")}>
              <div>
                <label className={css({
              display: 'block',
              marginBottom: '6px',
              fontSize: '13px',
              color: 'var(--muted)'
            }, "AdminAccountManagementPage")}>Họ tên <span className={css({
                color: 'var(--danger)'
              }, "AdminAccountManagementPage")}>*</span></label>
                <input required type="text" value={formData.fullName} onChange={e => setFormData({
              ...formData,
              fullName: e.target.value
            })} className={css({
              width: '100%',
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              background: '#0A0A0A',
              color: 'var(--text)'
            }, "AdminAccountManagementPage")} placeholder="Nhập họ tên đầy đủ" />
              </div>
              <div>
                <label className={css({
              display: 'block',
              marginBottom: '6px',
              fontSize: '13px',
              color: 'var(--muted)'
            }, "AdminAccountManagementPage")}>Email <span className={css({
                color: 'var(--danger)'
              }, "AdminAccountManagementPage")}>*</span></label>
                <input required type="email" value={formData.email} onChange={e => setFormData({
              ...formData,
              email: e.target.value
            })} className={css({
              width: '100%',
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              background: '#0A0A0A',
              color: 'var(--text)'
            }, "AdminAccountManagementPage")} placeholder="admin@example.com" />
              </div>
              <div>
                <label className={css({
              display: 'block',
              marginBottom: '6px',
              fontSize: '13px',
              color: 'var(--muted)'
            }, "AdminAccountManagementPage")}>Mật khẩu <span className={css({
                color: 'var(--danger)'
              }, "AdminAccountManagementPage")}>*</span> (Tối thiểu 8 ký tự)</label>
                <input required type="password" minLength={8} value={formData.password} onChange={e => setFormData({
              ...formData,
              password: e.target.value
            })} className={css({
              width: '100%',
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              background: '#0A0A0A',
              color: 'var(--text)'
            }, "AdminAccountManagementPage")} placeholder="••••••••" />
              </div>
              <div className={css({
            display: 'flex',
            gap: '12px'
          }, "AdminAccountManagementPage")}>
                <div className={css({
              flex: 1
            }, "AdminAccountManagementPage")}>
                  <label className={css({
                display: 'block',
                marginBottom: '6px',
                fontSize: '13px',
                color: 'var(--muted)'
              }, "AdminAccountManagementPage")}>Ngày sinh</label>
                  <input type="date" value={formData.dob} onChange={e => setFormData({
                ...formData,
                dob: e.target.value
              })} className={css({
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: '#0A0A0A',
                color: 'var(--text)'
              }, "AdminAccountManagementPage")} />
                </div>
                <div className={css({
              flex: 1
            }, "AdminAccountManagementPage")}>
                  <label className={css({
                display: 'block',
                marginBottom: '6px',
                fontSize: '13px',
                color: 'var(--muted)'
              }, "AdminAccountManagementPage")}>Giới tính</label>
                  <select value={formData.gender} onChange={e => setFormData({
                ...formData,
                gender: e.target.value
              })} className={css({
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: '#0A0A0A',
                color: 'var(--text)'
              }, "AdminAccountManagementPage")}>
                    <option value="MALE">Nam</option>
                    <option value="FEMALE">Nữ</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </div>
              </div>
              
              <div className={css({
            display: 'flex',
            gap: '12px',
            marginTop: '8px',
            justifyContent: 'flex-end'
          }, "AdminAccountManagementPage")}>
                <button type="button" onClick={() => setShowCreateModal(false)} className={css({
              padding: '10px 16px',
              borderRadius: '6px',
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              cursor: 'pointer',
              fontWeight: 600
            }, "AdminAccountManagementPage")}>Hủy</button>
                <button type="submit" disabled={creating} className={css({
              padding: '10px 16px',
              borderRadius: '6px',
              background: '#30D158',
              border: 'none',
              color: 'var(--text)',
              cursor: creating ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              opacity: creating ? 0.7 : 1
            }, "AdminAccountManagementPage")}>
                  {creating ? 'Đang tạo...' : 'Tạo tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>}
    </AdminLayout>;
}
