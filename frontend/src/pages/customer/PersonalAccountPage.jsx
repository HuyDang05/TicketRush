import { useState } from 'react';
import { Camera, Lock, User, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import useAuthStore from '../../store/authStore';
import userService from '../../services/user.service';
import './PersonalAccountPage.css';

export default function PersonalAccountPage() {
  const { user, logout } = useAuth();
  const { setUser } = useAuthStore();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [preview, setPreview] = useState(user?.avatarUrl || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deleteReady, setDeleteReady] = useState(false);
  const [deleteSlide, setDeleteSlide] = useState(0);
  const [loading, setLoading] = useState(false);

  const fallbackAvatar =
    fullName?.trim()?.charAt(0)?.toUpperCase() ||
    user?.email?.charAt(0)?.toUpperCase() ||
    'U';

  const handleAvatarFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file ảnh');
      return;
    }

    const reader = new FileReader();

    reader.onloadend = () => {
      setPreview(reader.result);
      setAvatarUrl(reader.result);
    };

    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);

      const res = await userService.updateProfile({
        fullName,
        avatarUrl,
      });

      const token = localStorage.getItem('token');
      setUser(res.data.user, token);

      toast.success('Cập nhật tài khoản thành công');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Cập nhật thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }

    try {
      setLoading(true);

      await userService.changePassword({
        currentPassword,
        newPassword,
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      toast.success('Đổi mật khẩu thành công');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Đổi mật khẩu thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSlide = async (value) => {
    const numberValue = Number(value);
    setDeleteSlide(numberValue);

    if (numberValue < 100) return;

    try {
      setLoading(true);

      await userService.deleteAccount();

      toast.success('Đã xóa tài khoản');
      logout();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Xóa tài khoản thất bại');
      setDeleteSlide(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="account-page">
      <section className="account-hero">
        <div>
          <p>TICKETRUSH ACCOUNT</p>
          <h1>Tài khoản cá nhân</h1>
          <span>Quản lý avatar, tên tài khoản, mật khẩu và xóa tài khoản.</span>
        </div>
      </section>

      <section className="account-layout">
        <aside className="account-profile-card">
          <div className="account-avatar-wrap">
            {preview ? (
              <img src={preview} alt="Avatar" className="account-avatar-img" />
            ) : (
              <div className="account-avatar-fallback">{fallbackAvatar}</div>
            )}

            <label className="account-avatar-btn">
              <Camera size={20} />
              <input type="file" accept="image/*" onChange={handleAvatarFile} />
            </label>
          </div>

          <h2>{fullName || 'Người dùng TicketRush'}</h2>
          <p>{user?.email}</p>

          <div className="account-mini-info">
            <span>Vai trò</span>
            <strong>{user?.role}</strong>
          </div>
        </aside>

        <section className="account-content">
          <div className="account-card">
            <div className="account-card-title">
              <User size={22} />
              <div>
                <h2>Thông tin cá nhân</h2>
                <p>Cập nhật tên hiển thị và ảnh đại diện của bạn.</p>
              </div>
            </div>

            <label>Tên tài khoản</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nhập tên tài khoản"
            />

            <label>Avatar URL hoặc ảnh đã chọn</label>
            <input
              value={avatarUrl}
              onChange={(e) => {
                setAvatarUrl(e.target.value);
                setPreview(e.target.value);
              }}
              placeholder="Dán link ảnh hoặc chọn ảnh ở avatar"
            />

            <button onClick={handleSaveProfile} disabled={loading}>
              <Save size={18} />
              Lưu thay đổi
            </button>
          </div>

          <div className="account-card">
            <div className="account-card-title">
              <Lock size={22} />
              <div>
                <h2>Đổi mật khẩu</h2>
                <p>Mật khẩu mới nên có ít nhất 8 ký tự.</p>
              </div>
            </div>

            <label>Mật khẩu hiện tại</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Nhập mật khẩu hiện tại"
            />

            <label>Mật khẩu mới</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nhập mật khẩu mới"
            />

            <label>Xác nhận mật khẩu mới</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu mới"
            />

            <button onClick={handleChangePassword} disabled={loading}>
              <Lock size={18} />
              Đổi mật khẩu
            </button>
          </div>

          <div className="account-card account-danger-card">
            <div className="account-card-title account-danger-title">
              <Trash2 size={22} />
              <div>
                <h2>Xóa tài khoản</h2>
                <p>Hành động này không thể hoàn tác.</p>
              </div>
            </div>

            <p className="account-danger-text">
              Khi xóa tài khoản, thông tin người dùng và dữ liệu đặt vé liên quan sẽ bị xóa khỏi hệ thống.
            </p>

            <button
              type="button"
              className="account-delete-toggle"
              onClick={() => {
                setDeleteReady(true);
                setDeleteSlide(0);
              }}
            >
              DELETE ACCOUNT
            </button>

            {deleteReady && (
              <div className="account-delete-box">
                <div className="account-delete-warning">
                  Kéo thanh đỏ sang phải 100% để xác nhận xóa tài khoản.
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  value={deleteSlide}
                  onChange={(e) => handleDeleteSlide(e.target.value)}
                  className="account-delete-slider"
                />

                <div className="account-delete-percent">{deleteSlide}%</div>
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}