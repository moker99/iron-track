import React, { useState } from 'react';
import {
  X,
  Users,
  Cloud,
  Download,
  Upload,
  RotateCcw,
  Copy,
  Check,
  Plus,
  Trash2,
  Edit2,
  HelpCircle,
  Database
} from 'lucide-react';
import type { CloudConfig, UserProfile } from '../types';
import { StorageService } from '../services/storage';
import { SUPABASE_SQL_SCHEMA, testSupabaseConnection } from '../services/supabase';

interface SettingsModalProps {
  onClose: () => void;
  profiles: UserProfile[];
  activeProfileId: string;
  onSelectProfile: (id: string) => void;
  onEditProfile: (profile: UserProfile) => void;
  onAddNewProfile: () => void;
  onReloadAllData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  profiles,
  activeProfileId,
  onSelectProfile,
  onEditProfile,
  onAddNewProfile,
  onReloadAllData,
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'cloud' | 'backup' | 'guide'>('users');
  
  // Cloud settings state
  const [cloudConfig, setCloudConfig] = useState<CloudConfig>(StorageService.getCloudConfig());
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const handleSaveCloudConfig = (newConfig: CloudConfig) => {
    setCloudConfig(newConfig);
    StorageService.saveCloudConfig(newConfig);
  };

  const handleTestConnection = async () => {
    if (!cloudConfig.supabaseUrl || !cloudConfig.supabaseAnonKey) {
      setTestResult({ success: false, message: '請先輸入 Supabase URL 與 Anon Key' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    const res = await testSupabaseConnection(cloudConfig.supabaseUrl, cloudConfig.supabaseAnonKey);
    setTestResult(res);
    setIsTesting(false);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleExportBackup = () => {
    const json = StorageService.exportFullBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `irontrack-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      if (content) {
        const success = StorageService.importFullBackup(content);
        if (success) {
          alert('備份資料匯入成功！系統即將重新載入。');
          onReloadAllData();
          onClose();
        } else {
          alert('匯入失敗，請確認檔案格式是否正確。');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = () => {
    if (window.confirm('確定要清空所有個人記錄並重設為初始範例資料嗎？此操作不可復原。')) {
      StorageService.resetToDefault();
      onReloadAllData();
      onClose();
    }
  };

  const handleDeleteProfile = (id: string, name: string) => {
    if (profiles.length <= 1) {
      alert('系統至少需保留一位使用者！');
      return;
    }
    if (window.confirm(`確定要刪除成員「${name}」嗎？`)) {
      StorageService.deleteProfile(id);
      onReloadAllData();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '680px' }}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <h2 className="modal-title">系統與資料管理</h2>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Headers */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-color)',
          background: 'rgba(12, 19, 34, 0.4)',
          overflowX: 'auto',
          padding: '0 0.5rem'
        }}>
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.75rem 1rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'users' ? '2px solid var(--neon-green)' : '2px solid transparent',
              color: activeTab === 'users' ? 'var(--neon-green)' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontFamily: 'inherit',
            }}
            onClick={() => setActiveTab('users')}
          >
            <Users size={16} />
            <span>多成員切換 ({profiles.length})</span>
          </button>

          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.75rem 1rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'cloud' ? '2px solid var(--neon-cyan)' : '2px solid transparent',
              color: activeTab === 'cloud' ? 'var(--neon-cyan)' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontFamily: 'inherit',
            }}
            onClick={() => setActiveTab('cloud')}
          >
            <Cloud size={16} />
            <span>Supabase 雲端後端 ($0)</span>
          </button>

          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.75rem 1rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'backup' ? '2px solid var(--neon-purple)' : '2px solid transparent',
              color: activeTab === 'backup' ? 'var(--neon-purple)' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontFamily: 'inherit',
            }}
            onClick={() => setActiveTab('backup')}
          >
            <Database size={16} />
            <span>備份與還原</span>
          </button>

          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.75rem 1rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'guide' ? '2px solid var(--neon-amber)' : '2px solid transparent',
              color: activeTab === 'guide' ? 'var(--neon-amber)' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontFamily: 'inherit',
            }}
            onClick={() => setActiveTab('guide')}
          >
            <HelpCircle size={16} />
            <span>GitHub Pages 部署教學</span>
          </button>
        </div>

        <div className="modal-body">
          {/* TAB 1: 多使用者管理 */}
          {activeTab === 'users' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>本機多成員檔案庫</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    每位成員擁有完全獨立的訓練課表、日誌、TDEE 與飲食記錄，切換零延遲。
                  </p>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    onClose();
                    onAddNewProfile();
                  }}
                >
                  <Plus size={15} />
                  <span>新增成員</span>
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {profiles.map(p => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between"
                    style={{
                      background: p.id === activeProfileId ? 'rgba(0, 245, 155, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${p.id === activeProfileId ? 'rgba(0, 245, 155, 0.3)' : 'var(--border-color)'}`,
                      borderRadius: '0.75rem',
                      padding: '0.75rem 1rem',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span style={{ fontSize: '1.5rem' }}>{p.avatar}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{p.name}</span>
                          {p.id === activeProfileId && (
                            <span className="badge badge-green">當前使用中</span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {p.heightCm} cm · {p.weightKg} kg · {p.goal === 'gain_muscle' ? '增肌' : p.goal === 'lose_fat' ? '減脂' : '維持'} · 目標 {p.customCalories || 2400} kcal
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {p.id !== activeProfileId && (
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => onSelectProfile(p.id)}
                        >
                          切換至此
                        </button>
                      )}
                      <button
                        className="btn btn-secondary btn-icon btn-sm"
                        title="編輯資料"
                        onClick={() => {
                          onClose();
                          onEditProfile(p);
                        }}
                      >
                        <Edit2 size={14} />
                      </button>
                      {profiles.length > 1 && (
                        <button
                          className="btn btn-danger btn-icon btn-sm"
                          title="刪除成員"
                          onClick={() => handleDeleteProfile(p.id, p.name)}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: Supabase 免費雲端後端 */}
          {activeTab === 'cloud' && (
            <div className="flex flex-col gap-4">
              <div style={{
                background: 'rgba(6, 182, 212, 0.08)',
                border: '1px solid rgba(6, 182, 212, 0.25)',
                borderRadius: '0.75rem',
                padding: '0.85rem 1rem',
              }}>
                <div className="flex items-center gap-2" style={{ fontWeight: 700, color: 'var(--neon-cyan)', fontSize: '0.9rem' }}>
                  <Cloud size={16} />
                  <span>完全免費的雲端同步方案 (Supabase Free Tier)</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem', lineHeight: 1.5 }}>
                  GitHub Pages 本身是靜態網站，透過整合免費的 Supabase (每月提供 50,000 MAU、500MB PostgreSQL 資料庫)，即可免費達成跨手機、電腦資料即時同步！若不設定則預設以本機離線保存。
                </p>
              </div>

              <div>
                <label className="label">Supabase Project URL</label>
                <input
                  type="text"
                  className="input"
                  placeholder="https://xxxxxxxxxxxxxx.supabase.co"
                  value={cloudConfig.supabaseUrl}
                  onChange={e => handleSaveCloudConfig({ ...cloudConfig, supabaseUrl: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Supabase Anon Public Key</label>
                <input
                  type="password"
                  className="input"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={cloudConfig.supabaseAnonKey}
                  onChange={e => handleSaveCloudConfig({ ...cloudConfig, supabaseAnonKey: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2" style={{ cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input
                    type="checkbox"
                    checked={cloudConfig.syncEnabled}
                    onChange={e => handleSaveCloudConfig({ ...cloudConfig, syncEnabled: e.target.checked })}
                  />
                  <span>啟用雲端同步</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={isTesting}
                    onClick={handleTestConnection}
                  >
                    {isTesting ? '連線測試中...' : '測試連線'}
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      handleSaveCloudConfig(cloudConfig);
                      alert('雲端設定已儲存！');
                    }}
                  >
                    儲存設定
                  </button>
                </div>
              </div>

              {testResult && (
                <div style={{
                  padding: '0.6rem 0.85rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.85rem',
                  background: testResult.success ? 'rgba(0, 245, 155, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                  color: testResult.success ? 'var(--neon-green)' : 'var(--neon-rose)',
                  border: `1px solid ${testResult.success ? 'rgba(0, 245, 155, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`
                }}>
                  {testResult.message}
                </div>
              )}

              {/* SQL Schema Copy Card */}
              <div style={{
                background: 'rgba(12, 19, 34, 0.6)',
                border: '1px solid var(--border-color)',
                borderRadius: '0.75rem',
                padding: '0.85rem 1rem',
              }}>
                <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Supabase 一鍵建表指令 (SQL)</span>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleCopySql}
                  >
                    {copiedSql ? <Check size={14} style={{ color: 'var(--neon-green)' }} /> : <Copy size={14} />}
                    <span>{copiedSql ? '已複製！' : '複製 SQL 指令'}</span>
                  </button>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  前往 Supabase 後台 ➔ 點擊左側「SQL Editor」➔ 貼上此語法並按「Run」即可自動建立使用者表、飲食表與訓練日誌表！
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: 備份與還原 */}
          {activeTab === 'backup' && (
            <div className="flex flex-col gap-4">
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>100% 數據自主持有 (JSON 備份)</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  無論使用本機離線或雲端，您都能隨時將全部訓練菜單、飲食歷史、PR紀錄匯出成標準 JSON 備份檔。
                </p>
              </div>

              <div className="grid-cols-2 grid-responsive-2 gap-3">
                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0.75rem',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}>
                  <div className="flex items-center gap-2" style={{ fontWeight: 600 }}>
                    <Download size={18} style={{ color: 'var(--neon-green)' }} />
                    <span>匯出完整備份檔</span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    包含所有使用者檔案、自訂食物庫、健身課表與日誌。
                  </p>
                  <button className="btn btn-secondary btn-sm" onClick={handleExportBackup}>
                    下載 JSON 備份
                  </button>
                </div>

                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0.75rem',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}>
                  <div className="flex items-center gap-2" style={{ fontWeight: 600 }}>
                    <Upload size={18} style={{ color: 'var(--neon-purple)' }} />
                    <span>還原備份資料</span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    選取先前匯出的 JSON 檔案進行無損還原。
                  </p>
                  <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportBackup}
                      style={{ display: 'none' }}
                    />
                    選擇 JSON 檔案還原
                  </label>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--neon-rose)' }}>重設為初始狀態</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>清空瀏覽器快取中的所有自訂記錄，恢復初始示範資料。</div>
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={handleResetData}>
                    <RotateCcw size={14} />
                    <span>重設系統</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: GitHub Pages 部署教學 */}
          {activeTab === 'guide' && (
            <div className="flex flex-col gap-3" style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--neon-amber)' }}>
                🚀 GitHub Pages 免費上線 3 步驟實操
              </h3>
              
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.85rem', borderRadius: '0.65rem', border: '1px solid var(--border-color)' }}>
                <strong>步驟 1：建立 GitHub Repository 並 Push 程式碼</strong>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                  專案已經配置好 <code>.github/workflows/deploy.yml</code>。只要在終端機執行：
                </p>
                <pre style={{ background: '#070b12', padding: '0.5rem', borderRadius: '0.4rem', fontSize: '0.75rem', marginTop: '0.35rem', overflowX: 'auto' }}>
git remote add origin https://github.com/&lt;您的帳號&gt;/iron-track.git&#10;git add .&#10;git commit -m "feat: launch IronTrack"&#10;git push -u origin main
                </pre>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.85rem', borderRadius: '0.65rem', border: '1px solid var(--border-color)' }}>
                <strong>步驟 2：在 GitHub 倉庫開啟 Pages 自動構建</strong>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                  前往 GitHub 倉庫 ➔ 點擊上方 <strong>Settings</strong> ➔ 左側選單選 <strong>Pages</strong> ➔ 將 <strong>Build and deployment &gt; Source</strong> 由「Deploy from a branch」改選為 <strong>「GitHub Actions」</strong>！
                </p>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.85rem', borderRadius: '0.65rem', border: '1px solid var(--border-color)' }}>
                <strong>步驟 3：享受專屬免費健身網站</strong>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                  部署完成後，即可直接透過 <code>https://&lt;您的帳號&gt;.github.io/iron-track/</code> 在手機或電腦上加入主畫面並暢快使用！
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
