import React, { useMemo } from 'react';
import {
  Award,
  Flame,
  Dumbbell,
  TrendingUp
} from 'lucide-react';
import type { UserProfile } from '../types';
import { StorageService } from '../services/storage';
import { calculateBMI, getUserNutritionTargets } from '../utils/nutrition';

interface AnalyticsViewProps {
  activeProfile: UserProfile;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ activeProfile }) => {
  const allMeals = useMemo(() => StorageService.getMealLogs(activeProfile.id), [activeProfile.id]);
  const allWorkouts = useMemo(() => StorageService.getWorkoutSessions(activeProfile.id), [activeProfile.id]);
  const prs = useMemo(() => StorageService.getPersonalRecords(activeProfile.id), [activeProfile.id]);
  const targets = useMemo(() => getUserNutritionTargets(activeProfile), [activeProfile]);
  const bmiInfo = useMemo(() => calculateBMI(activeProfile.weightKg, activeProfile.heightCm), [activeProfile.weightKg, activeProfile.heightCm]);

  // 最近 7 天數據計算
  const past7Days = useMemo(() => {
    const days: {
      dateStr: string;
      label: string;
      calories: number;
      burnedCalories: number;
      protein: number;
      carbs: number;
      fat: number;
      hasWorkout: boolean;
    }[] = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = `${d.getMonth() + 1}/${d.getDate()}`;

      const dayMeals = allMeals.filter(m => m.date === dateStr);
      const dayCals = dayMeals.reduce((acc, m) => acc + m.calories, 0);
      const dayP = dayMeals.reduce((acc, m) => acc + m.protein, 0);
      const dayC = dayMeals.reduce((acc, m) => acc + m.carbs, 0);
      const dayF = dayMeals.reduce((acc, m) => acc + m.fat, 0);

      const dayWorkouts = allWorkouts.filter(w => w.date === dateStr);
      const dayBurn = dayWorkouts.reduce((acc, w) => acc + (w.caloriesBurned || 0), 0);
      const hasWorkout = dayWorkouts.length > 0;

      days.push({
        dateStr,
        label: dayLabel,
        calories: Math.round(dayCals),
        burnedCalories: Math.round(dayBurn),
        protein: Math.round(dayP),
        carbs: Math.round(dayC),
        fat: Math.round(dayF),
        hasWorkout,
      });
    }
    return days;
  }, [allMeals, allWorkouts]);

  // 總訓練容量與熱量消耗統計
  const totalVolumeAllTime = useMemo(() => {
    return allWorkouts.reduce((sum, w) => sum + w.totalVolumeKg, 0);
  }, [allWorkouts]);

  const totalSetsAllTime = useMemo(() => {
    return allWorkouts.reduce((sum, w) => sum + w.totalSets, 0);
  }, [allWorkouts]);

  const totalCaloriesBurnedAllTime = useMemo(() => {
    return allWorkouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);
  }, [allWorkouts]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>成效分析與榮譽殿堂</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          回顧最近 7 日飲食熱量達標率、訓練消耗熱量與動作最佳紀錄 (PR)。
        </p>
      </div>

      {/* Top Stat Cards */}
      <div className="grid-cols-4 grid-responsive-2 gap-4">
        <div className="glass-card glow-green">
          <div className="flex items-center justify-between" style={{ marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>總訓練次數</span>
            <Dumbbell size={18} style={{ color: 'var(--neon-green)' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {allWorkouts.length} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>次</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
            累積完成 {totalSetsAllTime} 組訓練
          </div>
        </div>

        <div className="glass-card glow-purple">
          <div className="flex items-center justify-between" style={{ marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>累計訓練總容量</span>
            <TrendingUp size={18} style={{ color: 'var(--neon-purple)' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--neon-purple)' }}>
            {totalVolumeAllTime.toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>kg</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
            搬動約 {Math.round(totalVolumeAllTime / 1000)} 公噸重物
          </div>
        </div>

        <div className="glass-card glow-cyan">
          <div className="flex items-center justify-between" style={{ marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>累計訓練消耗熱量</span>
            <Flame size={18} style={{ color: 'var(--neon-amber)' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--neon-amber)' }}>
            {totalCaloriesBurnedAllTime.toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>kcal</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
            約相當於代謝燃燒 {(totalCaloriesBurnedAllTime / 7700).toFixed(1)} kg 體脂肪
          </div>
        </div>

        <div className="glass-card">
          <div className="flex items-center justify-between" style={{ marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>動作 PR 紀錄數</span>
            <Award size={18} style={{ color: 'var(--neon-amber)' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--neon-amber)' }}>
            {prs.length} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>項突破</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
            BMI {bmiInfo.bmi} ({bmiInfo.label})
          </div>
        </div>
      </div>

      {/* 7-Day Calorie & Macro Trend Chart */}
      <div className="glass-card">
        <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginBottom: '1.25rem' }}>
          <div className="flex items-center gap-2">
            <Flame size={20} style={{ color: 'var(--neon-green)' }} />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>近 7 日飲食熱量與訓練打卡走勢</h2>
          </div>
          <div className="flex items-center gap-3" style={{ fontSize: '0.75rem' }}>
            <span className="flex items-center gap-1">
              <span style={{ width: '10px', height: '10px', background: 'var(--neon-green)', borderRadius: '2px' }} />
              已攝取熱量
            </span>
            <span className="flex items-center gap-1">
              <span style={{ width: '10px', height: '2px', background: 'rgba(255,255,255,0.4)' }} />
              目標熱量線 ({targets.targetCalories} kcal)
            </span>
          </div>
        </div>

        {/* CSS Bar Chart */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '0.75rem',
          alignItems: 'flex-end',
          height: '200px',
          paddingBottom: '2rem',
          position: 'relative',
          borderBottom: '1px solid var(--border-color)',
        }}>
          {/* Target reference line */}
          <div style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: `${Math.min(100, Math.max(10, (targets.targetCalories / (targets.targetCalories * 1.35)) * 100))}%`,
            borderTop: '1px dashed rgba(255, 255, 255, 0.3)',
            zIndex: 1,
            pointerEvents: 'none'
          }} />

          {past7Days.map(day => {
            const heightPct = targets.targetCalories > 0
              ? Math.min(100, Math.round((day.calories / (targets.targetCalories * 1.35)) * 100))
              : 0;

            const isOver = day.calories > targets.targetCalories;

            return (
              <div
                key={day.dateStr}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  height: '100%',
                  justifyContent: 'flex-end',
                  position: 'relative'
                }}
              >
                {/* Workout check icon */}
                {day.hasWorkout && (
                  <div style={{ position: 'absolute', top: 0 }}>
                    <span className="badge badge-purple" style={{ padding: '0.1rem 0.35rem', fontSize: '0.65rem' }} title={`當日訓練消耗 ${day.burnedCalories} kcal`}>
                      {day.burnedCalories > 0 ? `🔥 -${day.burnedCalories}k` : '🏋️ 訓練'}
                    </span>
                  </div>
                )}

                {/* Calorie label on top of bar */}
                {day.calories > 0 && (
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: isOver ? 'var(--neon-rose)' : 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    {day.calories}
                  </div>
                )}

                {/* Bar */}
                <div
                  style={{
                    width: '70%',
                    maxWidth: '45px',
                    height: `${Math.max(4, heightPct)}%`,
                    background: day.calories === 0
                      ? 'rgba(255, 255, 255, 0.05)'
                      : isOver
                        ? 'linear-gradient(180deg, #f43f5e 0%, #be123c 100%)'
                        : 'linear-gradient(180deg, #00f59b 0%, #059669 100%)',
                    borderRadius: '6px 6px 0 0',
                    transition: 'all 0.3s ease',
                    boxShadow: day.calories > 0 ? (isOver ? '0 0 10px rgba(244, 63, 94, 0.3)' : '0 0 10px rgba(0, 245, 155, 0.25)') : 'none',
                  }}
                />

                {/* Date Label */}
                <div style={{ position: 'absolute', bottom: '-1.8rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {day.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PR Trophy Room */}
      <div className="glass-card glow-purple">
        <div className="flex items-center justify-between" style={{ marginBottom: '1rem' }}>
          <div className="flex items-center gap-2">
            <Award size={22} style={{ color: 'var(--neon-amber)' }} />
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>個人最佳紀錄榮譽殿堂 (Personal Records)</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                自動計算單次最高重量與預估 1RM 極限肌力 (Brzycki 公式)
              </p>
            </div>
          </div>
        </div>

        {prs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>
            尚未建立動作紀錄，前往訓練頁面完成任一組數即可登錄個人 PR！
          </div>
        ) : (
          <div className="grid-cols-3 grid-responsive-3 gap-3">
            {prs.map(pr => (
              <div
                key={pr.exerciseId}
                style={{
                  background: 'rgba(12, 19, 34, 0.6)',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                  borderRadius: '0.85rem',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                }}
              >
                <div className="flex items-center justify-between">
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{pr.exerciseName}</span>
                  <span className="badge badge-amber">PR 達成</span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--neon-amber)' }}>
                    {pr.maxWeightKg} <span style={{ fontSize: '0.85rem' }}>kg</span>
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    x {pr.maxReps} 次
                  </span>
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.35rem' }}>
                  預估極限 1RM: <strong>{pr.estimatedOneRepMax} kg</strong>
                </div>

                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                  達成日期: {pr.date}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
