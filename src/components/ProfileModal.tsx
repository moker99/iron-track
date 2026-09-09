import React, { useState, useMemo } from 'react';
import { X, Sparkles, User, Flame, Eye, EyeOff } from 'lucide-react';
import type { ActivityLevel, FitnessGoal, Gender, UserProfile, DietProtocol, CarbCyclingPhase, WeeklyTrainingHours } from '../types';
import { StorageService } from '../services/storage';
import {
  ACTIVITY_MULTIPLIERS,
  calculateBMI,
  calculateBMR,
  calculateRecommendedMacros,
  calculateTDEE,
  GOAL_CONFIGS,
  getSprint40DayConfig,
  getTanCarbCyclingConfig,
  getThreeMonthsConfig,
} from '../utils/nutrition';
import { NumberInput } from './NumberInput';

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
  const [age, setAge] = useState<number>(profile?.age ?? 0);
  const [heightCm, setHeightCm] = useState<number>(profile?.heightCm ?? 0);
  const [weightKg, setWeightKg] = useState<number>(profile?.weightKg ?? 0);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(profile?.activityLevel || 'moderate');
  const [goal, setGoal] = useState<FitnessGoal>(profile?.goal || 'maintain');
  const [role, setRole] = useState<'admin' | 'member'>(profile?.role || 'member');
  const [password, setPassword] = useState<string>(profile?.password || profile?.pinCode || (role === 'admin' ? '8888' : '1234'));
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // 飲食方案策略
  const [dietProtocol, setDietProtocol] = useState<DietProtocol>(profile?.dietProtocol || 'tan_carb_cycling');
  const [carbCyclingPhase, setCarbCyclingPhase] = useState<CarbCyclingPhase>(profile?.carbCyclingPhase || 'baseline');
  const [tanBaselineCarb, setTanBaselineCarb] = useState<number>(profile?.tanBaselineCarbRatio ?? 3.0);
  const [tanBaselineProtein, setTanBaselineProtein] = useState<number>(profile?.tanBaselineProteinRatio ?? 1.6);
  const [tanBaselineFat, setTanBaselineFat] = useState<number>(profile?.tanBaselineFatRatio ?? 0.7);
  const [sprintStartDate, setSprintStartDate] = useState<string>(
    profile?.sprintStartDate || new Date().toISOString().split('T')[0]
  );
  const [sprintManualDay, setSprintManualDay] = useState<number>(profile?.sprintManualDay || 1);
  const [weeklyTrainingHours, setWeeklyTrainingHours] = useState<WeeklyTrainingHours>(
    profile?.weeklyTrainingHours || '4-5'
  );
  const [threeMonthsStartDate, setThreeMonthsStartDate] = useState<string>(
    profile?.threeMonthsStartDate || new Date().toISOString().split('T')[0]
  );
  const [threeMonthsManualWeek, setThreeMonthsManualWeek] = useState<number>(profile?.threeMonthsManualWeek || 1);

  const [useCustomMacros, setUseCustomMacros] = useState<boolean>(Boolean(profile?.customCalories));
  const [customCalories, setCustomCalories] = useState<number>(profile?.customCalories ?? 0);
  const [customProtein, setCustomProtein] = useState<number>(profile?.customProteinGrams ?? 0);
  const [customCarbs, setCustomCarbs] = useState<number>(profile?.customCarbsGrams ?? 0);
  const [customFat, setCustomFat] = useState<number>(profile?.customFatGrams ?? 0);

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

  // 依據選擇的飲食方案即時計算三大營養素目標
  const liveProtocolTargets = useMemo(() => {
    if (dietProtocol === 'sprint_40d') {
      const sprint = getSprint40DayConfig(sprintManualDay, gender);
      const p = Math.round(weightKg * sprint.proteinRatio);
      const c = Math.round(weightKg * sprint.carbRatio);
      const f = Math.round(weightKg * sprint.fatRatio);
      const calories = (p * 4) + (c * 4) + (f * 9);
      return {
        calories,
        protein: p,
        carbs: c,
        fat: f,
        title: `40天固定衝刺 · 第 ${sprintManualDay} 天 (${sprint.stageName})`,
        notes: sprint.notes,
        isHighCarb: sprint.isHighCarb,
      };
    }
    if (dietProtocol === 'tan_carb_cycling') {
      const cycle = getTanCarbCyclingConfig(carbCyclingPhase, {
        carbRatio: tanBaselineCarb,
        proteinRatio: tanBaselineProtein,
        fatRatio: tanBaselineFat,
      });
      const p = Math.round(weightKg * cycle.proteinRatio);
      const c = Math.round(weightKg * cycle.carbRatio);
      const f = Math.round(weightKg * cycle.fatRatio);
      const calories = (p * 4) + (c * 4) + (f * 9);
      return {
        calories,
        protein: p,
        carbs: c,
        fat: f,
        title: `焚訣動態碳水循環 (${cycle.phaseLabel})`,
        notes: `${cycle.mindsetAdvice} (${cycle.cardioAdvice})`,
        isHighCarb: carbCyclingPhase === 'high_carb',
      };
    }
    if (dietProtocol === 'dynamic_3months') {
      const tm = getThreeMonthsConfig(weeklyTrainingHours, gender);
      const p = Math.round(weightKg * tm.proteinRatio);
      const c = Math.round(weightKg * tm.carbRatio);
      const f = Math.round(weightKg * tm.fatRatio);
      const calories = (p * 4) + (c * 4) + (f * 9);
      return {
        calories,
        protein: p,
        carbs: c,
        fat: f,
        title: `三個月動態減脂 · ${tm.hoursLabel} (${gender === 'female' ? '女性專屬係數' : '男性專屬係數'})`,
        notes: `碳水 ${tm.carbRatio}g/kg, 蛋白質 ${tm.proteinRatio}g/kg, 脂肪 ${tm.fatRatio}g/kg。${tm.notes}`,
        isHighCarb: false,
      };
    }
    // standard
    return {
      calories: autoTargetCals,
      protein: recommendedMacros.proteinGrams,
      carbs: recommendedMacros.carbsGrams,
      fat: recommendedMacros.fatGrams,
      title: '傳統標準均衡模式 (BMR / TDEE)',
      notes: GOAL_CONFIGS[goal].desc,
      isHighCarb: false,
    };
  }, [
    dietProtocol,
    sprintManualDay,
    carbCyclingPhase,
    tanBaselineCarb,
    tanBaselineProtein,
    tanBaselineFat,
    weeklyTrainingHours,
    gender,
    weightKg,
    autoTargetCals,
    recommendedMacros,
    goal,
  ]);

  const handleApplyRecommended = () => {
    setCustomCalories(liveProtocolTargets.calories);
    setCustomProtein(liveProtocolTargets.protein);
    setCustomCarbs(liveProtocolTargets.carbs);
    setCustomFat(liveProtocolTargets.fat);
    setUseCustomMacros(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // 防止同名重複建立新成員
    const allProfiles = StorageService.getProfiles();
    const isDuplicate = allProfiles.some(
      p => p.id !== profile?.id && p.name.trim().toLowerCase() === name.trim().toLowerCase()
    );
    if (isDuplicate) {
      alert(`已存在同名的成員「${name.trim()}」！若要修改資料請至設定中「編輯」該成員，請勿重複新增。`);
      return;
    }

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
      role,
      password: password.trim() || (role === 'admin' ? '8888' : '1234'),
      pinCode: password.trim() || (role === 'admin' ? '8888' : '1234'),

      dietProtocol,
      carbCyclingPhase,
      tanBaselineCarbRatio: tanBaselineCarb,
      tanBaselineProteinRatio: tanBaselineProtein,
      tanBaselineFatRatio: tanBaselineFat,
      sprintStartDate,
      sprintManualDay: Number(sprintManualDay),
      weeklyTrainingHours,
      threeMonthsStartDate,
      threeMonthsManualWeek: Number(threeMonthsManualWeek),

      customCalories: useCustomMacros ? Number(customCalories) : undefined,
      customProteinGrams: useCustomMacros ? Number(customProtein) : undefined,
      customCarbsGrams: useCustomMacros ? Number(customCarbs) : undefined,
      customFatGrams: useCustomMacros ? Number(customFat) : undefined,
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
            <User size={20} className="logo-accent" />
            <h3 className="modal-title">{profile ? '編輯成員資料' : '新增團隊成員'}</h3>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body flex flex-col gap-4">
            {/* Avatar & Name */}
            <div className="flex gap-4 items-center">
              <div style={{ textAlign: 'center' }}>
                <label className="label">代表頭像</label>
                <div style={{
                  fontSize: '2.5rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '1rem',
                  width: '64px',
                  height: '64px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {avatar}
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <label className="label">成員稱呼 / 姓名</label>
                <input
                  type="text"
                  className="input"
                  placeholder="例如: Shawn、Alex、小明"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />

                <div className="flex gap-1 flex-wrap" style={{ marginTop: '0.5rem' }}>
                  {AVATAR_OPTIONS.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      style={{
                        fontSize: '1.1rem',
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

            {/* Role: Admin vs Member */}
            <div style={{
              background: 'rgba(18, 26, 43, 0.7)',
              padding: '0.85rem',
              borderRadius: '0.75rem',
              border: '1px solid var(--border-color)',
            }}>
              <label className="label" style={{ marginBottom: '0.4rem' }}>成員權限角色</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button
                  type="button"
                  className={`btn btn-sm ${role === 'member' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ justifyContent: 'center' }}
                  onClick={() => setRole('member')}
                >
                  🛡️ 一般成員 (Member)
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${role === 'admin' ? 'btn-purple' : 'btn-secondary'}`}
                  style={{ justifyContent: 'center' }}
                  onClick={() => setRole('admin')}
                >
                  👑 團隊管理者 (Admin)
                </button>
              </div>
              <div style={{ fontSize: '0.73rem', color: 'var(--text-dim)', marginTop: '0.35rem' }}>
                {role === 'admin'
                  ? '👑 管理員特權：可新增與管理所有成員、查閱 5 人全體日誌，並可設定雲端資料庫'
                  : '🛡️ 一般成員：專注於記錄自己的課表與飲食，無法新增其他成員或進入雲端後台'}
              </div>
            </div>

            {/* 通行密碼設定 */}
            <div style={{
              background: 'rgba(18, 26, 43, 0.7)',
              padding: '0.85rem',
              borderRadius: '0.75rem',
              border: '1px solid var(--border-color)',
            }}>
              <div className="flex items-center justify-between" style={{ marginBottom: '0.35rem' }}>
                <label className="label" style={{ marginBottom: 0 }}>
                  🔑 個人通行密碼 (自由自訂，支援英文、數字與符號)
                </label>
                <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>
                  {role === 'admin' ? 'Admin' : '隊員'}
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  style={{ paddingRight: '2.5rem' }}
                  placeholder={role === 'admin' ? '請輸入管理員密碼 (可自選任意英文/數字)' : '請輸入成員登入密碼 (可自選任意英文/數字)'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-icon btn-sm"
                  style={{
                    position: 'absolute',
                    right: '0.5rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)'
                  }}
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? '隱藏密碼' : '顯示密碼'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div style={{ fontSize: '0.73rem', color: 'var(--text-dim)', marginTop: '0.35rem' }}>
                {role === 'admin'
                  ? '隊長管理員通行密碼，任何裝置欲切換至 Admin 均需輸入此密碼（支援任意文字與符號）。'
                  : '成員登入密碼，任何裝置切換至此成員時只要輸入相符密碼即可登入。'}
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
                <NumberInput
                  className="input"
                  value={age}
                  min={0}
                  max={120}
                  placeholder="0"
                  onChange={setAge}
                />
              </div>
              <div>
                <label className="label">身高 (cm)</label>
                <NumberInput
                  className="input"
                  value={heightCm}
                  min={0}
                  max={250}
                  placeholder="0"
                  onChange={setHeightCm}
                />
              </div>
              <div>
                <label className="label">體重 (kg)</label>
                <NumberInput
                  step="0.1"
                  className="input"
                  value={weightKg}
                  min={0}
                  max={300}
                  placeholder="0"
                  onChange={setWeightKg}
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

            {/* Diet Protocol Strategy Selector */}
            <div style={{
              background: 'rgba(18, 26, 43, 0.7)',
              padding: '1rem',
              borderRadius: '0.85rem',
              border: '1px solid var(--border-color)',
            }}>
              <div className="flex items-center justify-between" style={{ marginBottom: '0.75rem' }}>
                <div className="flex items-center gap-2">
                  <Flame size={18} style={{ color: 'var(--neon-green)' }} />
                  <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>
                    飲食計劃與體態策略 (Diet Protocol)
                  </span>
                </div>
                <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>
                  科學化係數
                </span>
              </div>

              {/* Protocol Grid Selection */}
              <div className="flex flex-col gap-2.5">
                {/* 1. 譚成義 · 焚訣動態碳水循環 */}
                <button
                  type="button"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.75rem',
                    background: dietProtocol === 'tan_carb_cycling' ? 'rgba(0, 245, 155, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                    border: `1px solid ${dietProtocol === 'tan_carb_cycling' ? 'var(--neon-green)' : 'var(--border-color)'}`,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                  }}
                  onClick={() => setDietProtocol('tan_carb_cycling')}
                >
                  <div className="flex items-center justify-between" style={{ width: '100%', marginBottom: '0.2rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: dietProtocol === 'tan_carb_cycling' ? 'var(--neon-green)' : 'var(--text-main)' }}>
                      🍚 焚訣動態碳水循環 (增肌 / 增肌減脂同步)
                    </span>
                    {dietProtocol === 'tan_carb_cycling' && <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>已選擇</span>}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    基數：碳水 2.5~3.5 g/kg · 蛋白 1.2~2.0 g/kg · 脂肪 0.6~0.8 g/kg。平時保持微飢餓感抗炎，訓練高碳日 +0.5倍降蛋白，休息低碳日 -0.5倍增蛋白。
                  </div>
                </button>

                {/* 2. 40 天固定衝刺階段表 */}
                <button
                  type="button"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.75rem',
                    background: dietProtocol === 'sprint_40d' ? 'rgba(244, 63, 94, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                    border: `1px solid ${dietProtocol === 'sprint_40d' ? 'var(--neon-rose)' : 'var(--border-color)'}`,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                  }}
                  onClick={() => setDietProtocol('sprint_40d')}
                >
                  <div className="flex items-center justify-between" style={{ width: '100%', marginBottom: '0.2rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: dietProtocol === 'sprint_40d' ? 'var(--neon-rose)' : 'var(--text-main)' }}>
                      ⚡ 40 天固定衝刺階段表 (分男/女階梯式極速減脂)
                    </span>
                    {dietProtocol === 'sprint_40d' && <span className="badge badge-rose" style={{ fontSize: '0.65rem' }}>已選擇</span>}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    獨立 40 天嚴格階段表：男/女脂肪係數差異 (0.4 vs 0.5~0.6)，第 12、24、36 天為高碳充碳日 (喚醒代謝與瘦素，嚴禁放縱)。
                  </div>
                </button>

                {/* 3. 三個月動態減脂方案 */}
                <button
                  type="button"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.75rem',
                    background: dietProtocol === 'dynamic_3months' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                    border: `1px solid ${dietProtocol === 'dynamic_3months' ? 'var(--neon-purple)' : 'var(--border-color)'}`,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                  }}
                  onClick={() => setDietProtocol('dynamic_3months')}
                >
                  <div className="flex items-center justify-between" style={{ width: '100%', marginBottom: '0.2rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: dietProtocol === 'dynamic_3months' ? 'var(--neon-purple)' : 'var(--text-main)' }}>
                      📅 三個月動態減脂方案 (12 週長期週期化)
                    </span>
                    {dietProtocol === 'dynamic_3months' && <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>已選擇</span>}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    分 3 大週期：第 1 個月代謝啟動、第 2 個月深化燃脂 (含 Week 8 Diet Break)、第 3 個月塑形突破 (Week 12 結算)。
                  </div>
                </button>

                {/* 4. 傳統標準均衡模式 */}
                <button
                  type="button"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.75rem',
                    background: dietProtocol === 'standard' ? 'rgba(6, 182, 212, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                    border: `1px solid ${dietProtocol === 'standard' ? 'var(--neon-cyan)' : 'var(--border-color)'}`,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                  }}
                  onClick={() => setDietProtocol('standard')}
                >
                  <div className="flex items-center justify-between" style={{ width: '100%', marginBottom: '0.2rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: dietProtocol === 'standard' ? 'var(--neon-cyan)' : 'var(--text-main)' }}>
                      ⚖️ 傳統標準均衡模式 (BMR / TDEE 熱量赤字/盈餘)
                    </span>
                    {dietProtocol === 'standard' && <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>已選擇</span>}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    依據 Mifflin-St Jeor 公式計算 TDEE，手動或自動加減熱量缺口與傳統三大元素比例。
                  </div>
                </button>
              </div>

              {/* Protocol Contextual Controls */}
              {dietProtocol === 'sprint_40d' && (
                <div style={{ marginTop: '0.85rem', background: 'rgba(244, 63, 94, 0.06)', border: '1px solid rgba(244, 63, 94, 0.2)', padding: '0.75rem', borderRadius: '0.6rem' }}>
                  <div className="grid-cols-2 grid-responsive-2 gap-3">
                    <div>
                      <label className="label">衝刺起始日 (Day 1)</label>
                      <input
                        type="date"
                        className="input"
                        value={sprintStartDate}
                        onChange={e => setSprintStartDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="label">手動指定當前天數 (1~40 天)</label>
                      <NumberInput
                        min={1}
                        max={40}
                        className="input"
                        value={sprintManualDay}
                        placeholder="1"
                        onChange={val => setSprintManualDay(Math.min(40, Math.max(1, val || 1)))}
                      />
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--neon-rose)', marginTop: '0.4rem' }}>
                    🔥 提醒：第 12、24、36 天為高碳充碳日！當前性別：{gender === 'male' ? '男 (脂肪係數 0.4~0.5)' : '女 (脂肪係數 0.5~0.6)'}。
                  </div>
                </div>
              )}

              {dietProtocol === 'tan_carb_cycling' && (
                <div style={{ marginTop: '0.85rem', background: 'rgba(0, 245, 155, 0.06)', border: '1px solid rgba(0, 245, 155, 0.2)', padding: '0.85rem', borderRadius: '0.75rem' }}>
                  <label className="label">預設初始日常狀態</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${carbCyclingPhase === 'baseline' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.75rem' }}
                      onClick={() => setCarbCyclingPhase('baseline')}
                    >
                      🍚 基準日 ({tanBaselineCarb}g/kg)
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${carbCyclingPhase === 'high_carb' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.75rem' }}
                      onClick={() => setCarbCyclingPhase('high_carb')}
                    >
                      🚀 高碳日 (+0.5倍)
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${carbCyclingPhase === 'low_carb' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.75rem' }}
                      onClick={() => setCarbCyclingPhase('low_carb')}
                    >
                      🛡️ 休息低碳 (-0.5倍)
                    </button>
                  </div>

                  {/* 自訂動態基準輸入 */}
                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.65rem' }}>
                    <div className="flex items-center justify-between" style={{ marginBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--neon-green)' }}>
                        ⚙️ 焚訣個體化動態基準 (依個人感受與消化反應自訂)
                      </span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}
                        onClick={() => {
                          setTanBaselineCarb(3.0);
                          setTanBaselineProtein(1.6);
                          setTanBaselineFat(0.7);
                        }}
                      >
                        恢復建議預設 (3.0 / 1.6 / 0.7)
                      </button>
                    </div>

                    <div className="grid-cols-3 grid-responsive-1 gap-2.5">
                      <div>
                        <label className="label" style={{ fontSize: '0.72rem', marginBottom: '0.2rem' }}>
                          碳水基準 (建議 2.5~3.5)
                        </label>
                        <NumberInput
                          value={tanBaselineCarb}
                          step={0.1}
                          min={1.5}
                          max={6.0}
                          placeholder="3.0"
                          onChange={val => setTanBaselineCarb(val || 3.0)}
                        />
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                          吃不下勿硬塞，吸收差宜下調
                        </div>
                      </div>

                      <div>
                        <label className="label" style={{ fontSize: '0.72rem', marginBottom: '0.2rem' }}>
                          蛋白基準 (建議 1.2~2.0)
                        </label>
                        <NumberInput
                          value={tanBaselineProtein}
                          step={0.1}
                          min={0.8}
                          max={3.0}
                          placeholder="1.6"
                          onChange={val => setTanBaselineProtein(val || 1.6)}
                        />
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                          身體反應調整，放屁多臭則減少
                        </div>
                      </div>

                      <div>
                        <label className="label" style={{ fontSize: '0.72rem', marginBottom: '0.2rem' }}>
                          脂肪基準 (建議 0.6~0.8)
                        </label>
                        <NumberInput
                          value={tanBaselineFat}
                          step={0.1}
                          min={0.3}
                          max={2.0}
                          placeholder="0.7"
                          onChange={val => setTanBaselineFat(val || 0.7)}
                        />
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                          以優質 Omega-3+6 為主
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {dietProtocol === 'dynamic_3months' && (
                <div style={{ marginTop: '0.85rem', background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.3)', padding: '0.85rem', borderRadius: '0.75rem' }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
                    <label className="label" style={{ marginBottom: 0, fontWeight: 700, color: 'var(--neon-purple)' }}>
                      ⏱️ 選擇每週訓練/運動時數 (起點依據)
                    </label>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {gender === 'female' ? '女性專屬係數' : '男性專屬係數'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '0.6rem' }}>
                    {(['2-3', '4-5', '6-7', '8-9'] as WeeklyTrainingHours[]).map(hrs => (
                      <button
                        key={hrs}
                        type="button"
                        className={`btn btn-sm ${weeklyTrainingHours === hrs ? 'btn-primary' : 'btn-secondary'}`}
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          flexDirection: 'column',
                          gap: '0.15rem',
                          padding: '0.5rem 0.25rem',
                          borderColor: weeklyTrainingHours === hrs ? 'var(--neon-purple)' : undefined,
                          boxShadow: weeklyTrainingHours === hrs ? '0 0 10px rgba(168, 85, 247, 0.4)' : undefined,
                        }}
                        onClick={() => setWeeklyTrainingHours(hrs)}
                      >
                        <div>{hrs} 小時</div>
                        <div style={{ fontSize: '0.65rem', opacity: 0.8, fontWeight: 400 }}>
                          {hrs === '4-5' ? '推薦起點' : hrs === '2-3' ? '初階起步' : hrs === '6-7' ? '進階規律' : '高容量'}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="grid-cols-2 grid-responsive-2 gap-3" style={{ marginTop: '0.6rem' }}>
                    <div>
                      <label className="label" style={{ fontSize: '0.75rem' }}>計劃起始日 (選填)</label>
                      <input
                        type="date"
                        className="input"
                        style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                        value={threeMonthsStartDate}
                        onChange={e => setThreeMonthsStartDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="label" style={{ fontSize: '0.75rem' }}>當前進度週數 (1~12 週)</label>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        className="input"
                        style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                        value={threeMonthsManualWeek}
                        onChange={e => setThreeMonthsManualWeek(Math.min(12, Math.max(1, Number(e.target.value))))}
                      />
                    </div>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem', lineHeight: 1.4 }}>
                    📌 <strong>起點核心心法</strong>：不是訓練越多就越應該硬壓熱量！從對應訓練量區間開始，執行 <strong>7–10 天後</strong>再按體態與體能回饋調整，不要因為某一天體重波動就立刻改方案。
                  </div>
                </div>
              )}
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
                    當前方案目標試算：{liveProtocolTargets.title}
                  </span>
                </div>
                <span className={`badge ${liveBMI.color.replace('text-', 'badge-')}`}>
                  BMI: {liveBMI.bmi} ({liveBMI.label})
                </span>
              </div>

              <div className="grid-cols-4 grid-responsive-2 gap-3" style={{ textAlign: 'center' }}>
                <div style={{ background: 'rgba(12, 19, 34, 0.6)', padding: '0.6rem', borderRadius: '0.6rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>目標熱量</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--neon-green)' }}>
                    {liveProtocolTargets.calories} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>kcal</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>TDEE {liveTDEE}</div>
                </div>

                <div style={{ background: 'rgba(12, 19, 34, 0.6)', padding: '0.6rem', borderRadius: '0.6rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>蛋白質 (4k/g)</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--neon-emerald)' }}>
                    {liveProtocolTargets.protein} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>g</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                    {weightKg > 0 ? (liveProtocolTargets.protein / weightKg).toFixed(1) : 0} g/kg
                  </div>
                </div>

                <div style={{ background: 'rgba(12, 19, 34, 0.6)', padding: '0.6rem', borderRadius: '0.6rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>碳水 (4k/g)</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--neon-cyan)' }}>
                    {liveProtocolTargets.carbs} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>g</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                    {weightKg > 0 ? (liveProtocolTargets.carbs / weightKg).toFixed(1) : 0} g/kg
                  </div>
                </div>

                <div style={{ background: 'rgba(12, 19, 34, 0.6)', padding: '0.6rem', borderRadius: '0.6rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>脂肪 (9k/g)</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--neon-amber)' }}>
                    {liveProtocolTargets.fat} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>g</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                    {weightKg > 0 ? (liveProtocolTargets.fat / weightKg).toFixed(1) : 0} g/kg
                  </div>
                </div>
              </div>

              {/* Protocol Advice / Notes */}
              <div style={{
                marginTop: '0.75rem',
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }}>
                📌 <strong>執行要點</strong>：{liveProtocolTargets.notes}
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
                    <NumberInput
                      className="input"
                      value={customCalories}
                      min={0}
                      placeholder="0"
                      onChange={setCustomCalories}
                    />
                  </div>
                  <div>
                    <label className="label">蛋白質 (g, 4kcal/g)</label>
                    <NumberInput
                      step="0.1"
                      className="input"
                      value={customProtein}
                      min={0}
                      placeholder="0"
                      onChange={setCustomProtein}
                    />
                  </div>
                  <div>
                    <label className="label">碳水 (g, 4kcal/g)</label>
                    <NumberInput
                      step="0.1"
                      className="input"
                      value={customCarbs}
                      min={0}
                      placeholder="0"
                      onChange={setCustomCarbs}
                    />
                  </div>
                  <div>
                    <label className="label">脂肪 (g, 9kcal/g)</label>
                    <NumberInput
                      step="0.1"
                      className="input"
                      value={customFat}
                      min={0}
                      placeholder="0"
                      onChange={setCustomFat}
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
