import React, { useState, useMemo } from 'react';
import {
  Utensils,
  Plus,
  Trash2,
  Calendar,
  Flame,
  Search,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import type { FoodCategory, FoodItem, MealEntry, MealType, UserProfile } from '../types';
import { StorageService } from '../services/storage';
import { getUserNutritionTargets } from '../utils/nutrition';

interface DietTrackerViewProps {
  activeProfile: UserProfile;
  onOpenProfileEdit: () => void;
}

const MEAL_TYPES: { type: MealType; label: string; icon: string; defaultTime: string }[] = [
  { type: 'breakfast', label: '早餐 (Breakfast)', icon: '🍳', defaultTime: '08:00' },
  { type: 'lunch', label: '午餐 (Lunch)', icon: '🍱', defaultTime: '12:30' },
  { type: 'dinner', label: '晚餐 (Dinner)', icon: '🥩', defaultTime: '18:30' },
  { type: 'snack', label: '點心 / 練後加餐 (Snacks & Post-workout)', icon: '🥤', defaultTime: '16:00' },
];

const CATEGORY_NAMES: Record<FoodCategory | 'all', string> = {
  all: '全部食材',
  meat: '肉類 / 海鮮',
  staple: '主食 / 碳水',
  egg_dairy: '蛋品 / 乳製品',
  veggie: '蔬菜 / 纖維',
  supplement: '乳清 / 補劑',
  other: '健康油脂 / 其他',
};

export const DietTrackerView: React.FC<DietTrackerViewProps> = ({
  activeProfile,
  onOpenProfileEdit,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [mealLogs, setMealLogs] = useState<MealEntry[]>(() =>
    StorageService.getMealsByDate(activeProfile.id, selectedDate)
  );

  // Food Picker Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [targetMealType, setTargetMealType] = useState<MealType>('breakfast');
  const [activeFoodTab, setActiveFoodTab] = useState<'preset' | 'custom'>('preset');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FoodCategory | 'all'>('all');
  const [allFoods, setAllFoods] = useState<FoodItem[]>(() => StorageService.getAllFoods());

  // Selected Food Item to adjust portion
  const [chosenFood, setChosenFood] = useState<FoodItem | null>(null);
  const [inputMode, setInputMode] = useState<'grams' | 'servings'>('grams');
  const [inputGrams, setInputGrams] = useState<number>(100);
  const [servingsMultiplier, setServingsMultiplier] = useState<number>(1);

  // Custom Food Form
  const [customName, setCustomName] = useState('');
  const [customBasis, setCustomBasis] = useState<'per100g' | 'perServing'>('per100g');
  const [customBaseGrams, setCustomBaseGrams] = useState<number>(100);
  const [customCalories, setCustomCalories] = useState<number>(150);
  const [customProtein, setCustomProtein] = useState<number>(15);
  const [customCarbs, setCustomCarbs] = useState<number>(10);
  const [customFat, setCustomFat] = useState<number>(3);
  const [customServingSize, setCustomServingSize] = useState('100g');
  const [customIntakeGrams, setCustomIntakeGrams] = useState<number>(100);

  // 重新載入當日飲食
  const refreshMealLogs = (date: string) => {
    setMealLogs(StorageService.getMealsByDate(activeProfile.id, date));
  };

  const handleDateChange = (daysOffset: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + daysOffset);
    const newDateStr = current.toISOString().split('T')[0];
    setSelectedDate(newDateStr);
    refreshMealLogs(newDateStr);
  };

  // 當日訓練消耗
  const dayWorkouts = useMemo(() => {
    return StorageService.getWorkoutSessions(activeProfile.id).filter(w => w.date === selectedDate);
  }, [activeProfile.id, selectedDate]);

  const dayWorkoutBurn = useMemo(() => {
    return dayWorkouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);
  }, [dayWorkouts]);

  // 營養素目標
  const targets = useMemo(() => getUserNutritionTargets(activeProfile), [activeProfile]);

  // 當日總攝取統計
  const totals = useMemo(() => {
    let cal = 0;
    let p = 0;
    let c = 0;
    let f = 0;
    mealLogs.forEach(m => {
      cal += m.calories;
      p += m.protein;
      c += m.carbs;
      f += m.fat;
    });
    const dynamicTarget = targets.targetCalories + dayWorkoutBurn;
    return {
      calories: Math.round(cal),
      protein: Math.round(p * 10) / 10,
      carbs: Math.round(c * 10) / 10,
      fat: Math.round(f * 10) / 10,
      remainingCalories: Math.round(dynamicTarget - cal),
      formulaVerifiedCalories: Math.round((p * 4) + (c * 4) + (f * 9)),
      workoutBurn: dayWorkoutBurn,
      dynamicTarget
    };
  }, [mealLogs, targets.targetCalories, dayWorkoutBurn]);

  const filteredFoods = useMemo(() => {
    return allFoods.filter(food => {
      const matchSearch = food.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = selectedCategory === 'all' || food.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [allFoods, searchQuery, selectedCategory]);

  const handleOpenAddModal = (mealType: MealType) => {
    setTargetMealType(mealType);
    const first = allFoods[0] || null;
    setChosenFood(first);
    setServingsMultiplier(1);
    setInputGrams(first?.baseWeightGrams || 100);
    setInputMode('grams');
    setIsAddModalOpen(true);
  };

  const handleAddChosenFood = () => {
    if (!chosenFood) return;
    const baseWeight = chosenFood.baseWeightGrams || 100;

    let cal: number;
    let prot: number;
    let carb: number;
    let fatVal: number;
    let servings: number;
    let unit: string;
    let weightGrams: number | undefined;

    if (inputMode === 'grams') {
      const factor = inputGrams / baseWeight;
      cal = Math.round(chosenFood.calories * factor);
      prot = Math.round(chosenFood.protein * factor * 10) / 10;
      carb = Math.round(chosenFood.carbs * factor * 10) / 10;
      fatVal = Math.round(chosenFood.fat * factor * 10) / 10;
      servings = Math.round(factor * 100) / 100;
      unit = `${inputGrams}g`;
      weightGrams = Number(inputGrams);
    } else {
      cal = Math.round(chosenFood.calories * servingsMultiplier);
      prot = Math.round(chosenFood.protein * servingsMultiplier * 10) / 10;
      carb = Math.round(chosenFood.carbs * servingsMultiplier * 10) / 10;
      fatVal = Math.round(chosenFood.fat * servingsMultiplier * 10) / 10;
      servings = Number(servingsMultiplier);
      unit = chosenFood.servingSize;
      weightGrams = chosenFood.baseWeightGrams ? Math.round(chosenFood.baseWeightGrams * servingsMultiplier) : undefined;
    }

    const entry: MealEntry = {
      id: `meal-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      userId: activeProfile.id,
      date: selectedDate,
      mealType: targetMealType,
      foodName: chosenFood.name,
      servings,
      servingUnit: unit,
      weightGrams,
      inputMode,
      calories: cal,
      protein: prot,
      carbs: carb,
      fat: fatVal,
      createdAt: new Date().toISOString(),
    };

    StorageService.addMealEntry(entry);
    refreshMealLogs(selectedDate);
    setIsAddModalOpen(false);
  };

  const handleAddCustomFood = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const baseGrams = customBasis === 'per100g' ? 100 : Number(customBaseGrams || 100);
    const servingDesc = customBasis === 'per100g' ? '100g' : (customServingSize.trim() || '1份');

    const newFood: FoodItem = {
      id: `custom-food-${Date.now()}`,
      name: customName.trim(),
      calories: Number(customCalories),
      protein: Number(customProtein),
      carbs: Number(customCarbs),
      fat: Number(customFat),
      servingSize: servingDesc,
      baseWeightGrams: baseGrams,
      category: 'other',
      isCustom: true,
    };

    StorageService.addCustomFood(newFood);
    setAllFoods(StorageService.getAllFoods());

    // 同步新增到今日餐點 (根據本次吃下克數)
    const factor = customIntakeGrams / baseGrams;
    const entry: MealEntry = {
      id: `meal-${Date.now()}`,
      userId: activeProfile.id,
      date: selectedDate,
      mealType: targetMealType,
      foodName: newFood.name,
      servings: Math.round(factor * 100) / 100,
      servingUnit: `${customIntakeGrams}g`,
      weightGrams: Number(customIntakeGrams),
      inputMode: 'grams',
      calories: Math.round(newFood.calories * factor),
      protein: Math.round(newFood.protein * factor * 10) / 10,
      carbs: Math.round(newFood.carbs * factor * 10) / 10,
      fat: Math.round(newFood.fat * factor * 10) / 10,
      createdAt: new Date().toISOString(),
    };

    StorageService.addMealEntry(entry);
    refreshMealLogs(selectedDate);
    setIsAddModalOpen(false);
  };

  const handleDeleteMeal = (id: string) => {
    StorageService.deleteMealEntry(id);
    refreshMealLogs(selectedDate);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Date Switcher & Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>飲食與三大營養素追蹤</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            精準量化蛋白質、碳水化合物、脂肪能量平衡，達成體態目標。
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2" style={{ background: 'rgba(18, 26, 43, 0.7)', padding: '0.35rem 0.6rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
          <button className="btn btn-secondary btn-icon btn-sm" onClick={() => handleDateChange(-1)}>
            <ChevronLeft size={16} />
          </button>
          <div className="flex items-center gap-2">
            <Calendar size={15} style={{ color: 'var(--neon-green)' }} />
            <input
              type="date"
              value={selectedDate}
              onChange={e => {
                setSelectedDate(e.target.value);
                refreshMealLogs(e.target.value);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-main)',
                fontFamily: 'inherit',
                fontSize: '0.875rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            />
          </div>
          <button className="btn btn-secondary btn-icon btn-sm" onClick={() => handleDateChange(1)}>
            <ChevronRight size={16} />
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              const today = new Date().toISOString().split('T')[0];
              setSelectedDate(today);
              refreshMealLogs(today);
            }}
          >
            今日
          </button>
        </div>
      </div>

      {/* Daily Macros & Calorie Summary Card */}
      <div className="glass-card glow-green">
        <div className="flex items-center justify-between flex-wrap gap-3" style={{ marginBottom: '1.25rem' }}>
          <div className="flex items-center gap-2">
            <Flame size={22} style={{ color: 'var(--neon-green)' }} />
            <div>
              <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>今日熱量預算與三大元素分配</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                (目標: {activeProfile.goal === 'gain_muscle' ? '增肌' : activeProfile.goal === 'lose_fat' ? '減脂' : '維持'})
              </span>
            </div>
          </div>

          <button className="btn btn-secondary btn-sm" onClick={onOpenProfileEdit}>
            <Sparkles size={14} style={{ color: 'var(--neon-cyan)' }} />
            <span>調整 TDEE 目標</span>
          </button>
        </div>

        {/* Workout burn bonus banner */}
        {totals.workoutBurn > 0 && (
          <div style={{
            background: 'rgba(0, 245, 155, 0.08)',
            border: '1px solid rgba(0, 245, 155, 0.25)',
            borderRadius: '0.75rem',
            padding: '0.65rem 1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.85rem'
          }}>
            <Flame size={18} style={{ color: 'var(--neon-green)', flexShrink: 0 }} />
            <span>今日已記錄 <strong>{dayWorkouts.length} 次訓練</strong>，運動消耗 <strong>+{totals.workoutBurn} kcal</strong>！系統已將消耗熱量自動計入當日動態預算。</span>
          </div>
        )}

        {/* Calories Progress & Remaining */}
        <div className="grid-cols-4 grid-responsive-2 gap-4" style={{ marginBottom: '1.5rem' }}>
          <div style={{ background: 'rgba(12, 19, 34, 0.6)', padding: '1rem', borderRadius: '0.85rem', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>基準目標熱量 (Target)</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-main)' }}>
              {targets.targetCalories} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>kcal</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
              {totals.workoutBurn > 0 ? `TDEE ${targets.tdee} + 運動 ${totals.workoutBurn}k` : `BMR ${targets.bmr} · TDEE ${targets.tdee}`}
            </div>
          </div>

          <div style={{ background: 'rgba(12, 19, 34, 0.6)', padding: '1rem', borderRadius: '0.85rem', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>已攝取熱量 (Consumed)</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: totals.calories > totals.dynamicTarget ? 'var(--neon-rose)' : 'var(--neon-green)' }}>
              {totals.calories} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>kcal</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
              佔動態預算 {Math.round((totals.calories / totals.dynamicTarget) * 100)}%
            </div>
          </div>

          <div style={{ background: 'rgba(12, 19, 34, 0.6)', padding: '1rem', borderRadius: '0.85rem', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>剩餘可用熱量 (Remaining)</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: totals.remainingCalories < 0 ? 'var(--neon-rose)' : 'var(--neon-cyan)' }}>
              {totals.remainingCalories} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>kcal</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
              {totals.workoutBurn > 0 ? `含運動 +${totals.workoutBurn}k 加成` : (totals.remainingCalories >= 0 ? '仍在熱量預算範圍內' : '已超出預算赤字')}
            </div>
          </div>

          <div style={{ background: 'rgba(12, 19, 34, 0.6)', padding: '1rem', borderRadius: '0.85rem', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>三大元素能量驗證</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--neon-amber)' }}>
              {totals.formulaVerifiedCalories} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>kcal</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              4P ({Math.round(totals.protein * 4)}) + 4C ({Math.round(totals.carbs * 4)}) + 9F ({Math.round(totals.fat * 9)})
            </div>
          </div>
        </div>

        {/* 3 Macro Progress Bars */}
        <div className="grid-cols-3 grid-responsive-3 gap-4">
          {/* Protein */}
          <div className="macro-card-item">
            <div className="flex items-center justify-between" style={{ marginBottom: '0.35rem' }}>
              <div className="flex items-center gap-1">
                <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>4 kcal/g</span>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>蛋白質 (Protein)</span>
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--neon-emerald)' }}>
                {totals.protein} / {targets.targetProtein}g
              </span>
            </div>
            <div className="progress-bar-bg" style={{ height: '7px' }}>
              <div
                className="progress-bar-fill"
                style={{
                  width: `${Math.min(100, Math.round((totals.protein / targets.targetProtein) * 100))}%`,
                  background: 'linear-gradient(90deg, #10b981, #00f59b)'
                }}
              />
            </div>
            <div className="flex justify-between" style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.3rem' }}>
              <span>熱量: {Math.round(totals.protein * 4)} kcal</span>
              <span>{Math.round((totals.protein / targets.targetProtein) * 100)}% 達標</span>
            </div>
          </div>

          {/* Carbs */}
          <div className="macro-card-item">
            <div className="flex items-center justify-between" style={{ marginBottom: '0.35rem' }}>
              <div className="flex items-center gap-1">
                <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>4 kcal/g</span>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>碳水化合物 (Carbs)</span>
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--neon-cyan)' }}>
                {totals.carbs} / {targets.targetCarbs}g
              </span>
            </div>
            <div className="progress-bar-bg" style={{ height: '7px' }}>
              <div
                className="progress-bar-fill"
                style={{
                  width: `${Math.min(100, Math.round((totals.carbs / targets.targetCarbs) * 100))}%`,
                  background: 'linear-gradient(90deg, #0284c7, #06b6d4)'
                }}
              />
            </div>
            <div className="flex justify-between" style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.3rem' }}>
              <span>熱量: {Math.round(totals.carbs * 4)} kcal</span>
              <span>{Math.round((totals.carbs / targets.targetCarbs) * 100)}% 達標</span>
            </div>
          </div>

          {/* Fat */}
          <div className="macro-card-item">
            <div className="flex items-center justify-between" style={{ marginBottom: '0.35rem' }}>
              <div className="flex items-center gap-1">
                <span className="badge badge-amber" style={{ fontSize: '0.7rem' }}>9 kcal/g</span>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>健康脂肪 (Fat)</span>
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--neon-amber)' }}>
                {totals.fat} / {targets.targetFat}g
              </span>
            </div>
            <div className="progress-bar-bg" style={{ height: '7px' }}>
              <div
                className="progress-bar-fill"
                style={{
                  width: `${Math.min(100, Math.round((totals.fat / targets.targetFat) * 100))}%`,
                  background: 'linear-gradient(90deg, #d97706, #fbbf24)'
                }}
              />
            </div>
            <div className="flex justify-between" style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.3rem' }}>
              <span>熱量: {Math.round(totals.fat * 9)} kcal</span>
              <span>{Math.round((totals.fat / targets.targetFat) * 100)}% 達標</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Meal Cards Section */}
      <div className="flex flex-col gap-4">
        {MEAL_TYPES.map(({ type, label, icon }) => {
          const items = mealLogs.filter(m => m.mealType === type);
          const mealCals = items.reduce((sum, item) => sum + item.calories, 0);
          const mealP = Math.round(items.reduce((sum, item) => sum + item.protein, 0) * 10) / 10;
          const mealC = Math.round(items.reduce((sum, item) => sum + item.carbs, 0) * 10) / 10;
          const mealF = Math.round(items.reduce((sum, item) => sum + item.fat, 0) * 10) / 10;

          return (
            <div key={type} className="glass-card" style={{ padding: '1.2rem' }}>
              <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginBottom: '0.85rem' }}>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: '1.25rem' }}>{icon}</span>
                  <span style={{ fontWeight: 700, fontSize: '1rem' }}>{label}</span>
                  {items.length > 0 && (
                    <span className="badge badge-gray">{items.length} 筆食物</span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {items.length > 0 && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      小計: <strong style={{ color: 'var(--text-main)' }}>{mealCals} kcal</strong> (P: {mealP}g · C: {mealC}g · F: {mealF}g)
                    </div>
                  )}

                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleOpenAddModal(type)}
                  >
                    <Plus size={14} />
                    <span>加食物</span>
                  </button>
                </div>
              </div>

              {/* Food Items List */}
              {items.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '1.25rem',
                  color: 'var(--text-dim)',
                  fontSize: '0.85rem',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '0.65rem'
                }}>
                  尚無記錄，點擊「加食物」快速選取常吃健身餐。
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {items.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between"
                      style={{
                        background: 'rgba(12, 19, 34, 0.5)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '0.65rem',
                        padding: '0.65rem 0.85rem',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                          {item.foodName}
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                            {item.weightGrams ? `(${item.weightGrams}g)` : `(${item.servings} x ${item.servingUnit})`}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                          蛋: <strong style={{ color: 'var(--neon-emerald)' }}>{item.protein}g</strong> · 
                          碳: <strong style={{ color: 'var(--neon-cyan)' }}>{item.carbs}g</strong> · 
                          脂: <strong style={{ color: 'var(--neon-amber)' }}>{item.fat}g</strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                          {item.calories} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>kcal</span>
                        </span>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          title="刪除"
                          onClick={() => handleDeleteMeal(item.id)}
                          style={{ color: 'var(--text-dim)', background: 'transparent' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Food Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <Utensils size={18} className="logo-accent" />
                <h3 className="modal-title">
                  新增食物至 {MEAL_TYPES.find(m => m.type === targetMealType)?.label}
                </h3>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setIsAddModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Modal Nav Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'rgba(12, 19, 34, 0.4)' }}>
              <button
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  border: 'none',
                  background: 'transparent',
                  borderBottom: activeFoodTab === 'preset' ? '2px solid var(--neon-green)' : '2px solid transparent',
                  color: activeFoodTab === 'preset' ? 'var(--neon-green)' : 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
                onClick={() => setActiveFoodTab('preset')}
              >
                健身常用食材庫 ({allFoods.length})
              </button>
              <button
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  border: 'none',
                  background: 'transparent',
                  borderBottom: activeFoodTab === 'custom' ? '2px solid var(--neon-cyan)' : '2px solid transparent',
                  color: activeFoodTab === 'custom' ? 'var(--neon-cyan)' : 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
                onClick={() => setActiveFoodTab('custom')}
              >
                手動建立自訂食物
              </button>
            </div>

            <div className="modal-body flex flex-col gap-4">
              {activeFoodTab === 'preset' ? (
                <>
                  {/* Search and Category Filter */}
                  <div className="flex flex-col gap-2">
                    <div style={{ position: 'relative' }}>
                      <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        className="input"
                        placeholder="搜尋食材，例如: 雞胸肉、蛋、地瓜、燕麥..."
                        style={{ paddingLeft: '2.2rem' }}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                      />
                    </div>

                    <div className="flex gap-1 flex-wrap">
                      {(Object.keys(CATEGORY_NAMES) as (FoodCategory | 'all')[]).map(cat => (
                        <button
                          key={cat}
                          type="button"
                          className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem' }}
                          onClick={() => setSelectedCategory(cat)}
                        >
                          {CATEGORY_NAMES[cat]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Food Selection Grid */}
                  <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {filteredFoods.map(food => (
                      <div
                        key={food.id}
                        style={{
                          padding: '0.55rem 0.75rem',
                          borderRadius: '0.55rem',
                          background: chosenFood?.id === food.id ? 'rgba(0, 245, 155, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                          border: `1px solid ${chosenFood?.id === food.id ? 'var(--neon-green)' : 'var(--border-color)'}`,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                        onClick={() => {
                          setChosenFood(food);
                          setInputGrams(food.baseWeightGrams || 100);
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{food.name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                            每 {food.servingSize}: 蛋 {food.protein}g · 碳 {food.carbs}g · 脂 {food.fat}g
                            {food.baseWeightGrams && (
                              <span style={{ color: 'var(--neon-green)', marginLeft: '0.4rem' }}>
                                (每100g: {Math.round((food.calories / food.baseWeightGrams) * 100)} kcal)
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--neon-green)' }}>
                          {food.calories} kcal
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Chosen Food Portion & Grams Adjuster */}
                  {chosenFood && (() => {
                    const baseWeight = chosenFood.baseWeightGrams || 100;
                    const per1gCal = chosenFood.calories / baseWeight;
                    const per1gP = chosenFood.protein / baseWeight;
                    const per1gC = chosenFood.carbs / baseWeight;
                    const per1gF = chosenFood.fat / baseWeight;

                    const calculatedCalories = inputMode === 'grams'
                      ? Math.round(per1gCal * inputGrams)
                      : Math.round(chosenFood.calories * servingsMultiplier);

                    const calculatedProtein = inputMode === 'grams'
                      ? Math.round(per1gP * inputGrams * 10) / 10
                      : Math.round(chosenFood.protein * servingsMultiplier * 10) / 10;

                    const calculatedCarbs = inputMode === 'grams'
                      ? Math.round(per1gC * inputGrams * 10) / 10
                      : Math.round(chosenFood.carbs * servingsMultiplier * 10) / 10;

                    const calculatedFat = inputMode === 'grams'
                      ? Math.round(per1gF * inputGrams * 10) / 10
                      : Math.round(chosenFood.fat * servingsMultiplier * 10) / 10;

                    return (
                      <div style={{
                        background: 'rgba(0, 245, 155, 0.05)',
                        border: '1px solid rgba(0, 245, 155, 0.25)',
                        borderRadius: '0.85rem',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                      }}>
                        {/* Title & Mode Switcher */}
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>已選食材:</span>
                            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                              {chosenFood.name}
                            </div>
                          </div>

                          {/* Input Mode Toggle */}
                          <div style={{
                            display: 'flex',
                            background: 'rgba(12, 19, 34, 0.7)',
                            padding: '0.2rem',
                            borderRadius: '0.6rem',
                            border: '1px solid var(--border-color)',
                            gap: '0.2rem'
                          }}>
                            <button
                              type="button"
                              className={`btn btn-sm ${inputMode === 'grams' ? 'btn-primary' : 'btn-secondary'}`}
                              style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                              onClick={() => setInputMode('grams')}
                            >
                              ⚖️ 依公克 (g) 秤重
                            </button>
                            <button
                              type="button"
                              className={`btn btn-sm ${inputMode === 'servings' ? 'btn-primary' : 'btn-secondary'}`}
                              style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                              onClick={() => setInputMode('servings')}
                            >
                              📦 依份數輸入
                            </button>
                          </div>
                        </div>

                        {/* Per 100g / Per 1g benchmark pills */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '0.4rem',
                          background: 'rgba(12, 19, 34, 0.5)',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '0.6rem',
                          fontSize: '0.75rem',
                          border: '1px solid var(--border-color)'
                        }}>
                          <div className="flex items-center gap-2">
                            <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>每 100g 基準</span>
                            <span>
                              熱量 <strong>{Math.round(per1gCal * 100)} kcal</strong> · 
                              P: <strong style={{ color: 'var(--neon-emerald)' }}>{(per1gP * 100).toFixed(1)}g</strong> · 
                              C: <strong style={{ color: 'var(--neon-cyan)' }}>{(per1gC * 100).toFixed(1)}g</strong> · 
                              F: <strong style={{ color: 'var(--neon-amber)' }}>{(per1gF * 100).toFixed(1)}g</strong>
                            </span>
                          </div>
                          <div style={{ color: 'var(--text-dim)' }}>
                            每 1g: {per1gCal.toFixed(1)} kcal (P {per1gP.toFixed(2)}g / C {per1gC.toFixed(2)}g / F {per1gF.toFixed(2)}g)
                          </div>
                        </div>

                        {/* Input controls based on mode */}
                        {inputMode === 'grams' ? (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-3">
                              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                                實際秤重吃下 (公克 g):
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="1"
                                  max="3000"
                                  className="input"
                                  style={{ width: '110px', textAlign: 'center', fontWeight: 800, fontSize: '1.1rem', padding: '0.35rem' }}
                                  value={inputGrams === 0 ? '' : inputGrams}
                                  onChange={e => setInputGrams(Number(e.target.value))}
                                />
                                <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>g (公克)</span>
                              </div>
                            </div>

                            {/* Quick Gram Preset Buttons */}
                            <div className="flex items-center gap-1 flex-wrap">
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginRight: '0.2rem' }}>常用秤重:</span>
                              {[50, 100, 150, 180, 200, 250, 300].map(grams => (
                                <button
                                  key={grams}
                                  type="button"
                                  className={`btn btn-sm ${inputGrams === grams ? 'btn-primary' : 'btn-secondary'}`}
                                  style={{ fontSize: '0.72rem', padding: '0.2rem 0.45rem' }}
                                  onClick={() => setInputGrams(grams)}
                                >
                                  {grams}g
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>份量倍數 (每份 {chosenFood.servingSize}):</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                step="0.1"
                                min="0.1"
                                max="20"
                                className="input"
                                style={{ width: '90px', textAlign: 'center', fontWeight: 800, fontSize: '1.1rem', padding: '0.35rem' }}
                                value={servingsMultiplier}
                                onChange={e => setServingsMultiplier(Number(e.target.value))}
                              />
                              <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>份</span>
                            </div>
                          </div>
                        )}

                        {/* Real-time Calculated Nutrition Preview */}
                        <div style={{
                          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                          paddingTop: '0.65rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '0.5rem',
                        }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                            本次實際攝取 ({inputMode === 'grams' ? `${inputGrams}g` : `${servingsMultiplier} 份`}):
                          </span>
                          <div className="flex items-center gap-3">
                            <span style={{ color: 'var(--neon-emerald)', fontWeight: 700, fontSize: '0.9rem' }}>
                              蛋: {calculatedProtein}g
                            </span>
                            <span style={{ color: 'var(--neon-cyan)', fontWeight: 700, fontSize: '0.9rem' }}>
                              碳: {calculatedCarbs}g
                            </span>
                            <span style={{ color: 'var(--neon-amber)', fontWeight: 700, fontSize: '0.9rem' }}>
                              脂: {calculatedFat}g
                            </span>
                            <span style={{ color: 'var(--neon-green)', fontWeight: 900, fontSize: '1.25rem' }}>
                              {calculatedCalories} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>kcal</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </>
              ) : (
                /* Custom Food Form with 100g / Grams benchmark support */
                <form id="customFoodForm" onSubmit={handleAddCustomFood} className="flex flex-col gap-3">
                  {/* Custom Basis Mode */}
                  <div style={{
                    display: 'flex',
                    background: 'rgba(12, 19, 34, 0.7)',
                    padding: '0.2rem',
                    borderRadius: '0.6rem',
                    border: '1px solid var(--border-color)',
                    gap: '0.2rem'
                  }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${customBasis === 'per100g' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, fontSize: '0.78rem' }}
                      onClick={() => {
                        setCustomBasis('per100g');
                        setCustomServingSize('100g');
                      }}
                    >
                      ⚖️ 每 100 公克 (100g) 營養標示 (常用)
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${customBasis === 'perServing' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, fontSize: '0.78rem' }}
                      onClick={() => setCustomBasis('perServing')}
                    >
                      📦 自訂每份單位 (如 1 份/1罐)
                    </button>
                  </div>

                  <div className="grid-cols-2 grid-responsive-2 gap-3">
                    <div>
                      <label className="label">食物名稱</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="例如: 媽媽自製滷牛肉、某牌燕麥棒"
                        value={customName}
                        onChange={e => setCustomName(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="label">
                        {customBasis === 'per100g' ? '基準份量' : '份量單位名稱'}
                      </label>
                      <input
                        type="text"
                        className="input"
                        placeholder="例如: 100g 或 1包"
                        value={customServingSize}
                        disabled={customBasis === 'per100g'}
                        onChange={e => setCustomServingSize(e.target.value)}
                      />
                    </div>
                    {customBasis === 'perServing' && (
                      <div>
                        <label className="label">每份重量 (公克 g，便於日後秤重換算)</label>
                        <input
                          type="number"
                          className="input"
                          placeholder="例如: 45"
                          value={customBaseGrams}
                          onChange={e => setCustomBaseGrams(Number(e.target.value))}
                        />
                      </div>
                    )}
                  </div>

                  {/* 4 Macros Per 100g or Per Serving */}
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--neon-green)', marginBottom: '0.35rem' }}>
                      {customBasis === 'per100g' ? '輸入每 100 公克 (100g) 的熱量與三大元素：' : '輸入每份的熱量與三大元素：'}
                    </div>
                    <div className="grid-cols-4 grid-responsive-2 gap-3">
                      <div>
                        <label className="label">熱量 (kcal)</label>
                        <input
                          type="number"
                          className="input"
                          value={customCalories}
                          onChange={e => setCustomCalories(Number(e.target.value))}
                          required
                        />
                      </div>
                      <div>
                        <label className="label">蛋白質 (g)</label>
                        <input
                          type="number"
                          step="0.1"
                          className="input"
                          value={customProtein}
                          onChange={e => setCustomProtein(Number(e.target.value))}
                          required
                        />
                      </div>
                      <div>
                        <label className="label">碳水 (g)</label>
                        <input
                          type="number"
                          step="0.1"
                          className="input"
                          value={customCarbs}
                          onChange={e => setCustomCarbs(Number(e.target.value))}
                          required
                        />
                      </div>
                      <div>
                        <label className="label">脂肪 (g)</label>
                        <input
                          type="number"
                          step="0.1"
                          className="input"
                          value={customFat}
                          onChange={e => setCustomFat(Number(e.target.value))}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Per 1g breakdown banner */}
                  <div style={{
                    background: 'rgba(12, 19, 34, 0.6)',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.75rem',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-muted)'
                  }}>
                    💡 自動換算每 1g 含有：
                    <strong style={{ color: 'var(--text-main)' }}> {(customCalories / (customBasis === 'per100g' ? 100 : (customBaseGrams || 100))).toFixed(2)} kcal</strong> · 
                    蛋 <strong style={{ color: 'var(--neon-emerald)' }}>{(customProtein / (customBasis === 'per100g' ? 100 : (customBaseGrams || 100))).toFixed(2)}g</strong> · 
                    碳 <strong style={{ color: 'var(--neon-cyan)' }}>{(customCarbs / (customBasis === 'per100g' ? 100 : (customBaseGrams || 100))).toFixed(2)}g</strong> · 
                    脂 <strong style={{ color: 'var(--neon-amber)' }}>{(customFat / (customBasis === 'per100g' ? 100 : (customBaseGrams || 100))).toFixed(2)}g</strong>
                  </div>

                  {/* Immediate Intake in Grams */}
                  <div style={{
                    background: 'rgba(0, 245, 155, 0.06)',
                    border: '1px solid rgba(0, 245, 155, 0.25)',
                    padding: '0.75rem',
                    borderRadius: '0.65rem'
                  }}>
                    <div className="flex items-center justify-between">
                      <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                        本次吃下的實際重量 (公克 g):
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="3000"
                          className="input"
                          style={{ width: '100px', textAlign: 'center', fontWeight: 800, fontSize: '1rem', padding: '0.3rem' }}
                          value={customIntakeGrams}
                          onChange={e => setCustomIntakeGrams(Number(e.target.value))}
                        />
                        <span style={{ fontWeight: 600 }}>g</span>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--neon-green)', marginTop: '0.35rem', textAlign: 'right' }}>
                      將以 {customIntakeGrams}g 秤重比例精準記錄至今日餐點並永久保存進食物庫。
                    </div>
                  </div>
                </form>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>
                取消
              </button>
              {activeFoodTab === 'preset' ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!chosenFood}
                  onClick={handleAddChosenFood}
                >
                  確認加入餐點
                </button>
              ) : (
                <button type="submit" form="customFoodForm" className="btn btn-primary">
                  建立並加入
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
