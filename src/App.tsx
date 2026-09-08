import React, { useState, useEffect } from 'react';
import type { UserProfile } from './types';
import { StorageService } from './services/storage';
import { getSupabaseClient, SupabaseSyncService } from './services/supabase';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { WorkoutTrackerView } from './components/WorkoutTrackerView';
import { DietTrackerView } from './components/DietTrackerView';
import { AnalyticsView } from './components/AnalyticsView';
import { RestTimerWidget } from './components/RestTimerWidget';
import { ProfileModal } from './components/ProfileModal';
import { SettingsModal } from './components/SettingsModal';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'workout' | 'diet' | 'analytics'>('dashboard');

  // Multi-user profiles state
  const [profiles, setProfiles] = useState<UserProfile[]>(() => StorageService.getProfiles());
  const [activeProfileId, setActiveProfileId] = useState<string>(() => StorageService.getActiveProfileId());
  const [activeProfile, setActiveProfile] = useState<UserProfile>(() => StorageService.getActiveProfile());

  // Modals state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);

  // Floating Rest Timer
  const [restTimerSeconds, setRestTimerSeconds] = useState<number | null>(null);

  // Cloud & sync status
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Refresh active profile whenever ID or profiles change
  useEffect(() => {
    const p = profiles.find(item => item.id === activeProfileId) || profiles[0];
    if (p) {
      setActiveProfile(p);
      StorageService.setActiveProfileId(p.id);
    }
  }, [activeProfileId, profiles]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    const res = await SupabaseSyncService.syncAllFromCloud();
    if (res.success) {
      handleReloadAllData();
    }
    setIsSyncing(false);
    return res;
  };

  // Check Supabase connection and auto-sync on mount
  useEffect(() => {
    const client = getSupabaseClient();
    const connected = Boolean(client);
    setIsCloudConnected(connected);

    if (connected) {
      handleManualSync();
    }
  }, []);

  const handleSelectProfile = (id: string) => {
    setActiveProfileId(id);
    StorageService.setActiveProfileId(id);
  };

  const handleOpenNewProfile = () => {
    setEditingProfile(null);
    setIsProfileModalOpen(true);
  };

  const handleOpenEditProfile = (profileToEdit: UserProfile) => {
    setEditingProfile(profileToEdit);
    setIsProfileModalOpen(true);
  };

  const handleSaveProfile = (savedProfile: UserProfile) => {
    StorageService.saveProfile(savedProfile);
    const updated = StorageService.getProfiles();
    setProfiles(updated);
    setActiveProfileId(savedProfile.id);
  };

  const handleReloadAllData = () => {
    const updatedProfiles = StorageService.getProfiles();
    setProfiles(updatedProfiles);
    const currentActiveId = StorageService.getActiveProfileId();
    setActiveProfileId(currentActiveId);
    setActiveProfile(StorageService.getActiveProfile());
  };

  const handleStartRestTimer = (seconds: number) => {
    setRestTimerSeconds(seconds);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        profiles={profiles}
        activeProfile={activeProfile}
        onSelectProfile={handleSelectProfile}
        onOpenNewProfile={handleOpenNewProfile}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        isCloudConnected={isCloudConnected}
        isSyncing={isSyncing}
        onManualSync={handleManualSync}
      />

      {/* Main Content Area */}
      <main className="app-container" style={{ flex: 1 }}>
        {activeTab === 'dashboard' && (
          <DashboardView
            activeProfile={activeProfile}
            profiles={profiles}
            onSelectProfile={handleSelectProfile}
            onNavigate={setActiveTab}
            onOpenProfileEdit={() => handleOpenEditProfile(activeProfile)}
            onStartRestTimer={handleStartRestTimer}
          />
        )}

        {activeTab === 'workout' && (
          <WorkoutTrackerView
            activeProfile={activeProfile}
            onStartRestTimer={handleStartRestTimer}
          />
        )}

        {activeTab === 'diet' && (
          <DietTrackerView
            activeProfile={activeProfile}
            onOpenProfileEdit={() => handleOpenEditProfile(activeProfile)}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView activeProfile={activeProfile} />
        )}
      </main>

      {/* Floating Rest Timer Widget */}
      {restTimerSeconds !== null && (
        <RestTimerWidget
          initialSeconds={restTimerSeconds}
          onClose={() => setRestTimerSeconds(null)}
        />
      )}

      {/* Profile Create / Edit Modal */}
      {isProfileModalOpen && (
        <ProfileModal
          profile={editingProfile}
          onClose={() => setIsProfileModalOpen(false)}
          onSave={handleSaveProfile}
        />
      )}

      {/* Settings & Multi-User & Cloud Modal */}
      {isSettingsModalOpen && (
        <SettingsModal
          onClose={() => setIsSettingsModalOpen(false)}
          profiles={profiles}
          activeProfileId={activeProfileId}
          onSelectProfile={handleSelectProfile}
          onEditProfile={handleOpenEditProfile}
          onAddNewProfile={handleOpenNewProfile}
          onReloadAllData={handleReloadAllData}
          onManualSync={handleManualSync}
          onCloudStatusChange={(c: boolean) => setIsCloudConnected(c)}
        />
      )}
    </div>
  );
};

export default App;
