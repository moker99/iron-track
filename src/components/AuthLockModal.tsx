import React, { useState } from 'react';
import { Lock, Shield, KeyRound, ArrowRight, X, AlertCircle, Eye, EyeOff } from 'lucide-react';
import type { UserProfile } from '../types';
import { StorageService } from '../services/storage';

interface AuthLockModalProps {
  profiles: UserProfile[];
  targetProfile?: UserProfile | null; // 若為切換身分，指定目標成員
  isSwitchMode?: boolean;             // true: 彈窗切換模式; false: 首頁強制登入鎖
  onSuccess: (profile: UserProfile) => void;
  onCancel?: () => void;
}

export const AuthLockModal: React.FC<AuthLockModalProps> = ({
  profiles,
  targetProfile = null,
  isSwitchMode = false,
  onSuccess,
  onCancel,
}) => {
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(targetProfile || (profiles.length === 1 ? profiles[0] : null));
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isShaking, setIsShaking] = useState<boolean>(false);

  const handleSelectUser = (user: UserProfile) => {
    setSelectedUser(user);
    setPasswordInput('');
    setErrorMessage('');
  };

  const handleSubmitPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    const isValid = StorageService.verifyPassword(selectedUser.id, passwordInput);
    if (isValid) {
      StorageService.setAuthenticatedProfileId(selectedUser.id);
      onSuccess(selectedUser);
    } else {
      setIsShaking(true);
      setErrorMessage(
        selectedUser.role === 'admin'
          ? '管理員密碼錯誤！(初始預設密碼為 8888)'
          : '個人登入密碼錯誤，請重新確認！'
      );
      setTimeout(() => setIsShaking(false), 500);
      setPasswordInput('');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(9, 13, 22, 0.96)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        className={`glass-card ${isShaking ? 'shake-animation' : ''}`}
        style={{
          maxWidth: '460px',
          width: '100%',
          border: '1px solid rgba(0, 245, 155, 0.3)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 30px rgba(0, 245, 155, 0.15)',
          padding: '2rem',
          position: 'relative',
        }}
      >
        {isSwitchMode && onCancel && (
          <button
            type="button"
            className="btn btn-ghost btn-icon btn-sm"
            style={{ position: 'absolute', top: '1rem', right: '1rem' }}
            onClick={onCancel}
          >
            <X size={18} />
          </button>
        )}

        {/* Header Icon */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(0, 245, 155, 0.2), rgba(168, 85, 247, 0.2))',
              border: '1px solid var(--neon-green)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--neon-green)',
              marginBottom: '0.75rem',
            }}
          >
            {selectedUser?.role === 'admin' ? <Shield size={28} /> : <Lock size={28} />}
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
            {isSwitchMode ? '身分切換安全驗證' : 'IronTrack 誰在訓練？'}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {selectedUser
              ? `請輸入 ${selectedUser.name} 的個人登入通行密碼`
              : '請先點選您的成員身分，以解鎖個人訓練與飲食數據'}
          </p>
        </div>

        {/* STEP 1: Select User (if not yet chosen) */}
        {!selectedUser ? (
          <div className="flex flex-col gap-2.5">
            {profiles.map(p => (
              <button
                key={p.id}
                type="button"
                className="btn btn-secondary"
                style={{
                  padding: '0.85rem 1.15rem',
                  justifyContent: 'space-between',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0.75rem',
                }}
                onClick={() => handleSelectUser(p)}
              >
                <div className="flex items-center gap-3">
                  <span style={{ fontSize: '1.6rem' }}>{p.avatar}</span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {p.role === 'admin' ? '👑 隊長 / 系統管理員' : '夥伴隊員'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <KeyRound size={16} style={{ color: 'var(--neon-green)' }} />
                  <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />
                </div>
              </button>
            ))}

            <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              🔒 系統僅允許管理員 Shawn 新增建立成員
            </div>
          </div>
        ) : (
          /* STEP 2: Password Input Form */
          <form onSubmit={handleSubmitPassword} className="flex flex-col gap-4">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                background: 'rgba(12, 19, 34, 0.7)',
                padding: '0.75rem 1rem',
                borderRadius: '0.75rem',
                border: '1px solid var(--border-color)',
              }}
            >
              <span style={{ fontSize: '1.8rem' }}>{selectedUser.avatar}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{selectedUser.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {selectedUser.role === 'admin' ? '👑 管理員帳號 (預設密碼: 8888)' : '成員個人帳號 (預設密碼: 1234)'}
                </div>
              </div>

              {!isSwitchMode && profiles.length > 1 && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)' }}
                  onClick={() => {
                    setSelectedUser(null);
                    setPasswordInput('');
                    setErrorMessage('');
                  }}
                >
                  切換對象
                </button>
              )}
            </div>

            {/* Password Input */}
            <div>
              <label className="label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>登入通行密碼</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>支援英文、數字與任意字符</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoFocus
                  className="input"
                  style={{
                    fontSize: '1.15rem',
                    padding: '0.75rem 2.75rem 0.75rem 1rem',
                    color: 'var(--neon-green)',
                    letterSpacing: showPassword ? 'normal' : '0.2rem',
                  }}
                  placeholder="請輸入此帳號的通行密碼"
                  value={passwordInput}
                  onChange={e => {
                    setPasswordInput(e.target.value);
                    setErrorMessage('');
                  }}
                  required
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-icon btn-sm"
                  style={{
                    position: 'absolute',
                    right: '0.6rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)'
                  }}
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? '隱藏密碼' : '顯示密碼'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {errorMessage && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: 'var(--neon-rose)',
                  fontSize: '0.8rem',
                  background: 'rgba(244, 63, 94, 0.1)',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid rgba(244, 63, 94, 0.25)',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex gap-2" style={{ marginTop: '0.5rem' }}>
              {isSwitchMode && onCancel && (
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onCancel}>
                  取消
                </button>
              )}
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 2, padding: '0.8rem', justifyContent: 'center' }}
                disabled={passwordInput.trim().length === 0}
              >
                <KeyRound size={16} />
                <span>驗證密碼並進入系統</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
