import React, { useState, useEffect, useMemo } from 'react';
import {
  Dumbbell,
  Play,
  Plus,
  Check,
  Trash2,
  Clock,
  Search,
  X,
  Flame,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type {
  EquipmentType,
  Exercise,
  ExerciseCategory,
  UserProfile,
  WorkoutExerciseLog,
  WorkoutRoutineTemplate,
  WorkoutSession,
  WorkoutSet
} from '../types';
import { DEFAULT_ROUTINE_TEMPLATES } from '../data/defaults';
import { StorageService } from '../services/storage';
import { estimateWorkoutCalories } from '../utils/nutrition';

interface WorkoutTrackerViewProps {
  activeProfile: UserProfile;
  onStartRestTimer: (seconds: number) => void;
}

const CATEGORY_MAP: Record<ExerciseCategory | 'all', string> = {
  all: '全部動作',
  chest: '胸部 (Chest)',
  back: '背部 (Back)',
  legs: '腿部 (Legs)',
  shoulders: '肩部 (Shoulders)',
  arms: '手臂 (Arms)',
  core: '核心 (Core)',
  cardio: '有氧 (Cardio)',
};

const EQUIPMENT_MAP: Record<EquipmentType | string, string> = {
  barbell: '槓鈴',
  dumbbell: '啞鈴',
  machine: '機械式',
  cable: '滑輪繩索',
  bodyweight: '自重徒手',
  other: '其他/功能性',
};

export const WorkoutTrackerView: React.FC<WorkoutTrackerViewProps> = ({
  activeProfile,
  onStartRestTimer,
}) => {
  const [sessions, setSessions] = useState<WorkoutSession[]>(() =>
    StorageService.getWorkoutSessions(activeProfile.id)
  );
  const [allExercises, setAllExercises] = useState<Exercise[]>(() =>
    StorageService.getAllExercises()
  );

  // Active workout session state
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Modal states
  const [isExercisePickerOpen, setIsExercisePickerOpen] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<ExerciseCategory | 'all'>('all');

  // Custom exercise modal
  const [isCustomExOpen, setIsCustomExOpen] = useState(false);
  const [customExName, setCustomExName] = useState('');
  const [customExCat, setCustomExCat] = useState<ExerciseCategory>('chest');
  const [customExEquip, setCustomExEquip] = useState<EquipmentType>('barbell');

  // Workout stopwatch
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (activeSession) {
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeSession]);

  const formatStopwatch = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start workout from routine template
  const handleStartFromTemplate = (template: WorkoutRoutineTemplate) => {
    const initialExercises: WorkoutExerciseLog[] = template.exercises.map(te => {
      const sets: WorkoutSet[] = [];
      for (let i = 1; i <= te.targetSets; i++) {
        sets.push({
          id: `set-${Date.now()}-${te.exerciseId}-${i}`,
          setNumber: i,
          weightKg: 0,
          reps: te.targetReps,
          completed: false,
        });
      }
      return {
        exerciseId: te.exerciseId,
        exerciseName: te.exerciseName,
        category: te.category,
        sets,
      };
    });

    const newSession: WorkoutSession = {
      id: `session-${Date.now()}`,
      userId: activeProfile.id,
      date: new Date().toISOString().split('T')[0],
      startTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      routineTitle: template.title,
      exercises: initialExercises,
      totalVolumeKg: 0,
      totalSets: 0,
    };

    setActiveSession(newSession);
    setElapsedSeconds(0);
  };

  // Start empty workout
  const handleStartEmptyWorkout = () => {
    const newSession: WorkoutSession = {
      id: `session-${Date.now()}`,
      userId: activeProfile.id,
      date: new Date().toISOString().split('T')[0],
      startTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      routineTitle: '自由訓練',
      exercises: [],
      totalVolumeKg: 0,
      totalSets: 0,
    };

    setActiveSession(newSession);
    setElapsedSeconds(0);
  };

  // Set management
  const handleToggleSetComplete = (exIndex: number, setIndex: number) => {
    if (!activeSession) return;
    const updated = { ...activeSession };
    const set = updated.exercises[exIndex].sets[setIndex];
    const willBeComplete = !set.completed;
    set.completed = willBeComplete;

    setActiveSession(updated);

    if (willBeComplete) {
      // 自動觸發 90 秒組間休息計時器
      onStartRestTimer(90);
    }
  };

  const handleUpdateSet = (exIndex: number, setIndex: number, field: 'weightKg' | 'reps' | 'rpe', val: number) => {
    if (!activeSession) return;
    const updated = { ...activeSession };
    updated.exercises[exIndex].sets[setIndex][field] = val;
    setActiveSession(updated);
  };

  const handleAddSet = (exIndex: number) => {
    if (!activeSession) return;
    const updated = { ...activeSession };
    const ex = updated.exercises[exIndex];
    const prevSet = ex.sets[ex.sets.length - 1];
    const newSetNumber = ex.sets.length + 1;

    ex.sets.push({
      id: `set-${Date.now()}-${newSetNumber}`,
      setNumber: newSetNumber,
      weightKg: prevSet ? prevSet.weightKg : 0,
      reps: prevSet ? prevSet.reps : 10,
      completed: false,
    });

    setActiveSession(updated);
  };

  const handleRemoveSet = (exIndex: number, setIndex: number) => {
    if (!activeSession) return;
    const updated = { ...activeSession };
    updated.exercises[exIndex].sets.splice(setIndex, 1);
    // 重新排序組號
    updated.exercises[exIndex].sets.forEach((s, idx) => {
      s.setNumber = idx + 1;
    });
    setActiveSession(updated);
  };

  const handleRemoveExercise = (exIndex: number) => {
    if (!activeSession) return;
    const updated = { ...activeSession };
    updated.exercises.splice(exIndex, 1);
    setActiveSession(updated);
  };

  // Exercise picker
  const handleAddExerciseToSession = (exercise: Exercise) => {
    if (!activeSession) return;
    const updated = { ...activeSession };
    updated.exercises.push({
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      category: exercise.category,
      sets: [
        { id: `set-${Date.now()}-1`, setNumber: 1, weightKg: 20, reps: 10, completed: false },
        { id: `set-${Date.now()}-2`, setNumber: 2, weightKg: 20, reps: 10, completed: false },
        { id: `set-${Date.now()}-3`, setNumber: 3, weightKg: 20, reps: 10, completed: false },
      ],
    });
    setActiveSession(updated);
    setIsExercisePickerOpen(false);
  };

  // Create custom exercise
  const handleCreateCustomExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customExName.trim()) return;

    const newEx: Exercise = {
      id: `ex-custom-${Date.now()}`,
      name: customExName.trim(),
      category: customExCat,
      equipment: customExEquip,
      primaryMuscle: CATEGORY_MAP[customExCat],
      isCustom: true,
    };

    StorageService.addCustomExercise(newEx);
    const updatedList = StorageService.getAllExercises();
    setAllExercises(updatedList);
    setIsCustomExOpen(false);
    setCustomExName('');

    // 若正在訓練中直接加入
    if (activeSession) {
      handleAddExerciseToSession(newEx);
    }
  };

  // Finish workout modal states
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [finishCaloriesBurned, setFinishCaloriesBurned] = useState<number>(300);
  const [finishDurationMinutes, setFinishDurationMinutes] = useState<number>(45);
  const [finishNotes, setFinishNotes] = useState<string>('');

  // Open finish workout summary & calorie adjustment modal
  const handleOpenFinishModal = () => {
    if (!activeSession) return;

    let totalVol = 0;
    let totalSetsCompleted = 0;

    activeSession.exercises.forEach(ex => {
      ex.sets.forEach(set => {
        if (set.completed && set.weightKg > 0 && set.reps > 0) {
          totalVol += set.weightKg * set.reps;
          totalSetsCompleted++;
        }
      });
    });

    const durationMins = Math.max(1, Math.round(elapsedSeconds / 60));
    const estimatedCals = estimateWorkoutCalories(
      activeProfile.weightKg,
      durationMins,
      totalSetsCompleted,
      totalVol
    );

    setFinishDurationMinutes(durationMins);
    setFinishCaloriesBurned(estimatedCals);
    setFinishNotes('');
    setIsFinishModalOpen(true);
  };

  // Confirm finish and save workout session
  const handleConfirmFinishWorkout = () => {
    if (!activeSession) return;

    let totalVol = 0;
    let totalSetsCompleted = 0;

    activeSession.exercises.forEach(ex => {
      ex.sets.forEach(set => {
        if (set.completed && set.weightKg > 0 && set.reps > 0) {
          totalVol += set.weightKg * set.reps;
          totalSetsCompleted++;
        }
      });
    });

    const finishedSession: WorkoutSession = {
      ...activeSession,
      endTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      durationMinutes: finishDurationMinutes,
      caloriesBurned: Number(finishCaloriesBurned),
      totalVolumeKg: Math.round(totalVol),
      totalSets: totalSetsCompleted,
      notes: finishNotes.trim() || undefined,
    };

    StorageService.addWorkoutSession(finishedSession);
    setSessions(StorageService.getWorkoutSessions(activeProfile.id));

    // 觸發彩色紙屑特效！
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 }
    });

    setIsFinishModalOpen(false);
    setActiveSession(null);
    setElapsedSeconds(0);
  };

  const handleDiscardWorkout = () => {
    if (window.confirm('確定要放棄並離開目前的訓練嗎？目前尚未儲存的進度將遺失。')) {
      setActiveSession(null);
      setElapsedSeconds(0);
    }
  };

  const handleDeletePastSession = (id: string) => {
    if (window.confirm('確定要刪除這筆歷史訓練紀錄嗎？')) {
      StorageService.deleteWorkoutSession(id);
      setSessions(StorageService.getWorkoutSessions(activeProfile.id));
    }
  };

  // 各分類動作數量統計
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allExercises.length };
    allExercises.forEach(ex => {
      counts[ex.category] = (counts[ex.category] || 0) + 1;
    });
    return counts;
  }, [allExercises]);

  const filteredExercises = useMemo(() => {
    const q = exerciseSearch.trim().toLowerCase();
    return allExercises.filter(ex => {
      const matchCat = selectedCat === 'all' || ex.category === selectedCat;
      if (!matchCat) return false;
      if (!q) return true;
      const equipZh = EQUIPMENT_MAP[ex.equipment] || '';
      return (
        ex.name.toLowerCase().includes(q) ||
        ex.primaryMuscle.toLowerCase().includes(q) ||
        ex.equipment.toLowerCase().includes(q) ||
        equipZh.toLowerCase().includes(q)
      );
    });
  }, [allExercises, exerciseSearch, selectedCat]);

  return (
    <div className="flex flex-col gap-6">
      {/* ======================= ACTIVE WORKOUT SESSION ======================= */}
      {activeSession ? (
        <div className="flex flex-col gap-5">
          {/* Active Banner */}
          <div className="glass-card glow-purple" style={{ border: '1px solid rgba(168, 85, 247, 0.4)' }}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="badge badge-purple" style={{ animation: 'pulseGlow 2s infinite' }}>
                    ● 正在訓練中
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>開始於 {activeSession.startTime}</span>
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.25rem' }}>
                  {activeSession.routineTitle}
                </h2>
              </div>

              {/* Stopwatch & Action Buttons */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2" style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.75rem',
                  border: '1px solid var(--border-color)',
                  fontVariantNumeric: 'tabular-nums',
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  color: 'var(--neon-green)'
                }}>
                  <Clock size={20} />
                  <span>{formatStopwatch(elapsedSeconds)}</span>
                </div>

                <button className="btn btn-primary" onClick={handleOpenFinishModal}>
                  <Check size={18} />
                  <span>完成訓練</span>
                </button>

                <button className="btn btn-danger btn-sm" onClick={handleDiscardWorkout}>
                  放棄
                </button>
              </div>
            </div>
          </div>

          {/* Exercises In Current Session */}
          {activeSession.exercises.map((ex, exIndex) => (
            <div key={`${ex.exerciseId}-${exIndex}`} className="glass-card">
              <div className="flex items-center justify-between" style={{ marginBottom: '1rem' }}>
                <div className="flex items-center gap-2">
                  <Dumbbell size={20} style={{ color: 'var(--neon-purple)' }} />
                  <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{ex.exerciseName}</span>
                  <span className="badge badge-gray">{CATEGORY_MAP[ex.category] || ex.category}</span>
                </div>

                <button
                  className="btn btn-ghost btn-icon btn-sm"
                  title="移除此動作"
                  onClick={() => handleRemoveExercise(exIndex)}
                  style={{ color: 'var(--text-dim)', background: 'transparent' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Sets Table Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '45px 1fr 1fr 1fr 50px 40px',
                gap: '0.5rem',
                fontSize: '0.75rem',
                color: 'var(--text-dim)',
                fontWeight: 700,
                textAlign: 'center',
                paddingBottom: '0.4rem',
                borderBottom: '1px solid var(--border-color)'
              }}>
                <div>組數</div>
                <div>重量 (kg)</div>
                <div>次數 (Reps)</div>
                <div>自覺強度 (RPE)</div>
                <div>打勾</div>
                <div></div>
              </div>

              {/* Sets List */}
              <div className="flex flex-col gap-2" style={{ marginTop: '0.5rem' }}>
                {ex.sets.map((set, setIndex) => (
                  <div
                    key={set.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '45px 1fr 1fr 1fr 50px 40px',
                      gap: '0.5rem',
                      alignItems: 'center',
                      background: set.completed ? 'rgba(0, 245, 155, 0.08)' : 'rgba(12, 19, 34, 0.5)',
                      border: `1px solid ${set.completed ? 'rgba(0, 245, 155, 0.3)' : 'var(--border-color)'}`,
                      borderRadius: '0.5rem',
                      padding: '0.35rem 0.5rem',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontWeight: 800, color: 'var(--text-muted)' }}>
                      #{set.setNumber}
                    </div>

                    <div>
                      <input
                        type="number"
                        step="0.5"
                        className="input"
                        style={{ textAlign: 'center', padding: '0.3rem' }}
                        value={set.weightKg === 0 ? '' : set.weightKg}
                        placeholder="0"
                        onChange={e => handleUpdateSet(exIndex, setIndex, 'weightKg', Number(e.target.value))}
                      />
                    </div>

                    <div>
                      <input
                        type="number"
                        className="input"
                        style={{ textAlign: 'center', padding: '0.3rem' }}
                        value={set.reps === 0 ? '' : set.reps}
                        placeholder="0"
                        onChange={e => handleUpdateSet(exIndex, setIndex, 'reps', Number(e.target.value))}
                      />
                    </div>

                    <div>
                      <input
                        type="number"
                        step="0.5"
                        min="5"
                        max="10"
                        className="input"
                        style={{ textAlign: 'center', padding: '0.3rem' }}
                        value={set.rpe || ''}
                        placeholder="選填"
                        onChange={e => handleUpdateSet(exIndex, setIndex, 'rpe', Number(e.target.value))}
                      />
                    </div>

                    <div>
                      <button
                        type="button"
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          border: `2px solid ${set.completed ? 'var(--neon-green)' : 'var(--border-light)'}`,
                          background: set.completed ? 'var(--neon-green)' : 'transparent',
                          color: set.completed ? '#090d16' : 'transparent',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s'
                        }}
                        onClick={() => handleToggleSetComplete(exIndex, setIndex)}
                      >
                        <Check size={18} strokeWidth={3} />
                      </button>
                    </div>

                    <div>
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon btn-sm"
                        style={{ color: 'var(--text-dim)', background: 'transparent' }}
                        onClick={() => handleRemoveSet(exIndex, setIndex)}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Set Button */}
              <div style={{ marginTop: '0.75rem' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%' }}
                  onClick={() => handleAddSet(exIndex)}
                >
                  <Plus size={14} />
                  <span>新增一組</span>
                </button>
              </div>
            </div>
          ))}

          {/* Add Exercise Button */}
          <div style={{ textAlign: 'center' }}>
            <button
              className="btn btn-purple"
              style={{ padding: '0.8rem 2rem', fontSize: '1rem' }}
              onClick={() => setIsExercisePickerOpen(true)}
            >
              <Plus size={18} />
              <span>新增動作至今日課表</span>
            </button>
          </div>
        </div>
      ) : (
        /* ======================= ROUTINES & HISTORY VIEW ======================= */
        <div className="flex flex-col gap-6">
          {/* Header & Quick Start */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>健身訓練課表與日誌</h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                制定經典分化課表、記錄組數重量次數，見證體能突破。
              </p>
            </div>

            <button className="btn btn-primary" onClick={handleStartEmptyWorkout}>
              <Play size={16} />
              <span>自由開始空訓練</span>
            </button>
          </div>

          {/* Routine Templates Grid */}
          <div>
            <div className="flex items-center justify-between" style={{ marginBottom: '0.85rem' }}>
              <div className="flex items-center gap-2">
                <Dumbbell size={18} style={{ color: 'var(--neon-green)' }} />
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>經典健身訓練課表模板</h2>
              </div>
            </div>

            <div className="grid-cols-2 grid-responsive-2 gap-4">
              {DEFAULT_ROUTINE_TEMPLATES.map(tmpl => (
                <div key={tmpl.id} className="glass-card glow-green flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between" style={{ marginBottom: '0.4rem' }}>
                      <span className="badge badge-purple">{tmpl.category}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{tmpl.exercises.length} 個動作</span>
                    </div>

                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                      {tmpl.title}
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
                      {tmpl.description}
                    </p>

                    {/* Exercises Preview */}
                    <div className="flex flex-col gap-1" style={{ marginBottom: '1rem' }}>
                      {tmpl.exercises.map(e => (
                        <div key={e.exerciseId} style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'flex', justifyContent: 'space-between' }}>
                          <span>• {e.exerciseName}</span>
                          <span>{e.targetSets} 組 x {e.targetReps} 次</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    className="btn btn-secondary"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => handleStartFromTemplate(tmpl)}
                  >
                    <Play size={15} style={{ color: 'var(--neon-green)' }} />
                    <span>載入課表並開始訓練</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Past Workout Sessions History */}
          <div>
            <div className="flex items-center gap-2" style={{ marginBottom: '0.85rem' }}>
              <Clock size={18} style={{ color: 'var(--neon-cyan)' }} />
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>過往訓練日誌歷史 ({sessions.length})</h2>
            </div>

            {sessions.length === 0 ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                <Dumbbell size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
                <p>目前尚未有已完成的訓練紀錄。</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
                  點擊上方的課表模板「載入並開始訓練」即可留下第一筆紀錄！
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {sessions.map(s => (
                  <div key={s.id} className="glass-card">
                    <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginBottom: '0.75rem' }}>
                      <div>
                        <div className="flex items-center gap-2">
                          <span style={{ fontWeight: 800, fontSize: '1.05rem' }}>{s.routineTitle}</span>
                          <span className="badge badge-green">{s.date}</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          時間: {s.startTime} ~ {s.endTime || '完成'} {s.durationMinutes ? `(${s.durationMinutes} 分鐘)` : ''} · 動作數: {s.exercises.length}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {Boolean(s.caloriesBurned) && (
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>訓練消耗</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--neon-amber)' }}>
                              {s.caloriesBurned} <span style={{ fontSize: '0.75rem' }}>kcal</span>
                            </div>
                          </div>
                        )}

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>總訓練容量</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--neon-green)' }}>
                            {s.totalVolumeKg.toLocaleString()} <span style={{ fontSize: '0.75rem' }}>kg</span>
                          </div>
                        </div>

                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          title="刪除紀錄"
                          onClick={() => handleDeletePastSession(s.id)}
                          style={{ color: 'var(--text-dim)', background: 'transparent' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Exercises completed summary */}
                    <div className="flex flex-wrap gap-2" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                      {s.exercises.map((e, idx) => (
                        <span key={idx} className="badge badge-gray" style={{ fontSize: '0.75rem' }}>
                          {e.exerciseName} ({e.sets.filter(st => st.completed).length}組)
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================= EXERCISE PICKER MODAL ======================= */}
      {isExercisePickerOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <Dumbbell size={18} className="logo-accent" />
                <h3 className="modal-title">選擇動作加入課表</h3>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setIsExercisePickerOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body flex flex-col gap-4">
              {/* Search & Category Filter */}
              <div className="flex flex-col gap-2">
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="input"
                    placeholder="搜尋動作，例如: 臥推、深蹲、槓鈴、啞鈴、二頭..."
                    style={{ paddingLeft: '2.2rem' }}
                    value={exerciseSearch}
                    onChange={e => setExerciseSearch(e.target.value)}
                  />
                </div>

                <div className="flex gap-1 flex-wrap">
                  {(Object.keys(CATEGORY_MAP) as (ExerciseCategory | 'all')[]).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      className={`btn btn-sm ${selectedCat === cat ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem' }}
                      onClick={() => setSelectedCat(cat)}
                    >
                      {CATEGORY_MAP[cat]} ({categoryCounts[cat] || 0})
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Results Count */}
              <div className="flex items-center justify-between" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span>找到 <strong>{filteredExercises.length}</strong> 個動作</span>
                {exerciseSearch && (
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '0.75rem', padding: '0.1rem 0.4rem', color: 'var(--neon-cyan)' }}
                    onClick={() => setExerciseSearch('')}
                  >
                    清除搜尋
                  </button>
                )}
              </div>

              {/* Exercise List */}
              <div style={{ maxHeight: '380px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {filteredExercises.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    找不到符合「{exerciseSearch}」的動作
                  </div>
                ) : (
                  filteredExercises.map(ex => (
                    <div
                      key={ex.id}
                      style={{
                        padding: '0.7rem 0.85rem',
                        borderRadius: '0.65rem',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'border-color 0.15s, background 0.15s'
                      }}
                      onClick={() => handleAddExerciseToSession(ex)}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>{ex.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span className="badge badge-cyan" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
                            {EQUIPMENT_MAP[ex.equipment] || ex.equipment}
                          </span>
                          <span>主要肌群: <strong style={{ color: 'var(--text-muted)' }}>{ex.primaryMuscle}</strong></span>
                        </div>
                      </div>

                      <button type="button" className="btn btn-secondary btn-sm" style={{ flexShrink: 0 }}>
                        <Plus size={14} />
                        <span>加入</span>
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Custom Exercise Link */}
              <div style={{ textAlign: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--neon-green)' }}
                  onClick={() => {
                    setIsExercisePickerOpen(false);
                    setIsCustomExOpen(true);
                  }}
                >
                  <Plus size={14} />
                  <span>找不到動作？點此手動新增自訂動作</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================= CREATE CUSTOM EXERCISE MODAL ======================= */}
      {isCustomExOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title">新增自訂訓練動作</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setIsCustomExOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomExercise}>
              <div className="modal-body flex flex-col gap-3">
                <div>
                  <label className="label">動作名稱</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="例如: 六角槓硬舉、早安式推舉"
                    value={customExName}
                    onChange={e => setCustomExName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="label">訓練肌群分類</label>
                  <select
                    className="select"
                    value={customExCat}
                    onChange={e => setCustomExCat(e.target.value as ExerciseCategory)}
                  >
                    <option value="chest">胸部</option>
                    <option value="back">背部</option>
                    <option value="legs">腿部</option>
                    <option value="shoulders">肩部</option>
                    <option value="arms">手臂</option>
                    <option value="core">核心</option>
                    <option value="cardio">有氧</option>
                  </select>
                </div>

                <div>
                  <label className="label">器材類型</label>
                  <select
                    className="select"
                    value={customExEquip}
                    onChange={e => setCustomExEquip(e.target.value as EquipmentType)}
                  >
                    <option value="barbell">槓鈴</option>
                    <option value="dumbbell">啞鈴</option>
                    <option value="machine">機械式</option>
                    <option value="cable">滑輪鋼索</option>
                    <option value="bodyweight">徒手自重</option>
                    <option value="other">其他</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsCustomExOpen(false)}>
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  確認建立
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================= FINISH WORKOUT CONFIRMATION MODAL ======================= */}
      {isFinishModalOpen && activeSession && (() => {
        let totalVol = 0;
        let totalSetsCompleted = 0;
        activeSession.exercises.forEach(ex => {
          ex.sets.forEach(set => {
            if (set.completed && set.weightKg > 0 && set.reps > 0) {
              totalVol += set.weightKg * set.reps;
              totalSetsCompleted++;
            }
          });
        });

        return (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '520px' }}>
              <div className="modal-header">
                <div className="flex items-center gap-2">
                  <Sparkles size={20} style={{ color: 'var(--neon-green)' }} />
                  <h3 className="modal-title">恭喜完成訓練！確認成效與熱量</h3>
                </div>
                <button className="btn btn-ghost btn-icon" onClick={() => setIsFinishModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body flex flex-col gap-4">
                {/* Stats Summary Card */}
                <div className="grid-cols-3 grid-responsive-3 gap-2" style={{ textAlign: 'center' }}>
                  <div style={{ background: 'rgba(12, 19, 34, 0.6)', padding: '0.75rem', borderRadius: '0.65rem', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>訓練時長</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      {finishDurationMinutes} <span style={{ fontSize: '0.75rem' }}>分鐘</span>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(12, 19, 34, 0.6)', padding: '0.75rem', borderRadius: '0.65rem', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>完成總組數</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--neon-purple)' }}>
                      {totalSetsCompleted} <span style={{ fontSize: '0.75rem' }}>組</span>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(12, 19, 34, 0.6)', padding: '0.75rem', borderRadius: '0.65rem', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>總訓練容量</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--neon-green)' }}>
                      {totalVol.toLocaleString()} <span style={{ fontSize: '0.75rem' }}>kg</span>
                    </div>
                  </div>
                </div>

                {/* Calorie Burn Input Card */}
                <div style={{
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '0.85rem',
                  padding: '1rem',
                }}>
                  <div className="flex items-center gap-2" style={{ marginBottom: '0.35rem' }}>
                    <Flame size={18} style={{ color: 'var(--neon-amber)' }} />
                    <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--neon-amber)' }}>
                      本次運動消耗熱量 (kcal)
                    </label>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    系統已依據體重 ({activeProfile.weightKg}kg) 與 ACSM 重訓代謝當量預先估算，您亦可依據 Apple Watch / Garmin 實測值手動修改。
                  </p>

                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      max="3000"
                      className="input"
                      style={{
                        fontSize: '1.5rem',
                        fontWeight: 900,
                        textAlign: 'center',
                        color: 'var(--neon-amber)',
                        padding: '0.5rem'
                      }}
                      value={finishCaloriesBurned}
                      onChange={e => setFinishCaloriesBurned(Number(e.target.value))}
                    />
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-muted)' }}>kcal</span>
                  </div>
                </div>

                {/* Optional Workout Notes */}
                <div>
                  <label className="label">訓練筆記 / 身體狀態 (選填)</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="例如: 今天臥推手感極佳、睡眠充足力量充沛"
                    value={finishNotes}
                    onChange={e => setFinishNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsFinishModalOpen(false)}>
                  返回繼續練
                </button>
                <button type="button" className="btn btn-primary" onClick={handleConfirmFinishWorkout}>
                  <Check size={16} />
                  <span>確認儲存訓練日誌</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
