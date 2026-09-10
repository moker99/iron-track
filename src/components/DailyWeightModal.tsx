import React, { useState, useEffect, useMemo } from 'react';
import { X, Scale, Trash2, Check, Calendar, AlertCircle } from 'lucide-react';
import type { UserProfile, WeightEntry } from '../types';
import { StorageService } from '../services/storage';
import { calculateBMI } from '../utils/nutrition';
import { NumberInput } from './NumberInput';

interface DailyWeightModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProfile: UserProfile;
  initialDate?: string;
  onSaved?: (entry: WeightEntry) => void;
  onDeleted?: (id: string) => void;
}

const COMMON_WEIGHT_NOTES = [
  '晨起空腹',
  '排便後',
  '練前量測',
  '練後補水前',
  '大餐隔天',
  '水腫/休息日',
];

export const DailyWeightModal: React.FC<DailyWeightModalProps> = ({
  isOpen,
  onClose,
  activeProfile,
  initialDate,
  onSaved,
  onDeleted,
}) => {
  const [date, setDate] = useState<string>(
    initialDate || new Date().toISOString().split('T')[0]
  );
  const [weightKg, setWeightKg] = useState<number>(activeProfile.weightKg || 70);
  const [note, setNote] = useState<string>('');
  const [existingId, setExistingId] = useState<string | null>(null);

  // 當彈窗開啟或日期變動時，自動載入該日已有之體重紀錄
  useEffect(() => {
    if (!isOpen) return;
    const targetDate = initialDate || new Date().toISOString().split('T')[0];
    setDate(targetDate);
    loadEntryForDate(targetDate);
  }, [isOpen, initialDate, activeProfile.id]);

  const loadEntryForDate = (dateStr: string) => {
    const existing = StorageService.getWeightByDate(activeProfile.id, dateStr);
    if (existing) {
      setExistingId(existing.id);
      setWeightKg(existing.weightKg);
      setNote(existing.note || '');
    } else {
      setExistingId(null);
      // 若該日無紀錄，嘗試抓取最近一筆體重，若無則使用 profile 的 weightKg
      const latest = StorageService.getLatestWeight(activeProfile.id);
      setWeightKg(latest ? latest.weightKg : (activeProfile.weightKg || 70));
      setNote('');
    }
  };

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    loadEntryForDate(newDate);
  };

  const handleAdjustWeight = (delta: number) => {
    setWeightKg(prev => Number((Math.max(20, Math.min(300, (prev || 70) + delta))).toFixed(1)));
  };

  // BMI 與目標差距
  const bmiInfo = useMemo(() => {
    return calculateBMI(weightKg, activeProfile.heightCm);
  }, [weightKg, activeProfile.heightCm]);

  const targetDiff = useMemo(() => {
    if (!activeProfile.targetWeightKg) return null;
    const diff = Number((weightKg - activeProfile.targetWeightKg).toFixed(1));
    return diff;
  }, [weightKg, activeProfile.targetWeightKg]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (weightKg <= 0) return;

    const entry: WeightEntry = {
      id: existingId || `weight-${activeProfile.id}-${date}-${Date.now()}`,
      userId: activeProfile.id,
      date,
      weightKg: Number(weightKg.toFixed(1)),
      note: note.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    StorageService.saveWeightEntry(entry);
    onSaved?.(entry);
    onClose();
  };

  const handleDelete = () => {
    if (!existingId) return;
    if (window.confirm(`確定要刪除 ${date} 的體重紀錄 (${weightKg} kg) 嗎？`)) {
      StorageService.deleteWeightEntry(existingId);
      onDeleted?.(existingId);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="modal-container"
        style={{ maxWidth: '480px', width: '95%' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <Scale size={22} style={{ color: 'var(--neon-green)' }} />
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                {existingId ? '修改體重紀錄' : '記錄今日體重'}
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {activeProfile.name} • 每日量測掌握水分與真實體重走勢
              </p>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" style={{ padding: '1.25rem' }}>
          {/* 日期選擇 */}
          <div className="form-group">
            <label className="form-label flex items-center gap-1">
              <Calendar size={14} style={{ color: 'var(--neon-cyan)' }} />
              量測日期
            </label>
            <input
              type="date"
              className="input-field"
              value={date}
              onChange={e => handleDateChange(e.target.value)}
              required
            />
          </div>

          {/* 體重輸入主要區塊 */}
          <div
            style={{
              background: 'rgba(12, 19, 34, 0.7)',
              padding: '1rem',
              borderRadius: '0.85rem',
              border: '1px solid var(--border-color)',
            }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
              <label className="form-label" style={{ marginBottom: 0, fontWeight: 700, color: 'var(--text-main)' }}>
                體重 (kg) <span style={{ color: 'var(--neon-rose)' }}>*</span>
              </label>
              <div className="flex items-center gap-2" style={{ fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>BMI:</span>
                <span className={bmiInfo.color} style={{ fontWeight: 700 }}>
                  {bmiInfo.bmi} ({bmiInfo.label})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2" style={{ marginBottom: '0.75rem' }}>
              <NumberInput
                value={weightKg}
                onChange={val => setWeightKg(Number((val || 0).toFixed(1)))}
                step="0.1"
                min={20}
                max={300}
                placeholder="70.0"
                style={{
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  textAlign: 'center',
                  color: 'var(--neon-green)',
                }}
                autoFocus
              />
              <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>kg</span>
            </div>

            {/* 快速微調按鈕 */}
            <div className="flex items-center justify-between gap-1">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ flex: 1, padding: '0.35rem 0.25rem', fontSize: '0.75rem' }}
                onClick={() => handleAdjustWeight(-0.5)}
              >
                -0.5
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ flex: 1, padding: '0.35rem 0.25rem', fontSize: '0.75rem' }}
                onClick={() => handleAdjustWeight(-0.1)}
              >
                -0.1
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ flex: 1, padding: '0.35rem 0.25rem', fontSize: '0.75rem' }}
                onClick={() => handleAdjustWeight(0.1)}
              >
                +0.1
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ flex: 1, padding: '0.35rem 0.25rem', fontSize: '0.75rem' }}
                onClick={() => handleAdjustWeight(0.5)}
              >
                +0.5
              </button>
            </div>

            {/* 目標體重差距提示 */}
            {activeProfile.targetWeightKg && targetDiff !== null && (
              <div
                className="flex items-center justify-between"
                style={{
                  marginTop: '0.75rem',
                  paddingTop: '0.6rem',
                  borderTop: '1px dashed var(--border-color)',
                  fontSize: '0.8rem',
                }}
              >
                <span style={{ color: 'var(--text-muted)' }}>
                  目標體重: {activeProfile.targetWeightKg} kg
                </span>
                <span
                  style={{
                    fontWeight: 700,
                    color: targetDiff === 0
                      ? 'var(--neon-green)'
                      : targetDiff > 0
                        ? 'var(--neon-amber)'
                        : 'var(--neon-cyan)',
                  }}
                >
                  {targetDiff === 0
                    ? '🎉 已精準達標！'
                    : targetDiff > 0
                      ? `高出 +${targetDiff} kg`
                      : `差距 ${targetDiff} kg`}
                </span>
              </div>
            )}
          </div>

          {/* 狀態備註與常用標籤 */}
          <div className="form-group">
            <label className="form-label" style={{ marginBottom: '0.25rem' }}>
              狀態備註 <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>(選填)</span>
            </label>
            <input
              type="text"
              className="input-field"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="例如：晨起空腹、大餐隔日、練前"
              style={{ marginBottom: '0.5rem' }}
            />
            {/* 常用標籤 */}
            <div className="flex flex-wrap gap-1">
              {COMMON_WEIGHT_NOTES.map(tag => (
                <button
                  key={tag}
                  type="button"
                  className={`badge ${note === tag ? 'badge-green' : 'badge-gray'}`}
                  style={{ cursor: 'pointer', fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                  onClick={() => setNote(prev => prev === tag ? '' : tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* 提示：自動聯動今日飲食方案 */}
          <div
            className="flex items-start gap-2"
            style={{
              background: 'rgba(0, 245, 155, 0.06)',
              border: '1px solid rgba(0, 245, 155, 0.2)',
              borderRadius: '0.6rem',
              padding: '0.6rem 0.75rem',
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
            }}
          >
            <AlertCircle size={15} style={{ color: 'var(--neon-green)', flexShrink: 0, marginTop: '2px' }} />
            <span>
              儲存後，今日飲食目標將立即依據此體重動態計算蛋白質與碳水循環克數，並同步備份至雲端。
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3" style={{ marginTop: '0.5rem' }}>
            {existingId ? (
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={handleDelete}
              >
                <Trash2 size={15} />
                <span>刪除此日紀錄</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={onClose}
              >
                取消
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
              >
                <Check size={16} />
                <span>{existingId ? '更新紀錄' : '儲存紀錄'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
