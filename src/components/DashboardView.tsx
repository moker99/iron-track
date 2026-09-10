import React, { useMemo } from 'react';
import {
  Flame,
  Dumbbell,
  Utensils,
  Play,
  Plus,
  Award,
  ChevronRight,
  Timer,
  Scale,
} from 'lucide-react';
import type { UserProfile } from '../types';
import { StorageService } from '../services/storage';
import { getUserNutritionTargets } from '../utils/nutrition';

interface DashboardViewProps {
  activeProfile: UserProfile;
  profiles?: UserProfile[];
  onSelectProfile?: (id: string) => void;
  onRequestSwitchProfile?: (target: UserProfile) => void;
  onNavigate: (tab: 'workout' | 'diet' | 'analytics') => void;
  onOpenProfileEdit: () => void;
  onStartRestTimer: (seconds: number) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  activeProfile,
  profiles = [],
  onSelectProfile,
  onRequestSwitchProfile,
  onNavigate,
  onOpenProfileEdit,
  onStartRestTimer,
}) => {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todayMeals = useMemo(() => StorageService.getMealsByDate(activeProfile.id, todayStr), [activeProfile.id, todayStr]);
  const allWorkouts = useMemo(() => StorageService.getWorkoutSessions(activeProfile.id), [activeProfile.id]);
  const todayWorkout = useMemo(() => allWorkouts.find(w => w.date === todayStr), [allWorkouts, todayStr]);
  const prs = useMemo(() => StorageService.getPersonalRecords(activeProfile.id), [activeProfile.id]);

  const todayWeight = useMemo(() => StorageService.getWeightByDate(activeProfile.id, todayStr), [activeProfile.id, todayStr]);
  const targets = useMemo(() => getUserNutritionTargets(activeProfile, {
    effectiveWeightKg: todayWeight?.weightKg || activeProfile.weightKg
  }), [activeProfile, todayWeight]);

  const todayWorkouts = useMemo(() => allWorkouts.filter(w => w.date === todayStr), [allWorkouts, todayStr]);
  const todayWorkoutBurn = useMemo(() => todayWorkouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0), [todayWorkouts]);
  const dynamicTotalBurn = targets.tdee + todayWorkoutBurn;

  // 今日總攝取計算
  const totals = useMemo(() => {
    let cal = 0;
    let p = 0;
    let c = 0;
    let f = 0;
    todayMeals.forEach(m => {
      cal += m.calories;
      p += m.protein;
      c += m.carbs;
      f += m.fat;
    });
    return {
      calories: Math.round(cal),
      protein: Math.round(p * 10) / 10,
      carbs: Math.round(c * 10) / 10,
      fat: Math.round(f * 10) / 10,
      remaining: Math.round(targets.targetCalories - cal),
      percent: Math.min(150, Math.round((cal / targets.targetCalories) * 100)),
      macroCalories: Math.round((p * 4) + (c * 4) + (f * 9)),
      netBalance: Math.round(cal - dynamicTotalBurn),
    };
  }, [todayMeals, targets.targetCalories, dynamicTotalBurn]);

  // 問候語
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 11) return '早安，準備好今天的訓練與營養了嗎？';
    if (hour < 14) return '午安，記得補充足夠蛋白質！';
    if (hour < 18) return '下午好，練前補充碳水能讓表現更強！';
    return '晚安，今晚好好休息修復肌肉！';
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* Hero Header Greeting */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div
            className="flex items-center gap-2"
            style={{ marginBottom: '0.25rem', cursor: 'pointer' }}
            onClick={onOpenProfileEdit}
            title="點擊編輯個人檔案與目標"
          >
            <span style={{ fontSize: '1.5rem' }}>{activeProfile.avatar}</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>{activeProfile.name}</span>
            <span className="badge badge-green">
              {activeProfile.goal === 'gain_muscle' ? '增肌強壯' : activeProfile.goal === 'lose_fat' ? '減脂雕塑' : '體態維持'}
            </span>
            {targets.protocol === 'sprint_40d' && (
              <span className={`badge ${targets.sprintInfo?.isHighCarb ? 'badge-rose' : 'badge-cyan'}`}>
                ⚡ 40天衝刺 Day {targets.sprintInfo?.day} {targets.sprintInfo?.isHighCarb ? '🔥高碳' : ''}
              </span>
            )}
            {targets.protocol === 'tan_carb_cycling' && (
              <span className="badge badge-purple">
                🍚 碳水循環 ({targets.carbCyclingInfo?.phase === 'high_carb' ? '高碳' : targets.carbCyclingInfo?.phase === 'low_carb' ? '低碳' : '基準'})
              </span>
            )}
            {targets.protocol === 'dynamic_3months' && (
              <span className="badge badge-cyan">
                📅 3個月動態 · {targets.threeMonthsInfo?.hoursLabel || '訓練時數'}
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{greeting}</p>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            className="btn btn-secondary btn-sm flex items-center gap-1.5"
            onClick={() => onNavigate('analytics')}
            title="查看體重走勢與每日追蹤"
            style={{
              background: todayWeight ? 'rgba(0, 245, 155, 0.12)' : 'rgba(18, 26, 43, 0.6)',
              borderColor: todayWeight ? 'rgba(0, 245, 155, 0.35)' : 'var(--border-color)',
              color: todayWeight ? 'var(--neon-green)' : 'var(--text-main)',
            }}
          >
            <Scale size={14} style={{ color: todayWeight ? 'var(--neon-green)' : 'var(--text-muted)' }} />
            <span>{todayWeight ? `今日 ${todayWeight.weightKg} kg` : `體重 ${activeProfile.weightKg} kg`}</span>
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => onNavigate('workout')}>
            <Play size={14} />
            <span>開始訓練</span>
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('diet')}>
            <Plus size={14} />
            <span>紀錄飲食</span>
          </button>
        </div>
      </div>

      {/* Hero Calorie & 3-Macro Card */}
      <div className="glass-card glow-green">
        <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginBottom: '1.25rem' }}>
          <div className="flex items-center gap-2">
            <Flame size={22} style={{ color: 'var(--neon-green)' }} />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>今日熱量與三大營養素進度</h2>
            {targets.sprintInfo && (
              <span className={`badge ${targets.sprintInfo.isHighCarb ? 'badge-rose' : 'badge-green'}`} style={{ fontSize: '0.72rem' }}>
                {targets.sprintInfo.stageName}
              </span>
            )}
            {targets.carbCyclingInfo && (
              <span className="badge badge-green" style={{ fontSize: '0.72rem' }}>
                {targets.carbCyclingInfo.phaseLabel}
              </span>
            )}
          </div>

          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--neon-green)' }} onClick={() => onNavigate('diet')}>
            <span>查看分餐明細</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Big Numbers Row */}
        <div className="grid-cols-4 grid-responsive-2 gap-4" style={{ marginBottom: '1.5rem' }}>
          {/* Intake */}
          <div style={{ background: 'rgba(12, 19, 34, 0.6)', padding: '1rem', borderRadius: '0.85rem', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>今日已攝取</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: totals.calories > targets.targetCalories ? 'var(--neon-rose)' : 'var(--neon-green)', lineHeight: 1.2 }}>
              {totals.calories} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>kcal</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
              佔目標預算 {totals.percent}%
            </div>
          </div>

          {/* Total Dynamic Expenditure */}
          <div style={{ background: 'rgba(12, 19, 34, 0.6)', padding: '1rem', borderRadius: '0.85rem', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>今日總消耗熱量</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--neon-amber)', lineHeight: 1.2 }}>
              {dynamicTotalBurn} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>kcal</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
              TDEE {targets.tdee} + 訓練 {todayWorkoutBurn} kcal
            </div>
          </div>

          {/* Net Balance */}
          <div style={{ background: 'rgba(12, 19, 34, 0.6)', padding: '1rem', borderRadius: '0.85rem', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>每日淨熱量平衡</div>
            <div style={{
              fontSize: '1.8rem',
              fontWeight: 900,
              color: totals.netBalance < 0 ? 'var(--neon-green)' : totals.netBalance > 0 ? 'var(--neon-purple)' : 'var(--neon-cyan)',
              lineHeight: 1.2
            }}>
              {totals.netBalance > 0 ? `+${totals.netBalance}` : totals.netBalance} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>kcal</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
              {totals.netBalance < 0 ? `🔥 淨赤字 (減脂中)` : totals.netBalance > 0 ? `💪 淨盈餘 (增肌中)` : `⚖️ 能量收支平衡`}
            </div>
          </div>

          {/* Remaining */}
          <div style={{ background: 'rgba(12, 19, 34, 0.6)', padding: '1rem', borderRadius: '0.85rem', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>剩餘可攝取熱量</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: totals.remaining < 0 ? 'var(--neon-rose)' : 'var(--neon-cyan)', lineHeight: 1.2 }}>
              {totals.remaining} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>kcal</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
              目標上限 {targets.targetCalories} kcal
            </div>
          </div>
        </div>

        {/* 3 Macro Progress Bars */}
        <div className="grid-cols-3 grid-responsive-3 gap-4">
          {/* Protein */}
          <div className="macro-card-item">
            <div className="flex items-center justify-between" style={{ marginBottom: '0.35rem' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>🥩 蛋白質 (4 kcal/g)</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--neon-emerald)' }}>
                {totals.protein} / {targets.targetProtein}g
              </span>
            </div>
            <div className="progress-bar-bg" style={{ height: '8px' }}>
              <div
                className="progress-bar-fill"
                style={{
                  width: `${Math.min(100, Math.round((totals.protein / targets.targetProtein) * 100))}%`,
                  background: 'linear-gradient(90deg, #10b981, #00f59b)'
                }}
              />
            </div>
            <div className="flex justify-between" style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.3rem' }}>
              <span>{Math.round(totals.protein * 4)} kcal</span>
              <span>{Math.round((totals.protein / targets.targetProtein) * 100)}%</span>
            </div>
          </div>

          {/* Carbs */}
          <div className="macro-card-item">
            <div className="flex items-center justify-between" style={{ marginBottom: '0.35rem' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>🍚 碳水 (4 kcal/g)</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--neon-cyan)' }}>
                {totals.carbs} / {targets.targetCarbs}g
              </span>
            </div>
            <div className="progress-bar-bg" style={{ height: '8px' }}>
              <div
                className="progress-bar-fill"
                style={{
                  width: `${Math.min(100, Math.round((totals.carbs / targets.targetCarbs) * 100))}%`,
                  background: 'linear-gradient(90deg, #0284c7, #06b6d4)'
                }}
              />
            </div>
            <div className="flex justify-between" style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.3rem' }}>
              <span>{Math.round(totals.carbs * 4)} kcal</span>
              <span>{Math.round((totals.carbs / targets.targetCarbs) * 100)}%</span>
            </div>
          </div>

          {/* Fat */}
          <div className="macro-card-item">
            <div className="flex items-center justify-between" style={{ marginBottom: '0.35rem' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>🥑 脂肪 (9 kcal/g)</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--neon-amber)' }}>
                {totals.fat} / {targets.targetFat}g
              </span>
            </div>
            <div className="progress-bar-bg" style={{ height: '8px' }}>
              <div
                className="progress-bar-fill"
                style={{
                  width: `${Math.min(100, Math.round((totals.fat / targets.targetFat) * 100))}%`,
                  background: 'linear-gradient(90deg, #d97706, #fbbf24)'
                }}
              />
            </div>
            <div className="flex justify-between" style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.3rem' }}>
              <span>{Math.round(totals.fat * 9)} kcal</span>
              <span>{Math.round((totals.fat / targets.targetFat) * 100)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section: Workout Today & Fast Rest Timer */}
      <div className="grid-cols-2 grid-responsive-2 gap-4">
        {/* Today's Workout Status */}
        <div className="glass-card glow-purple flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between" style={{ marginBottom: '0.75rem' }}>
              <div className="flex items-center gap-2">
                <Dumbbell size={20} style={{ color: 'var(--neon-purple)' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>今日健身課表狀態</h3>
              </div>
              <span className={`badge ${todayWorkout ? 'badge-green' : 'badge-gray'}`}>
                {todayWorkout ? '今日已完成訓練' : '尚未開始'}
              </span>
            </div>

            {todayWorkout ? (
              <div style={{ background: 'rgba(12, 19, 34, 0.5)', padding: '0.85rem', borderRadius: '0.65rem', border: '1px solid var(--border-color)' }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--neon-green)' }}>
                  {todayWorkout.routineTitle}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  完成了 {todayWorkout.exercises.length} 個動作 · 共 {todayWorkout.totalSets} 組
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.5rem' }}>
                  總容量: {todayWorkout.totalVolumeKg.toLocaleString()} kg
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem 0' }}>
                今天還沒有進行重訓紀錄！選一套課表（例如上下肢分化或全身高效循環）開始流汗吧！
              </div>
            )}
          </div>

          <div style={{ marginTop: '1rem' }}>
            <button
              className="btn btn-purple"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => onNavigate('workout')}
            >
              <Dumbbell size={16} />
              <span>{todayWorkout ? '查看 / 繼續訓練日誌' : '前往載入課表開練'}</span>
            </button>
          </div>
        </div>

        {/* Quick Rest Timer & Tools Card */}
        <div className="glass-card flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2" style={{ marginBottom: '0.75rem' }}>
              <Timer size={20} style={{ color: 'var(--neon-cyan)' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>組間休息快速計時器</h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              重訓組間精準休息能大幅提升肌肉神經徵召與肥大效果，支援嗶聲提醒。
            </p>

            <div className="grid-cols-4 grid-responsive-2 gap-2">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onStartRestTimer(30)}
              >
                30 秒
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onStartRestTimer(60)}
              >
                60 秒
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onStartRestTimer(90)}
              >
                90 秒
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onStartRestTimer(120)}
              >
                120 秒
              </button>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '1rem' }}>
            <div className="flex items-center justify-between" style={{ fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>已儲存動作 PR 數:</span>
              <span style={{ fontWeight: 700, color: 'var(--neon-amber)' }}>{prs.length} 項</span>
            </div>
          </div>
        </div>
      </div>

      {/* PR Highlights & Recent Meals Row */}
      <div className="grid-cols-2 grid-responsive-2 gap-4">
        {/* PR Showcase */}
        <div className="glass-card">
          <div className="flex items-center justify-between" style={{ marginBottom: '0.75rem' }}>
            <div className="flex items-center gap-2">
              <Award size={18} style={{ color: 'var(--neon-amber)' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>個人最佳紀錄 (PR)</h3>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--neon-amber)' }} onClick={() => onNavigate('analytics')}>
              完整榮譽榜
            </button>
          </div>

          {prs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
              尚未登錄 PR 紀錄，開始訓練時完成任意動作組數即可自動登錄！
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {prs.slice(0, 3).map(pr => (
                <div
                  key={pr.exerciseId}
                  className="flex items-center justify-between"
                  style={{
                    background: 'rgba(12, 19, 34, 0.5)',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '0.6rem',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{pr.exerciseName}</span>
                  <div className="flex items-center gap-2">
                    <span style={{ fontWeight: 800, color: 'var(--neon-amber)', fontSize: '0.95rem' }}>
                      {pr.maxWeightKg} kg × {pr.maxReps}
                    </span>
                    <span className="badge badge-amber" style={{ fontSize: '0.7rem' }}>
                      1RM: {pr.estimatedOneRepMax}kg
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Today's Meals Preview */}
        <div className="glass-card">
          <div className="flex items-center justify-between" style={{ marginBottom: '0.75rem' }}>
            <div className="flex items-center gap-2">
              <Utensils size={18} style={{ color: 'var(--neon-green)' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>今日飲食快覽 ({todayMeals.length} 筆)</h3>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--neon-green)' }} onClick={() => onNavigate('diet')}>
              前往登記
            </button>
          </div>

          {todayMeals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
              今天尚未有飲食紀錄，點擊「紀錄飲食」快速登記！
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {todayMeals.slice(0, 3).map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between"
                  style={{
                    background: 'rgba(12, 19, 34, 0.5)',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '0.6rem',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.foodName}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginLeft: '0.4rem' }}>
                      P: {item.protein}g · C: {item.carbs}g · F: {item.fat}g
                    </span>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                    {item.calories} kcal
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ======================= ADMIN TEAM OVERVIEW (管理者戰情總表) ======================= */}
      {activeProfile.role === 'admin' && profiles.length > 0 && (
        <div className="glass-card glow-purple" style={{ border: '1px solid rgba(168, 85, 247, 0.4)', marginTop: '0.5rem' }}>
          <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginBottom: '1rem' }}>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: '1.25rem' }}>👑</span>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>團隊成員即時看板 (Admin Team Pulse)</h2>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  您以管理員身分檢視，共 {profiles.length} 位成員之今日熱量攝取、訓練狀態與進度。
                </p>
              </div>
            </div>
            <span className="badge badge-purple">管理員特權模式</span>
          </div>

          <div className="flex flex-col gap-3">
            {profiles.map(member => {
              const memberMeals = StorageService.getMealsByDate(member.id, todayStr);
              const memberCals = Math.round(memberMeals.reduce((sum, m) => sum + m.calories, 0));
              const memberTargets = getUserNutritionTargets(member);
              const memberWorkouts = StorageService.getWorkoutSessions(member.id).filter(w => w.date === todayStr);
              const memberWorkoutBurn = memberWorkouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);
              const isCurrent = member.id === activeProfile.id;

              return (
                <div
                  key={member.id}
                  style={{
                    background: isCurrent ? 'rgba(168, 85, 247, 0.12)' : 'rgba(12, 19, 34, 0.6)',
                    border: `1px solid ${isCurrent ? 'var(--neon-purple)' : 'var(--border-color)'}`,
                    borderRadius: '0.85rem',
                    padding: '0.85rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: '1.5rem' }}>{member.avatar}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{member.name}</span>
                        {member.role === 'admin' ? (
                          <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>Admin</span>
                        ) : (
                          <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>成員</span>
                        )}
                        {isCurrent && <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>目前視角</span>}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        目標: {member.goal === 'gain_muscle' ? '增肌強壯' : member.goal === 'lose_fat' ? '減脂瘦身' : '體態維持'} · 體重: {member.weightKg}kg
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-wrap">
                    {/* Diet status */}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>今日飲食熱量</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: memberCals > memberTargets.targetCalories ? 'var(--neon-rose)' : 'var(--neon-green)' }}>
                        {memberCals} / {memberTargets.targetCalories} <span style={{ fontSize: '0.7rem' }}>kcal</span>
                      </div>
                    </div>

                    {/* Workout status */}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>今日訓練</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: memberWorkouts.length > 0 ? 'var(--neon-cyan)' : 'var(--text-dim)' }}>
                        {memberWorkouts.length > 0 ? `🏋️ 已練 (${memberWorkoutBurn}k)` : '🛌 尚未訓練'}
                      </div>
                    </div>

                    {/* Action button */}
                    {!isCurrent && (onRequestSwitchProfile || onSelectProfile) && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.8rem' }}
                        onClick={() => {
                          if (onRequestSwitchProfile) {
                            onRequestSwitchProfile(member);
                          } else if (onSelectProfile) {
                            onSelectProfile(member.id);
                          }
                        }}
                      >
                        切換至此成員
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
