import React, { useState, useMemo } from 'react';
import { X, Sparkles, User } from 'lucide-react';
import type { ActivityLevel, FitnessGoal, Gender, UserProfile } from '../types';
import {
  ACTIVITY_MULTIPLIERS,
  calculateBMI,
  calculateBMR,
  calculateRecommendedMacros,
  calculateTDEE,
  GOAL_CONFIGS,
} from '../utils/nutrition';

interface ProfileModalProps {
  profile?: UserProfile | null;
  onClose: () => void;
  onSave: (profile: UserProfile) => void;
}

const AVATAR_OPTIONS = ['🏋️‍♂️', '🏃‍♀️', '🥊', '🚴‍♂️', '🧘‍♀️', '💪', '🔥', '⚡', '🦁', '🥑'];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  profile,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(profile?.name || '');
  const [avatar, setAvatar] = useState(profile?.avatar || '🏋️‍♂️');
  const [gender, setGender] = useState<Gender>(profile?.gender || 'male');
  const [age, setAge] = useState<number>(profile?.age || 26);
  const [heightCm, setHeightCm] = useState<number>(profile?.heightCm || 175);
  const [weightKg, setWeightKg] = useState<number>(profile?.weightKg || 70);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(profile?.activityLevel || 'moderate');
  const [goal, setGoal] = useState<FitnessGoal>(profile?.goal || 'maintain');

  const [useCustomMacros, setUseCustomMacros] = useState<boolean>(Boolean(profile?.customCalories));
  const [customCalories, setCustomCalories] = useState<number>(profile?.customCalories || 2400);
  const [customProtein, setCustomProtein] = useState<number>(profile?.customProteinGrams || 140);
  const [customCarbs, setCustomCarbs] = useState<number>(profile?.customCarbsGrams || 280);
  const [customFat, setCustomFat] = useState<number>(profile?.customFatGrams || 65);

  // 計算即時指標
  const liveBMR = useMemo(() => calculateBMR(gender, weightKg, heightCm, age), [gender, weightKg, heightCm, age]);
  const liveTDEE = useMemo(() => calculateTDEE(liveBMR, activityLevel), [liveBMR, activityLevel]);
  const liveBMI = useMemo(() => calculateBMI(weightKg, heightCm), [weightKg, heightCm]);

  const autoTargetCals = useMemo(() => {
    const offset = GOAL_CONFIGS[goal].calorieOffset;
    return Math.max(1200, liveTDEE + offset);
  }, [liveTDEE, goal]);

  const recommendedMacros = useMemo(() => {
    const targetCals = useCustomMacros ? customCalories : autoTargetCals;
    return calculateRecommendedMacros(targetCals, weightKg, goal);
  }, [useCustomMacros, customCalories, autoTargetCals, weightKg, goal]);

  const handleApplyRecommended = () => {
    setCustomCalories(autoTargetCals);
    setCustomProtein(recommendedMacros.proteinGrams);
    setCustomCarbs(recommendedMacros.carbsGrams);
    setCustomFat(recommendedMacros.fatGrams);
    setUseCustomMacros(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newProfile: UserProfile = {
      id: profile?.id || `user-${Date.now()}`,
      name: name.trim(),
      avatar,
      gender,
      age: Number(age),
      heightCm: Number(heightCm),
      weightKg: Number(weightKg),
      activityLevel,
      goal,
      customCalories: useCustomMacros ? Number(customCalories) : autoTargetCals,
      customProteinGrams: useCustomMacros ? Number(customProtein) : recommendedMacros.proteinGrams,
      customCarbsGrams: useCustomMacros ? Number(customCarbs) : recommendedMacros.carbsGrams,
      customFatGrams: useCustomMacros ? Number(customFat) : recommendedMacros.fatGrams,
      createdAt: profile?.createdAt || new Date().toISOString(),
    };

    onSave(newProfile);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <User className="logo-accent" size={20} />
            <h2 className="modal-title">{profile ? '編輯個人健康檔案' : '建立新使用者檔案'}</h2>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body flex flex-col gap-4">
            {/* Avatar & Name */}
            <div className="grid-cols-2 grid-responsive-2 gap-4">
              <div>
                <label className="label">使用者暱稱</label>
                <input
                  type="text"
                  className="input"
                  placeholder="例如: Shawn, 健身阿強"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="label">頭像圖標</label>
                <div className="flex items-center gap-1 flex-wrap">
                  {AVATAR_OPTIONS.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      style={{
                        fontSize: '1.25rem',
                        padding: '0.2rem 0.4rem',
                        borderRadius: '0.4rem',
                        background: avatar === emoji ? 'rgba(0, 245, 155, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        border: `1px solid ${avatar === emoji ? 'var(--neon-green)' : 'transparent'}`,
                        cursor: 'pointer',
                      }}
                      onClick={() => setAvatar(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Gender, Age, Height, Weight */}
            <div className="grid-cols-4 grid-responsive-2 gap-3">
              <div>
                <label className="label">生理性別</label>
                <select
                  className="select"
                  value={gender}
                  onChange={e => setGender(e.target.value as Gender)}
                >
                  <option value="male">男性 ♂</option>
                  <option value="female">女性 ♀</option>
                </select>
              </div>
              <div>
                <label className="label">年齡 (歲)</label>
                <input
                  type="number"
                  className="input"
                  value={age}
                  min={10}
                  max={100}
                  onChange={e => setAge(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="label">身高 (cm)</label>
                <input
                  type="number"
                  className="input"
                  value={heightCm}
                  min={100}
                  max={230}
                  onChange={e => setHeightCm(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="label">體重 (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  className="input"
                  value={weightKg}
                  min={30}
                  max={250}
                  onChange={e => setWeightKg(Number(e.target.value))}
                />
              </div>
            </div>

            {/* Activity Level & Goal */}
            <div className="grid-cols-2 grid-responsive-2 gap-4">
              <div>
                <label className="label">日常運動/活動量</label>
                <select
                  className="select"
                  value={activityLevel}
                  onChange={e => setActivityLevel(e.target.value as ActivityLevel)}
                >
                  {Object.entries(ACTIVITY_MULTIPLIERS).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
                  {ACTIVITY_MULTIPLIERS[activityLevel].desc}
                </div>
              </div>

              <div>
                <label className="label">目前健身目標</label>
                <select
                  className="select"
                  value={goal}
                  onChange={e => setGoal(e.target.value as FitnessGoal)}
                >
                  {Object.entries(GOAL_CONFIGS).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
                  {GOAL_CONFIGS[goal].desc}
                </div>
              </div>
            </div>

            {/* Real-time Calculation Summary Card */}
            <div style={{
              background: 'rgba(0, 245, 155, 0.05)',
              border: '1px solid rgba(0, 245, 155, 0.2)',
              borderRadius: '0.85rem',
              padding: '1rem',
            }}>
              <div className="flex items-center justify-between" style={{ marginBottom: '0.75rem' }}>
                <div className="flex items-center gap-2">
                  <Sparkles size={16} style={{ color: 'var(--neon-green)' }} />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--neon-green)' }}>
                    科學健康指標即時試算 (Mifflin-St Jeor)
                  </span>
                </div>
                <span className={`badge ${liveBMI.color.replace('text-', 'badge-')}`}>
                  BMI: {liveBMI.bmi} ({liveBMI.label})
                </span>
              </div>

              <div className="grid-cols-3 grid-responsive-3 gap-3" style={{ textAlign: 'center' }}>
                <div style={{ background: 'rgba(12, 19, 34, 0.6)', padding: '0.6rem', borderRadius: '0.6rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>基礎代謝 BMR</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>{liveBMR} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>kcal</span></div>
                </div>

                <div style={{ background: 'rgba(12, 19, 34, 0.6)', padding: '0.6rem', borderRadius: '0.6rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>總熱量消耗 TDEE</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--neon-cyan)' }}>{liveTDEE} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>kcal</span></div>
                </div>

                <div style={{ background: 'rgba(12, 19, 34, 0.6)', padding: '0.6rem', borderRadius: '0.6rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>建議目標熱量</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--neon-green)' }}>{autoTargetCals} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>kcal</span></div>
                </div>
              </div>

              {/* Recommended Macros Preview */}
              <div style={{ marginTop: '0.75rem', fontSize: '0.8rem' }} className="flex justify-between items-center text-muted">
                <span>建議三大營養素配比：</span>
                <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                  蛋白質 <strong style={{ color: 'var(--neon-emerald)' }}>{recommendedMacros.proteinGrams}g</strong> · 
                  碳水 <strong style={{ color: 'var(--neon-cyan)' }}>{recommendedMacros.carbsGrams}g</strong> · 
                  脂肪 <strong style={{ color: 'var(--neon-amber)' }}>{recommendedMacros.fatGrams}g</strong>
                </span>
              </div>
            </div>

            {/* Custom Macro Targets Toggle */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
              <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
                <label className="flex items-center gap-2" style={{ cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={useCustomMacros}
                    onChange={e => {
                      setUseCustomMacros(e.target.checked);
                      if (e.target.checked && !profile?.customCalories) {
                        setCustomCalories(autoTargetCals);
                        setCustomProtein(recommendedMacros.proteinGrams);
                        setCustomCarbs(recommendedMacros.carbsGrams);
                        setCustomFat(recommendedMacros.fatGrams);
                      }
                    }}
                  />
                  <span>手動自訂每日熱量與三大元素目標 (專家進階模式)</span>
                </label>
                {useCustomMacros && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleApplyRecommended}
                  >
                    套用系統建議值
                  </button>
                )}
              </div>

              {useCustomMacros && (
                <div className="grid-cols-4 grid-responsive-2 gap-3" style={{ marginTop: '0.75rem' }}>
                  <div>
                    <label className="label">目標熱量 (kcal)</label>
                    <input
                      type="number"
                      className="input"
                      value={customCalories}
                      onChange={e => setCustomCalories(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="label">蛋白質 (g, 4kcal/g)</label>
                    <input
                      type="number"
                      className="input"
                      value={customProtein}
                      onChange={e => setCustomProtein(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="label">碳水 (g, 4kcal/g)</label>
                    <input
                      type="number"
                      className="input"
                      value={customCarbs}
                      onChange={e => setCustomCarbs(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="label">脂肪 (g, 9kcal/g)</label>
                    <input
                      type="number"
                      className="input"
                      value={customFat}
                      onChange={e => setCustomFat(Number(e.target.value))}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary">
              儲存檔案
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
