// Purpose: Trang customer hien thi workflow mua ve, xem su kien, chon ghe hoac thanh toan.
import { useState } from 'react';
import { Camera, Lock, User, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import useAuthStore from '../../store/authStore';
import userService from '../../services/user.service';
import { useLang } from '../../context/LangContext';

import {
  isValidHttpsOrDataImageUrl,
  validateFullName,
  validatePassword,
} from '../../utils/inputValidation';
import './PersonalAccountPage.css';

function removeVietnameseTones(str = '') {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export default function PersonalAccountPage() {
  const { user, logout } = useAuth();
  const { setUser } = useAuthStore();
  const { lang } = useLang();

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
      toast.error(lang === 'en' ? 'Please select an image file' : 'Vui lòng chọn file ảnh');
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
    const nameError = validateFullName(fullName);
    if (nameError) {
      toast.error(nameError);
      return;
    }

    if (!isValidHttpsOrDataImageUrl(avatarUrl)) {
      toast.error(
        lang === 'en'
          ? 'Avatar URL must use https:// or be a valid selected image'
          : 'Avatar URL phải dùng https:// hoặc là ảnh đã chọn hợp lệ'
      );
      return;
    }

    try {
      setLoading(true);

      const res = await userService.updateProfile({
        fullName: fullName.trim(),
        avatarUrl: avatarUrl.trim(),
      });

      const token = localStorage.getItem('token');
      setUser(res.data.user, token);

      toast.success(lang === 'en' ? 'Profile updated successfully' : 'Cập nhật tài khoản thành công');
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
        (lang === 'en' ? 'Update failed' : 'Cập nhật thất bại')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast.error(lang === 'en' ? 'Please enter current password' : 'Vui lòng nhập mật khẩu hiện tại');
      return;
    }

    const passwordError = validatePassword(newPassword, 'Mật khẩu mới');
    if (passwordError) {
      toast.error(passwordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(lang === 'en' ? 'Password confirmation does not match' : 'Mật khẩu xác nhận không khớp');
      return;
    }

    if (currentPassword === newPassword) {
      toast.error(lang === 'en' ? 'New password must be different from current password' : 'Mật khẩu mới phải khác mật khẩu hiện tại');
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

      toast.success(lang === 'en' ? 'Password changed successfully' : 'Đổi mật khẩu thành công');
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
        (lang === 'en' ? 'Password change failed' : 'Đổi mật khẩu thất bại')
      );
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

      toast.success(lang === 'en' ? 'Account deleted' : 'Đã xóa tài khoản');
      logout();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
        (lang === 'en' ? 'Delete account failed' : 'Xóa tài khoản thất bại')
      );
      setDeleteSlide(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="account-page">
      <section className="account-hero">
        <div>
          <h1>{lang === 'en' ? 'Personal account' : 'Tài khoản cá nhân'}</h1>
          <span>
            {lang === 'en'
              ? 'Manage your avatar, account name, password and account deletion.'
              : 'Quản lý avatar, tên tài khoản, mật khẩu và xóa tài khoản.'}
          </span>
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

          <h2>
            {fullName
              ? (lang === 'en' ? removeVietnameseTones(fullName) : fullName)
              : (lang === 'en' ? 'TicketRush User' : 'Người dùng TicketRush')}
          </h2>
          <p>{user?.email}</p>

          <div className="account-mini-info">
            <span>{lang === 'en' ? 'Role' : 'Vai trò'}</span>
            <strong>{user?.role}</strong>
          </div>
        </aside>

        <section className="account-content">
          <div className="account-card">
            <div className="account-card-title">
              <User size={22} />
              <div>
                <h2>{lang === 'en' ? 'Personal information' : 'Thông tin cá nhân'}</h2>
                <p>
                  {lang === 'en'
                    ? 'Update your display name and avatar.'
                    : 'Cập nhật tên hiển thị và ảnh đại diện của bạn.'}
                </p>
              </div>
            </div>

            <label>{lang === 'en' ? 'Account name' : 'Tên tài khoản'}</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={lang === 'en' ? 'Enter account name' : 'Nhập tên tài khoản'}
            />

            <label>
              {lang === 'en'
                ? 'Avatar URL or selected image'
                : 'Avatar URL hoặc ảnh đã chọn'}
            </label>
            <input
              value={avatarUrl}
              onChange={(e) => {
                setAvatarUrl(e.target.value);
                setPreview(e.target.value);
              }}
              placeholder={
                lang === 'en'
                  ? 'Paste image URL or choose avatar image'
                  : 'Dán link ảnh hoặc chọn ảnh ở avatar'
              }
            />

            <button onClick={handleSaveProfile} disabled={loading}>
              <Save size={18} />
              {lang === 'en' ? 'Save changes' : 'Lưu thay đổi'}
            </button>
          </div>

          <div className="account-card">
            <div className="account-card-title">
              <Lock size={22} />
              <div>
                <h2>{lang === 'en' ? 'Change password' : 'Đổi mật khẩu'}</h2>
                <p>{lang === 'en'
                  ? 'New password should contain at least 8 characters.'
                  : 'Mật khẩu mới nên có ít nhất 8 ký tự.'}</p>
              </div>
            </div>

            <label>{lang === 'en' ? 'Current password' : 'Mật khẩu hiện tại'}</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder={lang === 'en' ? 'Enter current password' : 'Nhập mật khẩu hiện tại'}
            />

            <label>{lang === 'en' ? 'New password' : 'Mật khẩu mới'}</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={lang === 'en' ? 'Enter new password' : 'Nhập mật khẩu mới'}
            />

            <label>
              {lang === 'en'
                ? 'Confirm new password'
                : 'Xác nhận mật khẩu mới'}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={
                lang === 'en'
                  ? 'Re-enter new password'
                  : 'Nhập lại mật khẩu mới'
              }
            />

            <button onClick={handleChangePassword} disabled={loading}>
              <Lock size={18} />
              {lang === 'en' ? 'Change password' : 'Đổi mật khẩu'}
            </button>
          </div>

          <div className="account-card account-danger-card">
            <div className="account-card-title account-danger-title">
              <Trash2 size={22} />
              <div>
                <h2>{lang === 'en' ? 'Delete account' : 'Xóa tài khoản'}</h2>
                <p>{lang === 'en' ? 'This action cannot be undone.' : 'Hành động này không thể hoàn tác.'}</p>
              </div>
            </div>

            <p className="account-danger-text">
              {lang === 'en'
                ? 'When deleting your account, your user information and related booking data will be removed from the system.'
                : 'Khi xóa tài khoản, thông tin người dùng và dữ liệu đặt vé liên quan sẽ bị xóa khỏi hệ thống.'}
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
                  {lang === 'en'
                    ? 'Drag the red bar to the right 100% to confirm account deletion.'
                    : 'Kéo thanh đỏ sang phải 100% để xác nhận xóa tài khoản.'}
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
