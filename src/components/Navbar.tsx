import React, { useState } from 'react';
import { Dumbbell, Utensils, LayoutDashboard, LineChart, Settings, Plus, ChevronDown, Check, Cloud } from 'lucide-react';
import type { UserProfile } from '../types';

interface NavbarProps {
  activeTab: 'dashboard' | 'workout' | 'diet' | 'analytics';
  setActiveTab: (tab: 'dashboard' | 'workout' | 'diet' | 'analytics') => void;
  profiles: UserProfile[];
  activeProfile: UserProfile;
  onSelectProfile: (id: string) => void;
  onOpenNewProfile: () => void;
  onOpenSettings: () => void;
  isCloudConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  profiles,
  activeProfile,
  onSelectProfile,
  onOpenNewProfile,
  onOpenSettings,
  isCloudConnected,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <>
      <header className="navbar-header">
        <div className="navbar-inner">
          {/* Brand Logo */}
          <div className="logo-brand" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('dashboard')}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(0, 245, 155, 0.2), rgba(168, 85, 247, 0.2))',
              border: '1px solid rgba(0, 245, 155, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Dumbbell size={22} className="logo-accent" />
            </div>
            <span>Iron<span className="logo-accent">Track</span></span>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="nav-tab-list">
            <button
              className={`nav-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <LayoutDashboard size={17} />
              <span>總覽</span>
            </button>
            <button
              className={`nav-tab-btn ${activeTab === 'workout' ? 'active' : ''}`}
              onClick={() => setActiveTab('workout')}
            >
              <Dumbbell size={17} />
              <span>健身課表</span>
            </button>
            <button
              className={`nav-tab-btn ${activeTab === 'diet' ? 'active' : ''}`}
              onClick={() => setActiveTab('diet')}
            >
              <Utensils size={17} />
              <span>飲食三大元素</span>
            </button>
            <button
              className={`nav-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              <LineChart size={17} />
              <span>成效分析</span>
            </button>
          </nav>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-2">
            {/* Cloud Status Indicator */}
            {isCloudConnected && (
              <span className="badge badge-cyan" title="Supabase 雲端同步已連線" style={{ cursor: 'pointer' }} onClick={onOpenSettings}>
                <Cloud size={12} />
                <span>雲端中</span>
              </span>
            )}

            {/* Profile Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.75rem', gap: '0.4rem' }}
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <span style={{ fontSize: '1.15rem' }}>{activeProfile.avatar || '🏋️'}</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {activeProfile.name}
                </span>
                {activeProfile.role === 'admin' && (
                  <span className="badge badge-purple" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
                    👑 Admin
                  </span>
                )}
                <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
              </button>

              {dropdownOpen && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div style={{
                    position: 'absolute',
                    top: '110%',
                    right: 0,
                    width: '240px',
                    background: '#121a2b',
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.75rem',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                    padding: '0.5rem',
                    zIndex: 50,
                  }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', padding: '0.25rem 0.5rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                      <span>切換成員 ({profiles.length})</span>
                      {activeProfile.role === 'admin' && <span style={{ color: 'var(--neon-purple)' }}>您是管理員</span>}
                    </div>
                    {profiles.map(p => (
                      <button
                        key={p.id}
                        className="flex items-center justify-between"
                        style={{
                          width: '100%',
                          padding: '0.45rem 0.6rem',
                          background: p.id === activeProfile.id ? 'rgba(0, 245, 155, 0.1)' : 'transparent',
                          color: p.id === activeProfile.id ? 'var(--neon-green)' : 'var(--text-main)',
                          border: 'none',
                          borderRadius: '0.5rem',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          textAlign: 'left',
                          fontFamily: 'inherit',
                        }}
                        onClick={() => {
                          onSelectProfile(p.id);
                          setDropdownOpen(false);
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span>{p.avatar}</span>
                          <span style={{ fontWeight: 600 }}>{p.name}</span>
                          {p.role === 'admin' && (
                            <span className="badge badge-purple" style={{ fontSize: '0.6rem', padding: '0.05rem 0.25rem' }}>
                              Admin
                            </span>
                          )}
                        </div>
                        {p.id === activeProfile.id && <Check size={14} />}
                      </button>
                    ))}
                    
                    <div style={{ height: '1px', background: 'var(--border-color)', margin: '0.35rem 0' }} />

                    <button
                      className="flex items-center gap-2"
                      style={{
                        width: '100%',
                        padding: '0.45rem 0.6rem',
                        background: 'transparent',
                        color: 'var(--neon-green)',
                        border: 'none',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        textAlign: 'left',
                        fontFamily: 'inherit',
                        fontWeight: 600
                      }}
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenNewProfile();
                      }}
                    >
                      <Plus size={15} />
                      <span>新增成員檔案</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Settings Button */}
            <button
              className="btn btn-secondary btn-icon"
              title="雲端設定與資料管理"
              onClick={onOpenSettings}
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav">
        <button
          className={`mobile-nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <LayoutDashboard size={20} />
          <span>總覽</span>
        </button>
        <button
          className={`mobile-nav-btn ${activeTab === 'workout' ? 'active' : ''}`}
          onClick={() => setActiveTab('workout')}
        >
          <Dumbbell size={20} />
          <span>訓練課表</span>
        </button>
        <button
          className={`mobile-nav-btn ${activeTab === 'diet' ? 'active' : ''}`}
          onClick={() => setActiveTab('diet')}
        >
          <Utensils size={20} />
          <span>飲食三大素</span>
        </button>
        <button
          className={`mobile-nav-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <LineChart size={20} />
          <span>分析</span>
        </button>
      </nav>
    </>
  );
};
