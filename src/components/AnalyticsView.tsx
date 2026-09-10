import React, { useMemo, useState } from 'react';
import {
  Award,
  Flame,
  Dumbbell,
  TrendingUp,
  TrendingDown,
  Scale,
  Plus,
  Trash2,
  Edit3,
  Calendar,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { UserProfile } from '../types';
import { StorageService } from '../services/storage';
import { calculateBMI, getUserNutritionTargets } from '../utils/nutrition';
import { DailyWeightModal } from './DailyWeightModal';

interface AnalyticsViewProps {
  activeProfile: UserProfile;
  onUpdateProfile?: (profile: UserProfile) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ activeProfile, onUpdateProfile }) => {
  const allMeals = useMemo(() => StorageService.getMealLogs(activeProfile.id), [activeProfile.id]);
  const allWorkouts = useMemo(() => StorageService.getWorkoutSessions(activeProfile.id), [activeProfile.id]);
  const prs = useMemo(() => StorageService.getPersonalRecords(activeProfile.id), [activeProfile.id]);
  const targets = useMemo(() => getUserNutritionTargets(activeProfile), [activeProfile]);
  const bmiInfo = useMemo(() => calculateBMI(activeProfile.weightKg, activeProfile.heightCm), [activeProfile.weightKg, activeProfile.heightCm]);

  // 體重追蹤狀態
  const [weightTimeframe, setWeightTimeframe] = useState<'7d' | '14d' | '30d' | 'all'>('14d');
  const [isWeightModalOpen, setIsWeightModalOpen] = useState<boolean>(false);
  const [modalDate, setModalDate] = useState<string | undefined>(undefined);
  const [weightRefreshKey, setWeightRefreshKey] = useState<number>(0);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState<boolean>(true);

  // 取得使用者所有體重紀錄 (依日期降冪排序：最新在前)
  const allWeightEntries = useMemo(() => {
    return StorageService.getWeightEntries(activeProfile.id);
  }, [activeProfile.id, weightRefreshKey]);

  // 體重核心統計指標
  const latestWeightEntry = allWeightEntries[0];
  const currentWeight = latestWeightEntry ? latestWeightEntry.weightKg : activeProfile.weightKg;
  const oldestWeightEntry = allWeightEntries[allWeightEntries.length - 1];
  const startWeight = oldestWeightEntry ? oldestWeightEntry.weightKg : activeProfile.weightKg;
  const totalWeightDelta = Number((currentWeight - startWeight).toFixed(1));

  // 計算歷史最低與最高
  const weightValues = useMemo(() => {
    if (allWeightEntries.length === 0) return [currentWeight];
    return allWeightEntries.map(w => w.weightKg);
  }, [allWeightEntries, currentWeight]);

  const minWeight = Math.min(...weightValues);
  const maxWeight = Math.max(...weightValues);

  // 計算最近 7 筆或 7 天內的平均體重 (7-Day Moving Average)
  const recent7Average = useMemo(() => {
    if (allWeightEntries.length === 0) return currentWeight;
    const slice = allWeightEntries.slice(0, Math.min(7, allWeightEntries.length));
    const sum = slice.reduce((acc, curr) => acc + curr.weightKg, 0);
    return Number((sum / slice.length).toFixed(1));
  }, [allWeightEntries, currentWeight]);

  // 距離目標體重差距
  const targetWeight = activeProfile.targetWeightKg;
  const targetDiff = targetWeight ? Number((currentWeight - targetWeight).toFixed(1)) : null;

  // 依時間範圍過濾圖表數據 (過濾後按時間升冪排序：從過去到現在)
  const chartEntries = useMemo(() => {
    if (allWeightEntries.length === 0) return [];
    const sortedAsc = [...allWeightEntries].sort((a, b) => a.date.localeCompare(b.date));

    if (weightTimeframe === 'all') return sortedAsc;

    const daysLimit = weightTimeframe === '7d' ? 7 : weightTimeframe === '14d' ? 14 : 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysLimit);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const filtered = sortedAsc.filter(w => w.date >= cutoffStr);
    return filtered.length > 0 ? filtered : sortedAsc.slice(-daysLimit);
  }, [allWeightEntries, weightTimeframe]);

  // 計算圖表中每個點的 7 日移動平均線 (7-day MA)
  const chartDataWithMA = useMemo(() => {
    return chartEntries.map((item, index) => {
      // 往前取最多 7 筆計算平均
      const startIdx = Math.max(0, index - 6);
      const windowItems = chartEntries.slice(startIdx, index + 1);
      const ma = Number((windowItems.reduce((s, w) => s + w.weightKg, 0) / windowItems.length).toFixed(1));
      return {
        ...item,
        movingAvg: ma,
      };
    });
  }, [chartEntries]);

  // 最近 7 天飲食數據計算
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

  const handleOpenAddWeight = (targetDate?: string) => {
    setModalDate(targetDate || new Date().toISOString().split('T')[0]);
    setIsWeightModalOpen(true);
  };

  const handleDeleteWeight = (id: string) => {
    StorageService.deleteWeightEntry(id);
    setWeightRefreshKey(k => k + 1);
    if (onUpdateProfile) {
      onUpdateProfile(StorageService.getActiveProfile());
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>成效分析與榮譽殿堂</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          每日體重走勢、熱量達標率、訓練消耗熱量與動作最佳突破紀錄 (PR)。
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

      {/* ==================== 每日體重追蹤與走勢分析專區 ==================== */}
      <div className="glass-card glow-cyan">
        {/* Section Header */}
        <div className="flex items-center justify-between flex-wrap gap-3" style={{ marginBottom: '1.25rem' }}>
          <div className="flex items-center gap-2">
            <Scale size={22} style={{ color: 'var(--neon-green)' }} />
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>每日體重追蹤與走勢分析</h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                以 7 日平滑移動均線消除單日水分波動，科學評估減脂與增肌淨進程。
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Timeframe Selector */}
            <div className="flex items-center gap-1" style={{ background: 'rgba(12, 19, 34, 0.6)', padding: '0.2rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
              {(['7d', '14d', '30d', 'all'] as const).map(tf => (
                <button
                  key={tf}
                  type="button"
                  className={`btn btn-sm ${weightTimeframe === tf ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                  onClick={() => setWeightTimeframe(tf)}
                >
                  {tf === '7d' ? '7 天' : tf === '14d' ? '14 天' : tf === '30d' ? '30 天' : '全部'}
                </button>
              ))}
            </div>

            {/* Quick Log Button */}
            <button
              type="button"
              className="btn btn-primary btn-sm flex items-center gap-1"
              onClick={() => handleOpenAddWeight()}
            >
              <Plus size={15} />
              <span>登錄體重</span>
            </button>
          </div>
        </div>

        {/* Weight Stat 4 Cards */}
        <div className="grid-cols-4 mobile-grid-2 gap-3" style={{ marginBottom: '1.5rem' }}>
          {/* 1. 當前體重 */}
          <div style={{ background: 'rgba(12, 19, 34, 0.6)', padding: '0.9rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>當前最新體重</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--neon-green)', lineHeight: 1.2 }}>
              {currentWeight} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>kg</span>
            </div>
            <div className="flex items-center gap-1" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
              {totalWeightDelta === 0 ? (
                <span style={{ color: 'var(--text-dim)' }}>持平無變化</span>
              ) : totalWeightDelta > 0 ? (
                <span className="flex items-center text-amber-400" style={{ color: 'var(--neon-amber)' }}>
                  <TrendingUp size={13} /> +{totalWeightDelta} kg
                </span>
              ) : (
                <span className="flex items-center text-emerald-400" style={{ color: 'var(--neon-green)' }}>
                  <TrendingDown size={13} /> {totalWeightDelta} kg
                </span>
              )}
              <span style={{ color: 'var(--text-dim)' }}>(自初次記錄)</span>
            </div>
          </div>

          {/* 2. 7日移動均重 */}
          <div style={{ background: 'rgba(12, 19, 34, 0.6)', padding: '0.9rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>7 日移動平均體重 (MA)</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--neon-cyan)', lineHeight: 1.2 }}>
              {recent7Average} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>kg</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
              連續多日平均，排除水分起伏
            </div>
          </div>

          {/* 3. 歷史最高與最低 */}
          <div style={{ background: 'rgba(12, 19, 34, 0.6)', padding: '0.9rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>歷史體重區間</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.4 }}>
              <span style={{ color: 'var(--neon-green)' }}>{minWeight}</span> ~ <span style={{ color: 'var(--neon-rose)' }}>{maxWeight}</span> <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>kg</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
              震盪幅度 {(maxWeight - minWeight).toFixed(1)} kg
            </div>
          </div>

          {/* 4. 目標體重與差距 */}
          <div style={{ background: 'rgba(12, 19, 34, 0.6)', padding: '0.9rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>目標體重差距</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: targetDiff === 0 ? 'var(--neon-green)' : 'var(--neon-amber)', lineHeight: 1.2 }}>
              {targetWeight ? `${targetWeight} kg` : '未設定'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
              {targetDiff === null
                ? '可在個人設定設定目標'
                : targetDiff === 0
                  ? '🎉 已達成目標體重！'
                  : targetDiff > 0
                    ? `距離目標還需減 ${targetDiff} kg`
                    : `距離目標還需增 ${Math.abs(targetDiff)} kg`}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginBottom: '0.75rem', fontSize: '0.75rem' }}>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span style={{ width: '10px', height: '10px', background: 'var(--neon-green)', borderRadius: '50%' }} />
              每日體重紀錄點
            </span>
            <span className="flex items-center gap-1">
              <span style={{ width: '12px', height: '2px', background: 'var(--neon-cyan)', borderTop: '2px dashed var(--neon-cyan)' }} />
              7 日移動平滑均線
            </span>
            {targetWeight && (
              <span className="flex items-center gap-1">
                <span style={{ width: '12px', height: '2px', background: 'var(--neon-rose)', borderTop: '2px dotted var(--neon-rose)' }} />
                目標體重線 ({targetWeight} kg)
              </span>
            )}
          </div>
          <span style={{ color: 'var(--text-dim)' }}>
            共 {chartEntries.length} 筆顯示中
          </span>
        </div>

        {/* SVG Weight Trend Chart */}
        {chartDataWithMA.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-dim)', background: 'rgba(0,0,0,0.15)', borderRadius: '0.75rem' }}>
            尚未登錄體重紀錄！點擊右上角「➕ 登錄體重」開始追蹤每天的晨起體態變化。
          </div>
        ) : chartDataWithMA.length === 1 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.15)', borderRadius: '0.75rem' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--neon-green)', marginBottom: '0.5rem' }}>
              {chartDataWithMA[0].weightKg} kg
            </div>
            <div style={{ fontSize: '0.82rem' }}>
              已於 {chartDataWithMA[0].date} 記錄第 1 筆體重！持續記錄 2 天以上即可繪製平滑走勢圖與 7 日移動均線。
            </div>
          </div>
        ) : (
          <div style={{ width: '100%', overflowX: 'auto', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '0.75rem', padding: '1rem 0.5rem' }}>
            {(() => {
              const svgWidth = Math.max(600, chartDataWithMA.length * 45);
              const svgHeight = 220;
              const padLeft = 50;
              const padRight = 30;
              const padTop = 25;
              const padBottom = 35;
              const plotWidth = svgWidth - padLeft - padRight;
              const plotHeight = svgHeight - padTop - padBottom;

              const allValues = [
                ...chartDataWithMA.map(d => d.weightKg),
                ...chartDataWithMA.map(d => d.movingAvg),
                ...(targetWeight ? [targetWeight] : []),
              ];

              const dataMin = Math.min(...allValues);
              const dataMax = Math.max(...allValues);
              const yMin = Math.floor(dataMin - 1);
              const yMax = Math.ceil(dataMax + 1);
              const yRange = Math.max(1, yMax - yMin);

              const getX = (idx: number) => padLeft + (idx / (chartDataWithMA.length - 1)) * plotWidth;
              const getY = (val: number) => padTop + (1 - (val - yMin) / yRange) * plotHeight;

              // 產生折線 SVG 路徑
              const rawLinePath = chartDataWithMA.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(d.weightKg).toFixed(1)}`).join(' ');
              const maLinePath = chartDataWithMA.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(d.movingAvg).toFixed(1)}`).join(' ');

              // 產生閉合漸層區域路徑
              const areaPath = `${rawLinePath} L ${getX(chartDataWithMA.length - 1).toFixed(1)} ${(padTop + plotHeight).toFixed(1)} L ${getX(0).toFixed(1)} ${(padTop + plotHeight).toFixed(1)} Z`;

              // Y 軸刻度 (分 4 等分)
              const yTicks = [yMin, yMin + yRange * 0.33, yMin + yRange * 0.66, yMax];

              return (
                <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
                  <defs>
                    <linearGradient id="weightAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#00f59b" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#00f59b" stopOpacity="0.0" />
                    </linearGradient>
                    <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#00f59b" floodOpacity="0.4" />
                    </filter>
                  </defs>

                  {/* 網格水平線與 Y 軸標籤 */}
                  {yTicks.map(t => {
                    const y = getY(t);
                    return (
                      <g key={t}>
                        <line
                          x1={padLeft}
                          y1={y}
                          x2={svgWidth - padRight}
                          y2={y}
                          stroke="rgba(255, 255, 255, 0.08)"
                          strokeDasharray="3 3"
                        />
                        <text
                          x={padLeft - 8}
                          y={y + 4}
                          fill="var(--text-dim)"
                          fontSize="10"
                          textAnchor="end"
                          fontFamily="inherit"
                        >
                          {t.toFixed(1)}
                        </text>
                      </g>
                    );
                  })}

                  {/* 目標體重水平參考線 */}
                  {targetWeight && (
                    <g>
                      <line
                        x1={padLeft}
                        y1={getY(targetWeight)}
                        x2={svgWidth - padRight}
                        y2={getY(targetWeight)}
                        stroke="var(--neon-rose)"
                        strokeDasharray="4 4"
                        strokeWidth="1.5"
                        opacity="0.8"
                      />
                      <text
                        x={svgWidth - padRight}
                        y={getY(targetWeight) - 5}
                        fill="var(--neon-rose)"
                        fontSize="10"
                        textAnchor="end"
                        fontWeight="bold"
                        fontFamily="inherit"
                      >
                        目標 {targetWeight} kg
                      </text>
                    </g>
                  )}

                  {/* 體重面積底色 */}
                  <path d={areaPath} fill="url(#weightAreaGrad)" />

                  {/* 7 日移動平滑均線 */}
                  <path
                    d={maLinePath}
                    fill="none"
                    stroke="var(--neon-cyan)"
                    strokeWidth="2.5"
                    strokeDasharray="4 3"
                    opacity="0.9"
                  />

                  {/* 每日實測體重折線 */}
                  <path
                    d={rawLinePath}
                    fill="none"
                    stroke="var(--neon-green)"
                    strokeWidth="2.5"
                    filter="url(#glowGreen)"
                  />

                  {/* 每日體重資料點與 Tooltip */}
                  {chartDataWithMA.map((d, i) => {
                    const cx = getX(i);
                    const cy = getY(d.weightKg);
                    const dateShort = d.date.split('-').slice(1).join('/');

                    return (
                      <g key={d.id || d.date} className="cursor-pointer">
                        <circle
                          cx={cx}
                          cy={cy}
                          r={4}
                          fill="#00f59b"
                          stroke="#0b1329"
                          strokeWidth="2"
                        />
                        <title>{`${d.date}: ${d.weightKg} kg (7日均線: ${d.movingAvg} kg)${d.note ? ` [${d.note}]` : ''}`}</title>
                        {/* 點位數值標籤 (當點數不會過於密集時顯示) */}
                        {chartDataWithMA.length <= 14 && (
                          <text
                            x={cx}
                            y={cy - 8}
                            fill="var(--text-main)"
                            fontSize="9"
                            fontWeight="bold"
                            textAnchor="middle"
                            fontFamily="inherit"
                          >
                            {d.weightKg}
                          </text>
                        )}
                        {/* X 軸日期刻度 */}
                        <text
                          x={cx}
                          y={svgHeight - 12}
                          fill="var(--text-muted)"
                          fontSize="9"
                          textAnchor="middle"
                          fontFamily="inherit"
                        >
                          {dateShort}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              );
            })()}
          </div>
        )}

        {/* ==================== 體重歷史紀錄明細表 ==================== */}
        <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
          >
            <div className="flex items-center gap-2">
              <Calendar size={16} style={{ color: 'var(--neon-cyan)' }} />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>歷史體重日誌列表 ({allWeightEntries.length} 筆)</h3>
            </div>
            <button type="button" className="btn btn-ghost btn-sm flex items-center gap-1" style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
              <span>{isHistoryExpanded ? '收合日誌' : '展開檢視'}</span>
              {isHistoryExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {isHistoryExpanded && (
            <div style={{ marginTop: '0.75rem', maxHeight: '280px', overflowY: 'auto' }}>
              {allWeightEntries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                  尚無日誌記錄
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {allWeightEntries.map((item, idx) => {
                    // 計算與前一天 (在降冪陣列中為下一個元素) 的差距
                    const prevItem = allWeightEntries[idx + 1];
                    const dailyDiff = prevItem ? Number((item.weightKg - prevItem.weightKg).toFixed(1)) : null;

                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between flex-wrap gap-2"
                        style={{
                          background: 'rgba(12, 19, 34, 0.5)',
                          padding: '0.5rem 0.85rem',
                          borderRadius: '0.5rem',
                          border: '1px solid var(--border-color)',
                          fontSize: '0.82rem',
                        }}
                      >
                        {/* Date & Tags */}
                        <div className="flex items-center gap-2">
                          <span style={{ fontWeight: 600, color: 'var(--text-main)', minWidth: '85px' }}>
                            {item.date}
                          </span>
                          {item.note && (
                            <span className="badge badge-gray" style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}>
                              {item.note}
                            </span>
                          )}
                        </div>

                        {/* Weight & Body Fat */}
                        <div className="flex items-center gap-3">
                          <span style={{ fontWeight: 800, color: 'var(--neon-green)', fontSize: '0.95rem' }}>
                            {item.weightKg} <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>kg</span>
                          </span>

                          {/* Daily diff badge */}
                          {dailyDiff !== null && (
                            <span
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: dailyDiff === 0
                                  ? 'var(--text-dim)'
                                  : dailyDiff > 0
                                    ? 'var(--neon-amber)'
                                    : 'var(--neon-green)',
                              }}
                            >
                              {dailyDiff > 0 ? `+${dailyDiff}` : dailyDiff} kg
                            </span>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              className="btn btn-ghost btn-icon btn-sm"
                              style={{ padding: '0.2rem', color: 'var(--text-muted)' }}
                              onClick={() => handleOpenAddWeight(item.date)}
                              title="修改此日紀錄"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-icon btn-sm"
                              style={{ padding: '0.2rem', color: 'var(--neon-rose)' }}
                              onClick={() => handleDeleteWeight(item.id)}
                              title="刪除紀錄"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
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

      {/* 體重輸入/修改彈窗 */}
      <DailyWeightModal
        isOpen={isWeightModalOpen}
        onClose={() => setIsWeightModalOpen(false)}
        activeProfile={activeProfile}
        initialDate={modalDate}
        onSaved={() => {
          setWeightRefreshKey(k => k + 1);
          if (onUpdateProfile) {
            onUpdateProfile(StorageService.getActiveProfile());
          }
        }}
        onDeleted={() => {
          setWeightRefreshKey(k => k + 1);
          if (onUpdateProfile) {
            onUpdateProfile(StorageService.getActiveProfile());
          }
        }}
      />
    </div>
  );
};
