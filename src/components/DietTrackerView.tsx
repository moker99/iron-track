import React, { useState, useMemo, useEffect } from 'react';
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
  X,
  Zap,
  AlertTriangle,
  BookOpen,
  Clock,
  RefreshCw,
  Check,
  Edit3,
} from 'lucide-react';
import type { CarbCyclingPhase, DietProtocol, FitnessGoal, FoodCategory, FoodItem, MealEntry, MealType, UserProfile, WeeklyTrainingHours } from '../types';
import { StorageService } from '../services/storage';
import { getUserNutritionTargets, TAN_KNOWLEDGE, THREE_MONTHS_TABLE, THREE_MONTHS_RULES } from '../utils/nutrition';
import { NumberInput } from './NumberInput';

interface DietTrackerViewProps {
  activeProfile: UserProfile;
  onOpenProfileEdit: () => void;
  onUpdateProfile?: (profile: UserProfile) => void;
}

const MEAL_TYPES: { type: MealType; label: string; icon: string; defaultTime: string }[] = [
  { type: 'breakfast', label: '早餐 (Breakfast)', icon: '🍳', defaultTime: '08:00' },
  { type: 'lunch', label: '午餐 (Lunch)', icon: '🍱', defaultTime: '12:30' },
  { type: 'dinner', label: '晚餐 (Dinner)', icon: '🥩', defaultTime: '18:30' },
  { type: 'snack', label: '點心 / 練後加餐 (Snacks & Post-workout)', icon: '🥤', defaultTime: '16:00' },
];

const CATEGORY_NAMES: Record<FoodCategory | 'all', string> = {
  all: '全部食材',
  staple: '主食碳水',
  fruit: '新鮮水果',
  meat: '肉類海鮮',
  egg_dairy: '蛋豆乳品',
  veggie: '蔬菜菇類',
  fat_nuts: '油脂堅果',
  supplement: '乳清補劑',
  beverage: '飲品沖泡',
  other: '其他點心',
};

export const DietTrackerView: React.FC<DietTrackerViewProps> = ({
  activeProfile,
  onOpenProfileEdit,
  onUpdateProfile,
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
  const [inputGrams, setInputGrams] = useState<number>(0);
  const [servingsMultiplier, setServingsMultiplier] = useState<number>(0);

  // Custom Food Form
  const [customName, setCustomName] = useState('');
  const [customBasis, setCustomBasis] = useState<'per100g' | 'perServing'>('per100g');
  const [customBaseGrams, setCustomBaseGrams] = useState<number>(0);
  const [customCalories, setCustomCalories] = useState<number>(0);
  const [customProtein, setCustomProtein] = useState<number>(0);
  const [customCarbs, setCustomCarbs] = useState<number>(0);
  const [customFat, setCustomFat] = useState<number>(0);
  const [customServingSize, setCustomServingSize] = useState('100g');
  const [customCategory, setCustomCategory] = useState<FoodCategory>('meat');
  const [customIntakeGrams, setCustomIntakeGrams] = useState<number>(0);

  // Edit Logged Meal Entry State
  const [editingMealEntry, setEditingMealEntry] = useState<MealEntry | null>(null);
  const [editFoodName, setEditFoodName] = useState('');
  const [editMealType, setEditMealType] = useState<MealType>('breakfast');
  const [editInputMode, setEditInputMode] = useState<'grams' | 'servings'>('grams');
  const [editWeightGrams, setEditWeightGrams] = useState<number>(100);
  const [editServings, setEditServings] = useState<number>(1);
  const [editServingUnit, setEditServingUnit] = useState('100g');
  const [editCalories, setEditCalories] = useState<number>(0);
  const [editProtein, setEditProtein] = useState<number>(0);
  const [editCarbs, setEditCarbs] = useState<number>(0);
  const [editFat, setEditFat] = useState<number>(0);
  const [editBaseFood, setEditBaseFood] = useState<FoodItem | null>(null);

  // Edit Custom Food in Library State
  const [editingCustomFood, setEditingCustomFood] = useState<FoodItem | null>(null);

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

  // 飲食計劃模式與當前進程狀態
  const [currentPhase, setCurrentPhase] = useState<CarbCyclingPhase>(activeProfile.carbCyclingPhase || 'baseline');
  const [currentSprintDay, setCurrentSprintDay] = useState<number>(activeProfile.sprintManualDay || 1);
  const [currentTrainingHours, setCurrentTrainingHours] = useState<WeeklyTrainingHours>(activeProfile.weeklyTrainingHours || '4-5');
  const [tanBaselineCarb, setTanBaselineCarb] = useState<number>(activeProfile.tanBaselineCarbRatio ?? 3.0);
  const [tanBaselineProtein, setTanBaselineProtein] = useState<number>(activeProfile.tanBaselineProteinRatio ?? 1.6);
  const [tanBaselineFat, setTanBaselineFat] = useState<number>(activeProfile.tanBaselineFatRatio ?? 0.7);
  const [isKnowledgeModalOpen, setIsKnowledgeModalOpen] = useState<boolean>(false);
  const [isSprintTableModalOpen, setIsSprintTableModalOpen] = useState<boolean>(false);
  const [isThreeMonthsModalOpen, setIsThreeMonthsModalOpen] = useState<boolean>(false);
  const [isProtocolModalOpen, setIsProtocolModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (activeProfile.carbCyclingPhase) setCurrentPhase(activeProfile.carbCyclingPhase);
    if (activeProfile.sprintManualDay) setCurrentSprintDay(activeProfile.sprintManualDay);
    if (activeProfile.weeklyTrainingHours) setCurrentTrainingHours(activeProfile.weeklyTrainingHours);
    if (activeProfile.tanBaselineCarbRatio !== undefined) setTanBaselineCarb(activeProfile.tanBaselineCarbRatio);
    if (activeProfile.tanBaselineProteinRatio !== undefined) setTanBaselineProtein(activeProfile.tanBaselineProteinRatio);
    if (activeProfile.tanBaselineFatRatio !== undefined) setTanBaselineFat(activeProfile.tanBaselineFatRatio);
  }, [activeProfile]);

  // 當使用者 Profile 或選擇日期變更時，即時更新當日飲食紀錄與食物庫
  useEffect(() => {
    setMealLogs(StorageService.getMealsByDate(activeProfile.id, selectedDate));
    setAllFoods(StorageService.getAllFoods());
  }, [activeProfile.id, selectedDate]);

  const handleProtocolChange = (newProtocol: DietProtocol) => {
    let newGoal = activeProfile.goal;
    // 若切換到減脂方案，但先前目標為增肌，貼心同步為減脂；若切換到譚成義且先前為減脂，貼心同步為增肌
    if ((newProtocol === 'dynamic_3months' || newProtocol === 'sprint_40d') && activeProfile.goal === 'gain_muscle') {
      newGoal = 'lose_fat';
    } else if (newProtocol === 'tan_carb_cycling' && activeProfile.goal === 'lose_fat') {
      newGoal = 'gain_muscle';
    }
    const updated: UserProfile = { ...activeProfile, dietProtocol: newProtocol, goal: newGoal };
    StorageService.saveProfile(updated);
    onUpdateProfile?.(updated);
    setIsProtocolModalOpen(false);
  };

  const handleGoalChange = (newGoal: FitnessGoal) => {
    const updated: UserProfile = { ...activeProfile, goal: newGoal };
    StorageService.saveProfile(updated);
    onUpdateProfile?.(updated);
  };

  const handlePhaseChange = (newPhase: CarbCyclingPhase) => {
    setCurrentPhase(newPhase);
    const updated: UserProfile = { ...activeProfile, carbCyclingPhase: newPhase };
    StorageService.saveProfile(updated);
    onUpdateProfile?.(updated);
  };

  const handleSprintDayChange = (delta: number) => {
    const next = Math.min(40, Math.max(1, currentSprintDay + delta));
    setCurrentSprintDay(next);
    const updated: UserProfile = { ...activeProfile, sprintManualDay: next };
    StorageService.saveProfile(updated);
    onUpdateProfile?.(updated);
  };

  const handleTrainingHoursChange = (hours: WeeklyTrainingHours) => {
    setCurrentTrainingHours(hours);
    const updated: UserProfile = { ...activeProfile, weeklyTrainingHours: hours };
    StorageService.saveProfile(updated);
    onUpdateProfile?.(updated);
  };

  const handleTanRatiosChange = (c: number, p: number, f: number) => {
    setTanBaselineCarb(c);
    setTanBaselineProtein(p);
    setTanBaselineFat(f);
    const updated: UserProfile = {
      ...activeProfile,
      tanBaselineCarbRatio: c,
      tanBaselineProteinRatio: p,
      tanBaselineFatRatio: f,
    };
    StorageService.saveProfile(updated);
    onUpdateProfile?.(updated);
  };

  // 當日訓練消耗
  const dayWorkouts = useMemo(() => {
    return StorageService.getWorkoutSessions(activeProfile.id).filter(w => w.date === selectedDate);
  }, [activeProfile.id, selectedDate]);

  const dayWorkoutBurn = useMemo(() => {
    return dayWorkouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);
  }, [dayWorkouts]);

  // 依據當前方案與天數計算今日營養素目標
  const targets = useMemo(() => {
    return getUserNutritionTargets(activeProfile, {
      currentDate: selectedDate,
      overridePhase: currentPhase,
      overrideSprintDay: currentSprintDay,
      overrideWeeklyTrainingHours: currentTrainingHours,
      overrideTanRatios: {
        carbRatio: tanBaselineCarb,
        proteinRatio: tanBaselineProtein,
        fatRatio: tanBaselineFat,
      },
    });
  }, [activeProfile, selectedDate, currentPhase, currentSprintDay, currentTrainingHours, tanBaselineCarb, tanBaselineProtein, tanBaselineFat]);

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
      category: customCategory,
      isCustom: true,
    };

    StorageService.addCustomFood(newFood);
    setAllFoods(StorageService.getAllFoods());

    // 同步新增到今日餐點 (當本次吃下克數大於 0 時才寫入今日餐點)
    if (customIntakeGrams > 0) {
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
    }

    // 重設自訂食物表單輸入項
    setCustomName('');
    setCustomCategory('meat');
    setCustomCalories(0);
    setCustomProtein(0);
    setCustomCarbs(0);
    setCustomFat(0);
    setCustomIntakeGrams(0);
    setIsAddModalOpen(false);
  };

  const handleDeleteMeal = (id: string) => {
    StorageService.deleteMealEntry(id);
    refreshMealLogs(selectedDate);
  };

  const handleOpenEditModal = (entry: MealEntry) => {
    setEditingMealEntry(entry);
    setEditFoodName(entry.foodName);
    setEditMealType(entry.mealType);
    const mode = entry.inputMode || (entry.weightGrams ? 'grams' : 'servings');
    setEditInputMode(mode);
    setEditWeightGrams(entry.weightGrams || 100);
    setEditServings(entry.servings || 1);
    setEditServingUnit(entry.servingUnit || '100g');
    setEditCalories(entry.calories);
    setEditProtein(entry.protein);
    setEditCarbs(entry.carbs);
    setEditFat(entry.fat);

    // 匹配原始食材庫資料，以便在修改克數時自動換算三大元素
    const matched = allFoods.find(
      f => f.name.trim() === entry.foodName.trim() ||
           entry.foodName.startsWith(f.name.split(' ')[0]) ||
           f.name.startsWith(entry.foodName.split(' ')[0])
    );
    setEditBaseFood(matched || null);
  };

  const handleEditGramsChange = (newGrams: number) => {
    setEditWeightGrams(newGrams);
    if (newGrams <= 0) return;
    if (editBaseFood) {
      const base = editBaseFood.baseWeightGrams || 100;
      const factor = newGrams / base;
      setEditCalories(Math.round(editBaseFood.calories * factor));
      setEditProtein(Math.round(editBaseFood.protein * factor * 10) / 10);
      setEditCarbs(Math.round(editBaseFood.carbs * factor * 10) / 10);
      setEditFat(Math.round(editBaseFood.fat * factor * 10) / 10);
    } else if (editingMealEntry?.weightGrams && editingMealEntry.weightGrams > 0) {
      const factor = newGrams / editingMealEntry.weightGrams;
      setEditCalories(Math.round(editingMealEntry.calories * factor));
      setEditProtein(Math.round(editingMealEntry.protein * factor * 10) / 10);
      setEditCarbs(Math.round(editingMealEntry.carbs * factor * 10) / 10);
      setEditFat(Math.round(editingMealEntry.fat * factor * 10) / 10);
    }
  };

  const handleEditServingsChange = (newServings: number) => {
    setEditServings(newServings);
    if (newServings <= 0) return;
    if (editBaseFood) {
      setEditCalories(Math.round(editBaseFood.calories * newServings));
      setEditProtein(Math.round(editBaseFood.protein * newServings * 10) / 10);
      setEditCarbs(Math.round(editBaseFood.carbs * newServings * 10) / 10);
      setEditFat(Math.round(editBaseFood.fat * newServings * 10) / 10);
      if (editBaseFood.baseWeightGrams) {
        setEditWeightGrams(Math.round(editBaseFood.baseWeightGrams * newServings));
      }
    } else if (editingMealEntry?.servings && editingMealEntry.servings > 0) {
      const factor = newServings / editingMealEntry.servings;
      setEditCalories(Math.round(editingMealEntry.calories * factor));
      setEditProtein(Math.round(editingMealEntry.protein * factor * 10) / 10);
      setEditCarbs(Math.round(editingMealEntry.carbs * factor * 10) / 10);
      setEditFat(Math.round(editingMealEntry.fat * factor * 10) / 10);
    }
  };

  const handleSaveEditedMeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMealEntry) return;

    const baseWeight = editBaseFood?.baseWeightGrams || 100;
    const computedServings = editInputMode === 'grams'
      ? Math.round((editWeightGrams / baseWeight) * 100) / 100
      : Number(editServings);

    const updated: MealEntry = {
      ...editingMealEntry,
      foodName: editFoodName.trim() || editingMealEntry.foodName,
      mealType: editMealType,
      inputMode: editInputMode,
      weightGrams: editInputMode === 'grams' ? Number(editWeightGrams) : (editWeightGrams || undefined),
      servings: computedServings,
      servingUnit: editInputMode === 'grams' ? `${editWeightGrams}g` : (editServingUnit || '份'),
      calories: Number(editCalories),
      protein: Number(editProtein),
      carbs: Number(editCarbs),
      fat: Number(editFat),
    };

    StorageService.updateMealEntry(updated);
    refreshMealLogs(selectedDate);
    setEditingMealEntry(null);
  };

  // 開啟自訂食材編輯
  const handleOpenEditCustomFood = (food: FoodItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCustomFood(food);
    setCustomName(food.name);
    setCustomCategory(food.category);
    setCustomCalories(food.calories);
    setCustomProtein(food.protein);
    setCustomCarbs(food.carbs);
    setCustomFat(food.fat);
    setCustomServingSize(food.servingSize);
    setCustomBaseGrams(food.baseWeightGrams || 100);
    setCustomBasis(food.servingSize === '100g' ? 'per100g' : 'perServing');
    setCustomIntakeGrams(0);
    setActiveFoodTab('custom');
  };

  const handleSaveCustomFoodEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomFood || !customName.trim()) return;

    const baseGrams = customBasis === 'per100g' ? 100 : Number(customBaseGrams || 100);
    const servingDesc = customBasis === 'per100g' ? '100g' : (customServingSize.trim() || '1份');

    const updatedFood: FoodItem = {
      ...editingCustomFood,
      name: customName.trim(),
      calories: Number(customCalories),
      protein: Number(customProtein),
      carbs: Number(customCarbs),
      fat: Number(customFat),
      servingSize: servingDesc,
      baseWeightGrams: baseGrams,
      category: customCategory,
      isCustom: true,
    };

    StorageService.updateCustomFood(updatedFood);
    setAllFoods(StorageService.getAllFoods());
    setEditingCustomFood(null);

    // 重設表單輸入項
    setCustomName('');
    setCustomCategory('meat');
    setCustomCalories(0);
    setCustomProtein(0);
    setCustomCarbs(0);
    setCustomFat(0);
    setCustomIntakeGrams(0);
    setActiveFoodTab('preset');
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Date Switcher & Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-header-title" style={{ fontSize: '1.75rem', fontWeight: 800 }}>飲食與三大營養素追蹤</h1>
          <p className="page-header-desc" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
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

      {/* ==================== 體態與飲食方案專屬控制看板 ==================== */}
      {/* 方案 A: 40 天固定衝刺階段表 */}
      {targets.protocol === 'sprint_40d' && targets.sprintInfo && (
        <div className="glass-card" style={{
          background: targets.sprintInfo.isHighCarb ? 'rgba(244, 63, 94, 0.08)' : 'rgba(18, 26, 43, 0.85)',
          border: `1px solid ${targets.sprintInfo.isHighCarb ? 'var(--neon-rose)' : 'rgba(244, 63, 94, 0.3)'}`,
          boxShadow: targets.sprintInfo.isHighCarb ? '0 0 25px rgba(244, 63, 94, 0.2)' : 'none',
        }}>
          <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginBottom: '0.75rem' }}>
            <div className="flex items-center gap-2">
              <Zap size={20} style={{ color: 'var(--neon-rose)' }} />
              <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                ⚡ 40 天固定衝刺階段表
              </span>
              <span className={`badge ${targets.sprintInfo.isHighCarb ? 'badge-rose' : 'badge-green'}`} style={{ fontSize: '0.75rem' }}>
                {targets.sprintInfo.stageName}
              </span>
            </div>

            <div className="mobile-action-bar flex items-center gap-2">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setIsProtocolModalOpen(true)}
              >
                🔄 切換方案
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsSprintTableModalOpen(true)}
              >
                📋 40天總表
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsKnowledgeModalOpen(true)}
              >
                💡 執行守則
              </button>
            </div>
          </div>

          {/* Progress Bar & Day Stepper */}
          <div style={{ marginBottom: '0.75rem' }}>
            <div className="flex items-center justify-between" style={{ fontSize: '0.85rem', marginBottom: '0.35rem' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                衝刺進度：第 <strong style={{ color: 'var(--neon-rose)', fontSize: '1.15rem' }}>{targets.sprintInfo.day}</strong> / 40 天
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="btn btn-secondary btn-icon btn-sm"
                  style={{ width: '28px', height: '28px' }}
                  disabled={targets.sprintInfo.day <= 1}
                  onClick={() => handleSprintDayChange(-1)}
                  title="切換至前一天"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-icon btn-sm"
                  style={{ width: '28px', height: '28px' }}
                  disabled={targets.sprintInfo.day >= 40}
                  onClick={() => handleSprintDayChange(1)}
                  title="切換至後一天"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
            <div className="progress-bar-bg" style={{ height: '8px' }}>
              <div
                className="progress-bar-fill"
                style={{
                  width: `${Math.round((targets.sprintInfo.day / 40) * 100)}%`,
                  background: 'linear-gradient(90deg, #f43f5e, #fb7185)',
                }}
              />
            </div>

            {/* 快速直達關鍵天數 */}
            <div className="flex items-center gap-1.5" style={{ marginTop: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>快捷跳轉：</span>
              {[1, 12, 24, 36, 40].map(d => (
                <button
                  key={d}
                  type="button"
                  className={`btn btn-xs ${targets.sprintInfo.day === d ? 'btn-primary' : 'btn-secondary'}`}
                  style={{
                    fontSize: '0.72rem',
                    padding: '0.2rem 0.5rem',
                    borderColor: (d === 12 || d === 24 || d === 36) ? 'var(--neon-rose)' : undefined,
                  }}
                  onClick={() => {
                    setCurrentSprintDay(d);
                    const updated: UserProfile = { ...activeProfile, sprintManualDay: d };
                    StorageService.saveProfile(updated);
                    onUpdateProfile?.(updated);
                  }}
                >
                  {d === 12 || d === 24 || d === 36 ? `🔥 Day ${d} 充碳` : `Day ${d}`}
                </button>
              ))}
            </div>
          </div>

          {/* High Carb Alert or Stage Info */}
          {targets.sprintInfo.isHighCarb ? (
            <div style={{
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid var(--neon-rose)',
              padding: '0.75rem 1rem',
              borderRadius: '0.65rem',
              color: '#ff8599',
              fontSize: '0.85rem',
              lineHeight: 1.5,
            }}>
              🔥 <strong>今日為第 {targets.sprintInfo.day} 天【高碳充碳日 (Refeed Day)】</strong>！<br />
              今日目標：碳水 <strong>{targets.sprintInfo.carbRatio} g/kg ({targets.targetCarbs}g)</strong> · 蛋白 <strong>{targets.sprintInfo.proteinRatio} g/kg ({targets.targetProtein}g)</strong> · 脂肪 <strong>{targets.sprintInfo.fatRatio} g/kg ({targets.targetFat}g)</strong>。<br />
              <span style={{ fontSize: '0.78rem', color: '#ffb3c0' }}>
                ⚠️ 注意：高碳日只是宏量目標變化，不是隨便吃的放縱日！嚴格秤重記錄克數，避免高油脂食物，喚醒瘦素與甲狀腺代謝。
              </span>
            </div>
          ) : (
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              padding: '0.65rem 0.85rem',
              borderRadius: '0.65rem',
              fontSize: '0.82rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}>
              <span style={{ color: 'var(--text-muted)' }}>
                階段重點：<strong>{targets.sprintInfo.stageRange}</strong> · 係數：碳水 {targets.sprintInfo.carbRatio} · 蛋白 {targets.sprintInfo.proteinRatio} · 脂肪 {targets.sprintInfo.fatRatio} g/kg ({activeProfile.gender === 'male' ? '男性係數' : '女性係數'})。
              </span>
              <span style={{ color: 'var(--neon-rose)', fontWeight: 600 }}>
                {targets.sprintInfo.day < 12 ? `距離第 12 天高碳日還有 ${12 - targets.sprintInfo.day} 天` : targets.sprintInfo.day < 24 ? `距離第 24 天高碳日還有 ${24 - targets.sprintInfo.day} 天` : targets.sprintInfo.day < 36 ? `距離第 36 天高碳日還有 ${36 - targets.sprintInfo.day} 天` : '最後衝刺收尾期'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 方案 B: 譚成義 · 焚訣動態碳水循環 */}
      {targets.protocol === 'tan_carb_cycling' && targets.carbCyclingInfo && (
        <div className="glass-card" style={{
          background: currentPhase === 'high_carb' ? 'rgba(0, 245, 155, 0.08)' : currentPhase === 'low_carb' ? 'rgba(168, 85, 247, 0.08)' : 'rgba(18, 26, 43, 0.85)',
          border: `1px solid ${currentPhase === 'high_carb' ? 'var(--neon-green)' : currentPhase === 'low_carb' ? 'var(--neon-purple)' : 'var(--border-color)'}`,
        }}>
          <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginBottom: '0.75rem' }}>
            <div className="flex items-center gap-2">
              <Flame size={20} style={{ color: 'var(--neon-green)' }} />
              <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                🍚 焚訣動態碳水循環
              </span>
              <span className="badge badge-green" style={{ fontSize: '0.75rem' }}>
                {targets.carbCyclingInfo.phaseLabel}
              </span>
            </div>

            <div className="mobile-action-bar flex items-center gap-2">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setIsProtocolModalOpen(true)}
              >
                🔄 切換方案
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsKnowledgeModalOpen(true)}
              >
                💡 核心心法
              </button>
            </div>
          </div>

          {/* 3-Way Mode Switcher Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.65rem' }}>
            <button
              type="button"
              className={`btn btn-sm ${currentPhase === 'baseline' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ justifyContent: 'center', padding: '0.55rem' }}
              onClick={() => handlePhaseChange('baseline')}
            >
              🍚 基準平衡日 ({tanBaselineCarb}g/kg)
            </button>
            <button
              type="button"
              className={`btn btn-sm ${currentPhase === 'high_carb' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ justifyContent: 'center', padding: '0.55rem' }}
              onClick={() => handlePhaseChange('high_carb')}
            >
              🚀 提高碳水 (+0.5 ➔ {(tanBaselineCarb + 0.5).toFixed(1)}g/kg)
            </button>
            <button
              type="button"
              className={`btn btn-sm ${currentPhase === 'low_carb' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ justifyContent: 'center', padding: '0.55rem' }}
              onClick={() => handlePhaseChange('low_carb')}
            >
              🛡️ 降低碳水 (-0.5 ➔ {Math.max(1.5, tanBaselineCarb - 0.5).toFixed(1)}g/kg)
            </button>
          </div>

          {/* 個體化動態基準輸入面板 */}
          <div style={{
            marginBottom: '0.75rem',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(0, 245, 155, 0.25)',
            borderRadius: '0.65rem',
            padding: '0.75rem 0.85rem',
          }}>
            <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.35rem' }}>
              <div className="flex items-center gap-1.5">
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--neon-green)' }}>
                  ⚙️ 焚訣個體化動態基準 (依身體感受手動微調)
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  (體重 {activeProfile.weightKg}kg 即時試算)
                </span>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}
                onClick={() => handleTanRatiosChange(3.0, 1.6, 0.7)}
              >
                恢復建議預設 (3.0 / 1.6 / 0.7)
              </button>
            </div>

            <div className="grid-cols-3 grid-responsive-1 gap-3">
              <div>
                <label className="label" style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ color: 'var(--neon-cyan)', fontWeight: 700 }}>碳水基準 (g/kg)</span>
                  <span style={{ color: 'var(--text-muted)' }}>建議 2.5 ~ 3.5</span>
                </label>
                <NumberInput
                  value={tanBaselineCarb}
                  step={0.1}
                  min={1.5}
                  max={6.0}
                  onChange={val => handleTanRatiosChange(val || 3.0, tanBaselineProtein, tanBaselineFat)}
                />
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
                  ≈ <strong>{Math.round(activeProfile.weightKg * tanBaselineCarb)}g</strong> · 吃不下勿硬塞
                </div>
              </div>

              <div>
                <label className="label" style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ color: 'var(--neon-emerald)', fontWeight: 700 }}>蛋白質基準 (g/kg)</span>
                  <span style={{ color: 'var(--text-muted)' }}>建議 1.2 ~ 2.0</span>
                </label>
                <NumberInput
                  value={tanBaselineProtein}
                  step={0.1}
                  min={0.8}
                  max={3.0}
                  onChange={val => handleTanRatiosChange(tanBaselineCarb, val || 1.6, tanBaselineFat)}
                />
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
                  ≈ <strong>{Math.round(activeProfile.weightKg * tanBaselineProtein)}g</strong> · 放屁多臭則減少
                </div>
              </div>

              <div>
                <label className="label" style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ color: 'var(--neon-amber)', fontWeight: 700 }}>健康脂肪基準 (g/kg)</span>
                  <span style={{ color: 'var(--text-muted)' }}>建議 0.6 ~ 0.8</span>
                </label>
                <NumberInput
                  value={tanBaselineFat}
                  step={0.1}
                  min={0.3}
                  max={2.0}
                  onChange={val => handleTanRatiosChange(tanBaselineCarb, tanBaselineProtein, val || 0.7)}
                />
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
                  ≈ <strong>{Math.round(activeProfile.weightKg * tanBaselineFat)}g</strong> · 以優質 Omega-3+6 為主
                </div>
              </div>
            </div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '0.65rem 0.85rem',
            borderRadius: '0.65rem',
            fontSize: '0.82rem',
            lineHeight: 1.5,
            color: 'var(--text-muted)'
          }}>
            <p><strong>💡 狀態指引</strong>：{targets.carbCyclingInfo.mindsetAdvice}</p>
            <p style={{ marginTop: '0.2rem', color: 'var(--neon-green)' }}>
              <strong>🏃 有氧搭配</strong>：{targets.carbCyclingInfo.cardioAdvice}
            </p>
          </div>
        </div>
      )}

      {/* 方案 C: 三個月動態減脂方案 (以每週運動時數計算) */}
      {targets.protocol === 'dynamic_3months' && targets.threeMonthsInfo && (
        <div className="glass-card" style={{
          background: 'rgba(168, 85, 247, 0.08)',
          border: '1px solid rgba(168, 85, 247, 0.35)',
        }}>
          <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginBottom: '0.75rem' }}>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Clock size={20} style={{ color: 'var(--neon-purple)' }} />
                <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                  📅 三個月動態減脂方案
                </span>
              </div>
              <span className="badge badge-purple">
                {targets.threeMonthsInfo.gender === 'female' ? '女性專屬係數' : '男性專屬係數'}
              </span>
            </div>

            <div className="flex items-center gap-2 mobile-action-bar">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setIsProtocolModalOpen(true)}
              >
                🔄 切換方案
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsThreeMonthsModalOpen(true)}
              >
                📊 男女對照表
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsKnowledgeModalOpen(true)}
              >
                💡 執行心法
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
              當前每週訓練/運動時數 (點擊即時切換試算)：
            </div>
            <div className="training-hours-grid">
              {(['2-3', '4-5', '6-7', '8-9'] as WeeklyTrainingHours[]).map(hrs => (
                <button
                  key={hrs}
                  type="button"
                  className={`btn btn-sm ${currentTrainingHours === hrs ? 'btn-primary' : 'btn-secondary'}`}
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    borderColor: currentTrainingHours === hrs ? 'var(--neon-purple)' : undefined,
                    boxShadow: currentTrainingHours === hrs ? '0 0 10px rgba(168, 85, 247, 0.4)' : undefined,
                  }}
                  onClick={() => handleTrainingHoursChange(hrs)}
                >
                  ⏱️ {hrs} 小時 {hrs === '4-5' ? '(推薦)' : ''}
                </button>
              ))}
            </div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '0.65rem 0.85rem',
            borderRadius: '0.65rem',
            fontSize: '0.82rem',
            color: 'var(--text-muted)'
          }}>
            <p>
              <strong style={{ color: 'var(--neon-purple)' }}>係數配比</strong>：
              碳水 <strong style={{ color: 'var(--text-main)' }}>{targets.threeMonthsInfo.carbRatio}</strong> g/kg ·
              蛋白質 <strong style={{ color: 'var(--text-main)' }}>{targets.threeMonthsInfo.proteinRatio}</strong> g/kg ·
              脂肪 <strong style={{ color: 'var(--text-main)' }}>{targets.threeMonthsInfo.fatRatio}</strong> g/kg
            </p>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
              執行 7–10 天後依體態回饋微調，勿因單日體重波動改方案
            </p>
          </div>
        </div>
      )}

      {/* 方案 D: 傳統標準均衡模式 */}
      {(!targets.protocol || targets.protocol === 'standard') && (
        <div className="glass-card" style={{
          background: 'rgba(6, 182, 212, 0.08)',
          border: '1px solid rgba(6, 182, 212, 0.35)',
        }}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span style={{ fontSize: '1.25rem' }}>⚖️</span>
              <div>
                <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                  傳統標準均衡模式 (TDEE 赤字 / 盈餘計算)
                </span>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  當前健身目標：{activeProfile.goal === 'gain_muscle' ? '增肌 (+250 kcal)' : activeProfile.goal === 'lose_fat' ? '減脂 (-300 kcal)' : '維持平衡'} · 點擊右側可切換至譚成義增肌、40天衝刺或3個月動態版
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mobile-action-bar">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setIsProtocolModalOpen(true)}
              >
                🔄 切換方案
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={onOpenProfileEdit}
              >
                ⚙️ 個人設定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Macros & Calorie Summary Card */}
      <div className="glass-card glow-green">
        <div className="flex items-center justify-between flex-wrap gap-3" style={{ marginBottom: '1.25rem' }}>
          <div className="flex items-center gap-2">
            <Flame size={22} style={{ color: 'var(--neon-green)' }} />
            <div>
              <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>今日熱量預算與三大元素分配</span>
              <button
                type="button"
                onClick={() => setIsProtocolModalOpen(true)}
                title="點擊切換目標與方案"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  marginLeft: '0.5rem',
                }}
              >
                <span
                  className={`badge ${activeProfile.goal === 'gain_muscle' ? 'badge-green' : activeProfile.goal === 'lose_fat' ? 'badge-rose' : 'badge-cyan'}`}
                  style={{ fontSize: '0.75rem', cursor: 'pointer' }}
                >
                  目標: {activeProfile.goal === 'gain_muscle' ? '💪 增肌' : activeProfile.goal === 'lose_fat' ? '🔥 減脂' : '⚖️ 維持'} (點擊調整)
                </span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 mobile-action-bar">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setIsProtocolModalOpen(true)}
            >
              <RefreshCw size={14} />
              <span>切換方案</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onOpenProfileEdit}
            >
              <Sparkles size={14} style={{ color: 'var(--neon-cyan)' }} />
              <span>體態設定 (BMR/TDEE)</span>
            </button>
          </div>
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
        <div className="grid-cols-4 mobile-grid-2 gap-3" style={{ marginBottom: '1.5rem' }}>
          <div style={{ background: 'rgba(12, 19, 34, 0.6)', padding: '0.85rem', borderRadius: '0.85rem', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>基準目標熱量 (Target)</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--text-main)', margin: '0.2rem 0' }}>
              {targets.targetCalories} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>kcal</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
              {totals.workoutBurn > 0 ? `TDEE ${targets.tdee} + 運動 ${totals.workoutBurn}k` : `BMR ${targets.bmr} · TDEE ${targets.tdee}`}
            </div>
          </div>

          <div style={{ background: 'rgba(12, 19, 34, 0.6)', padding: '0.85rem', borderRadius: '0.85rem', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>已攝取熱量 (Consumed)</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 900, color: totals.calories > totals.dynamicTarget ? 'var(--neon-rose)' : 'var(--neon-green)', margin: '0.2rem 0' }}>
              {totals.calories} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>kcal</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
              佔動態預算 {Math.round((totals.calories / totals.dynamicTarget) * 100)}%
            </div>
          </div>

          <div style={{ background: 'rgba(12, 19, 34, 0.6)', padding: '0.85rem', borderRadius: '0.85rem', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>剩餘可用熱量 (Remaining)</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 900, color: totals.remainingCalories < 0 ? 'var(--neon-rose)' : 'var(--neon-cyan)', margin: '0.2rem 0' }}>
              {totals.remainingCalories} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>kcal</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
              {totals.workoutBurn > 0 ? `含運動 +${totals.workoutBurn}k 加成` : (totals.remainingCalories >= 0 ? '仍在熱量預算範圍內' : '已超出預算赤字')}
            </div>
          </div>

          <div style={{ background: 'rgba(12, 19, 34, 0.6)', padding: '0.85rem', borderRadius: '0.85rem', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>三大元素能量驗證</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--neon-amber)', margin: '0.2rem 0' }}>
              {totals.formulaVerifiedCalories} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>kcal</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
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

                      <div className="flex items-center gap-2">
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', marginRight: '0.15rem' }}>
                          {item.calories} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>kcal</span>
                        </span>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          title="編輯份量或營養素"
                          onClick={() => handleOpenEditModal(item)}
                          style={{ color: 'var(--neon-cyan)', background: 'rgba(0, 229, 255, 0.08)' }}
                        >
                          <Edit3 size={14} />
                        </button>
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
                          <div style={{ fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <span>{food.name}</span>
                            <span className="badge badge-gray" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                              {CATEGORY_NAMES[food.category] || food.category}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                            每 {food.servingSize}: 蛋 {food.protein}g · 碳 {food.carbs}g · 脂 {food.fat}g
                            {food.baseWeightGrams && (
                              <span style={{ color: 'var(--neon-green)', marginLeft: '0.4rem' }}>
                                (每100g: {Math.round((food.calories / food.baseWeightGrams) * 100)} kcal)
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--neon-green)' }}>
                            {food.calories} kcal
                          </div>
                          {food.isCustom && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-icon btn-sm"
                              title="編輯此自訂食材"
                              style={{ padding: '0.2rem 0.35rem', color: 'var(--neon-cyan)', background: 'rgba(0, 229, 255, 0.08)' }}
                              onClick={(e) => handleOpenEditCustomFood(food, e)}
                            >
                              <Edit3 size={13} />
                            </button>
                          )}
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
                                <NumberInput
                                  min={0}
                                  max={3000}
                                  className="input"
                                  style={{ width: '110px', textAlign: 'center', fontWeight: 800, fontSize: '1.1rem', padding: '0.35rem' }}
                                  value={inputGrams}
                                  placeholder="0"
                                  onChange={setInputGrams}
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
                              <NumberInput
                                step="0.1"
                                min={0}
                                max={20}
                                className="input"
                                style={{ width: '90px', textAlign: 'center', fontWeight: 800, fontSize: '1.1rem', padding: '0.35rem' }}
                                value={servingsMultiplier}
                                placeholder="0"
                                onChange={setServingsMultiplier}
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
                <form id="customFoodForm" onSubmit={editingCustomFood ? handleSaveCustomFoodEdit : handleAddCustomFood} className="flex flex-col gap-3">
                  {editingCustomFood && (
                    <div style={{
                      background: 'rgba(0, 229, 255, 0.08)',
                      border: '1px solid rgba(0, 229, 255, 0.3)',
                      borderRadius: '0.65rem',
                      padding: '0.6rem 0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.82rem',
                    }}>
                      <div className="flex items-center gap-2">
                        <Edit3 size={15} style={{ color: 'var(--neon-cyan)' }} />
                        <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                          正在編輯自訂食材：{editingCustomFood.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}
                        onClick={() => {
                          setEditingCustomFood(null);
                          setCustomName('');
                          setCustomCalories(0);
                          setCustomProtein(0);
                          setCustomCarbs(0);
                          setCustomFat(0);
                          setCustomIntakeGrams(0);
                        }}
                      >
                        取消編輯
                      </button>
                    </div>
                  )}

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
                        placeholder="例如: 富士蘋果、香蕉、煎牛排"
                        value={customName}
                        onChange={e => setCustomName(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="label">食材分類</label>
                      <select
                        className="select"
                        value={customCategory}
                        onChange={e => setCustomCategory(e.target.value as FoodCategory)}
                        style={{ width: '100%' }}
                      >
                        <option value="staple">🍚 全穀雜糧 / 主食碳水</option>
                        <option value="fruit">🍎 新鮮水果 (香蕉/蘋果/芭樂等)</option>
                        <option value="meat">🥩 肉類 / 海鮮魚貝</option>
                        <option value="egg_dairy">🥚 蛋品豆類 / 乳製品</option>
                        <option value="veggie">🥦 蔬菜 / 菇類高纖</option>
                        <option value="fat_nuts">🥑 健康油脂 / 堅果種子</option>
                        <option value="supplement">🥤 乳清蛋白 / 運動補劑</option>
                        <option value="beverage">☕ 飲品 / 咖啡沖泡</option>
                        <option value="other">📦 其他 / 複合點心</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">
                        {customBasis === 'per100g' ? '基準份量' : '份量單位名稱'}
                      </label>
                      <input
                        type="text"
                        className="input"
                        placeholder="例如: 100g 或 1包/1顆"
                        value={customServingSize}
                        disabled={customBasis === 'per100g'}
                        onChange={e => setCustomServingSize(e.target.value)}
                      />
                    </div>
                    {customBasis === 'perServing' && (
                      <div>
                        <label className="label">每份重量 (公克 g，便於日後秤重換算)</label>
                        <NumberInput
                          className="input"
                          placeholder="0"
                          min={0}
                          value={customBaseGrams}
                          onChange={setCustomBaseGrams}
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
                        <NumberInput
                          className="input"
                          value={customCalories}
                          min={0}
                          placeholder="0"
                          onChange={setCustomCalories}
                        />
                      </div>
                      <div>
                        <label className="label">蛋白質 (g)</label>
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
                        <label className="label">碳水 (g)</label>
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
                        <label className="label">脂肪 (g)</label>
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
                        <NumberInput
                          min={0}
                          max={3000}
                          className="input"
                          style={{ width: '100px', textAlign: 'center', fontWeight: 800, fontSize: '1rem', padding: '0.3rem' }}
                          value={customIntakeGrams}
                          placeholder="0"
                          onChange={setCustomIntakeGrams}
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
                  {editingCustomFood ? '儲存自訂食材修改' : '建立並加入'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: 編輯已記錄餐點食物 ==================== */}
      {editingMealEntry && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <Edit3 size={18} style={{ color: 'var(--neon-cyan)' }} />
                <h3 className="modal-title">編輯餐點記錄</h3>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setEditingMealEntry(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditedMeal} className="modal-body flex flex-col gap-4">
              {/* 食物名稱與所屬餐別 */}
              <div className="flex flex-col gap-3">
                <div>
                  <label className="label">食物名稱</label>
                  <input
                    type="text"
                    className="input"
                    value={editFoodName}
                    onChange={e => setEditFoodName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="label">所屬餐別</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
                    {MEAL_TYPES.map(m => (
                      <button
                        key={m.type}
                        type="button"
                        className={`btn btn-sm ${editMealType === m.type ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ fontSize: '0.78rem', padding: '0.4rem 0.2rem' }}
                        onClick={() => setEditMealType(m.type)}
                      >
                        {m.icon} {m.label.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 份量計算與輸入模式切換 */}
              <div style={{
                background: 'rgba(0, 229, 255, 0.05)',
                border: '1px solid rgba(0, 229, 255, 0.2)',
                borderRadius: '0.75rem',
                padding: '0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    份量調整
                  </span>
                  <div style={{
                    display: 'flex',
                    background: 'rgba(12, 19, 34, 0.7)',
                    padding: '0.15rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border-color)',
                    gap: '0.2rem'
                  }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${editInputMode === 'grams' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                      onClick={() => setEditInputMode('grams')}
                    >
                      ⚖️ 依公克 (g) 秤重
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${editInputMode === 'servings' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                      onClick={() => setEditInputMode('servings')}
                    >
                      📦 依份數輸入
                    </button>
                  </div>
                </div>

                {editInputMode === 'grams' ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>實際吃下重量：</label>
                      <div className="flex items-center gap-2">
                        <NumberInput
                          step="1"
                          min={1}
                          max={5000}
                          className="input"
                          style={{ width: '100px', textAlign: 'center', fontWeight: 800, fontSize: '1.1rem', padding: '0.35rem' }}
                          value={editWeightGrams}
                          placeholder="0"
                          onChange={handleEditGramsChange}
                        />
                        <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>g</span>
                      </div>
                    </div>

                    {/* Quick Grams Chips */}
                    <div className="flex gap-1.5 flex-wrap items-center">
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>微調:</span>
                      {[-50, -10, 10, 50].map(delta => (
                        <button
                          key={delta}
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem' }}
                          onClick={() => handleEditGramsChange(Math.max(1, editWeightGrams + delta))}
                        >
                          {delta > 0 ? `+${delta}g` : `${delta}g`}
                        </button>
                      ))}
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginLeft: '0.25rem' }}>設定:</span>
                      {[50, 100, 150, 200, 300].map(grams => (
                        <button
                          key={grams}
                          type="button"
                          className={`btn btn-sm ${editWeightGrams === grams ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem' }}
                          onClick={() => handleEditGramsChange(grams)}
                        >
                          {grams}g
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        份量倍數 ({editServingUnit || '份'}):
                      </label>
                      <div className="flex items-center gap-2">
                        <NumberInput
                          step="0.1"
                          min={0.1}
                          max={50}
                          className="input"
                          style={{ width: '100px', textAlign: 'center', fontWeight: 800, fontSize: '1.1rem', padding: '0.35rem' }}
                          value={editServings}
                          placeholder="1"
                          onChange={handleEditServingsChange}
                        />
                        <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>份</span>
                      </div>
                    </div>

                    {/* Quick Servings Chips */}
                    <div className="flex gap-1.5 flex-wrap items-center">
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>快速設定:</span>
                      {[0.5, 1, 1.5, 2, 3].map(serv => (
                        <button
                          key={serv}
                          type="button"
                          className={`btn btn-sm ${editServings === serv ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}
                          onClick={() => handleEditServingsChange(serv)}
                        >
                          {serv} 份
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 三大元素與熱量（支援自動連動與手動微調） */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    三大營養素與熱量 (可直接微調)
                  </span>
                  {editBaseFood && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--neon-green)' }}>
                      💡 已依照食材比例自動換算
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
                  <div>
                    <label className="label" style={{ fontSize: '0.72rem', color: 'var(--neon-green)' }}>熱量 (kcal)</label>
                    <NumberInput
                      step="1"
                      className="input"
                      value={editCalories}
                      min={0}
                      placeholder="0"
                      onChange={setEditCalories}
                      required
                    />
                  </div>
                  <div>
                    <label className="label" style={{ fontSize: '0.72rem', color: 'var(--neon-emerald)' }}>蛋白質 (g)</label>
                    <NumberInput
                      step="0.1"
                      className="input"
                      value={editProtein}
                      min={0}
                      placeholder="0"
                      onChange={setEditProtein}
                      required
                    />
                  </div>
                  <div>
                    <label className="label" style={{ fontSize: '0.72rem', color: 'var(--neon-cyan)' }}>碳水 (g)</label>
                    <NumberInput
                      step="0.1"
                      className="input"
                      value={editCarbs}
                      min={0}
                      placeholder="0"
                      onChange={setEditCarbs}
                      required
                    />
                  </div>
                  <div>
                    <label className="label" style={{ fontSize: '0.72rem', color: 'var(--neon-amber)' }}>脂肪 (g)</label>
                    <NumberInput
                      step="0.1"
                      className="input"
                      value={editFat}
                      min={0}
                      placeholder="0"
                      onChange={setEditFat}
                      required
                    />
                  </div>
                </div>

                <div style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-dim)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  padding: '0.4rem 0.6rem',
                  borderRadius: '0.4rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>公式驗證 (P×4 + C×4 + F×9):</span>
                  <strong style={{ color: 'var(--text-main)' }}>
                    {Math.round((editProtein * 4) + (editCarbs * 4) + (editFat * 9))} kcal
                  </strong>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="modal-footer flex items-center justify-between" style={{ padding: '0.75rem 0 0', marginTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--neon-rose)' }}
                  onClick={() => {
                    handleDeleteMeal(editingMealEntry.id);
                    setEditingMealEntry(null);
                  }}
                >
                  <Trash2 size={14} />
                  <span>刪除此項</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setEditingMealEntry(null)}
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                  >
                    <Check size={14} />
                    <span>儲存修改</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ==================== MODAL: 40 天固定衝刺階段總表 ==================== */}
      {isSprintTableModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '680px' }}>
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <Zap size={20} style={{ color: 'var(--neon-rose)' }} />
                <h3 className="modal-title">40 天固定衝刺階段表 (分男/女)</h3>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setIsSprintTableModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body flex flex-col gap-4">
              <div style={{
                background: 'rgba(244, 63, 94, 0.08)',
                border: '1px solid rgba(244, 63, 94, 0.25)',
                padding: '0.75rem 1rem',
                borderRadius: '0.75rem',
                fontSize: '0.82rem',
                color: 'var(--text-muted)'
              }}>
                📌 <strong>獨立階段性衝刺方案</strong>：係數均需 $\times$ 當前體重 (kg)。高碳日只是宏量目標變化，不是放縱日！
              </div>

              {/* Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.6rem 0.5rem', textAlign: 'left' }}>階段天數</th>
                      <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>類型</th>
                      <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>碳水 (g/kg)</th>
                      <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>蛋白質 (g/kg)</th>
                      <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>脂肪 男/女 (g/kg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { range: '1–11 天', type: '普通日', carb: 3.0, prot: 1.4, fat: '0.4 / 0.5', isHigh: false, activeDays: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
                      { range: '第 12 天', type: '🔥 高碳日', carb: 5.0, prot: 1.0, fat: '0.4 / 0.5', isHigh: true, activeDays: [12] },
                      { range: '13–23 天', type: '普通日', carb: 2.5, prot: 1.6, fat: '0.4 / 0.6', isHigh: false, activeDays: [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23] },
                      { range: '第 24 天', type: '🔥 高碳日', carb: 6.0, prot: 1.2, fat: '0.5 / 0.6', isHigh: true, activeDays: [24] },
                      { range: '25–35 天', type: '普通日', carb: 2.0, prot: 1.8, fat: '0.5 / 0.6', isHigh: false, activeDays: [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35] },
                      { range: '第 36 天', type: '🔥 高碳日', carb: 6.0, prot: 1.2, fat: '0.5 / 0.6', isHigh: true, activeDays: [36] },
                      { range: '37–40 天', type: '普通日', carb: 2.0, prot: 1.8, fat: '0.5 / 0.6', isHigh: false, activeDays: [37, 38, 39, 40] },
                    ].map(row => {
                      const isCurrentRow = row.activeDays.includes(currentSprintDay);
                      return (
                        <tr
                          key={row.range}
                          style={{
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            background: isCurrentRow
                              ? (row.isHigh ? 'rgba(244, 63, 94, 0.18)' : 'rgba(0, 245, 155, 0.12)')
                              : (row.isHigh ? 'rgba(244, 63, 94, 0.05)' : 'transparent'),
                            fontWeight: isCurrentRow ? 700 : 400,
                          }}
                        >
                          <td style={{ padding: '0.65rem 0.5rem', color: isCurrentRow ? 'var(--text-main)' : 'var(--text-muted)' }}>
                            {row.range} {isCurrentRow && <span className="badge badge-rose" style={{ fontSize: '0.65rem', marginLeft: '0.3rem' }}>目前</span>}
                          </td>
                          <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center', color: row.isHigh ? 'var(--neon-rose)' : 'var(--neon-green)' }}>
                            {row.type}
                          </td>
                          <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center', color: 'var(--neon-cyan)', fontWeight: 700 }}>
                            {row.carb}
                          </td>
                          <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center', color: 'var(--neon-emerald)', fontWeight: 700 }}>
                            {row.prot}
                          </td>
                          <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center', color: 'var(--neon-amber)', fontWeight: 700 }}>
                            {row.fat}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 40天方案執行守則 */}
              <div style={{
                background: 'rgba(12, 19, 34, 0.7)',
                padding: '0.85rem 1rem',
                borderRadius: '0.75rem',
                border: '1px solid var(--border-color)',
                fontSize: '0.8rem',
                lineHeight: 1.6,
              }}>
                <div style={{ fontWeight: 700, color: 'var(--neon-rose)', marginBottom: '0.35rem' }}>
                  40 天衝刺執行 4 大核心規則：
                </div>
                <div>01. <strong>從執行當天算第 1 天</strong>：不要用自然月或週一重新起算。</div>
                <div>02. <strong>每天按當前體重乘係數</strong>：得到當天碳水、蛋白質和脂肪精確克數。</div>
                <div>03. <strong>高碳日仍然要記錄克數</strong>：第 12、24、36 天不是放縱隨便吃！</div>
                <div>04. <strong>不能和三個月動態版疊加</strong>：不要自行延長週期，也不要混合兩套係數。</div>
                <div style={{ color: 'var(--neon-rose)', marginTop: '0.4rem' }}>
                  ⚠️ <strong>停止硬頂信號</strong>：出現持續乏力 | 訓練表現明顯下降 | 睡眠、情緒或恢復顯著變差時，請立即停止衝刺！
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setIsSprintTableModalOpen(false)}>
                關閉
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: 三個月動態版 · 每週訓練時數對照表 ==================== */}
      {isThreeMonthsModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '780px' }}>
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <Clock size={20} style={{ color: 'var(--neon-purple)' }} />
                <h3 className="modal-title">三個月動態版 | 男性 & 女性每週訓練時數對照表</h3>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setIsThreeMonthsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body flex flex-col gap-4">
              <div style={{
                background: 'rgba(168, 85, 247, 0.08)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                padding: '0.85rem 1rem',
                borderRadius: '0.75rem',
                fontSize: '0.85rem',
              }}>
                <div style={{ fontWeight: 800, color: 'var(--neon-purple)', marginBottom: '0.25rem' }}>
                  公式：每日克數 = 當前體重 (kg) × 對應係數
                </div>
                <div style={{ color: 'var(--text-muted)' }}>
                  根據每週訓練小時數選擇起點；不是訓練越多就越應該硬壓熱量。男女係數不同，按自己的訓練量和當前體重計算，不照抄他人攝入。
                </div>
              </div>

              {/* 男性對照表 */}
              <div style={{ background: 'rgba(12, 19, 34, 0.7)', borderRadius: '0.75rem', border: '1px solid var(--border-color)', padding: '0.75rem' }}>
                <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 800, color: 'var(--neon-cyan)', fontSize: '0.9rem' }}>
                    👨 男性起點對照表 (3-MONTH · 男性)
                  </span>
                  {activeProfile.gender === 'male' && (
                    <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>您當前適用性別</span>
                  )}
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'center' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255, 255, 255, 0.05)', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '0.5rem' }}>每週訓練</th>
                        <th style={{ padding: '0.5rem', color: 'var(--neon-amber)' }}>碳水 (g/kg)</th>
                        <th style={{ padding: '0.5rem', color: 'var(--neon-cyan)' }}>蛋白質 (g/kg)</th>
                        <th style={{ padding: '0.5rem', color: 'var(--neon-rose)' }}>脂肪 (g/kg)</th>
                        <th style={{ padding: '0.5rem' }}>您的克數試算 ({activeProfile.weightKg}kg)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(['2-3', '4-5', '6-7', '8-9'] as WeeklyTrainingHours[]).map(hrs => {
                        const row = THREE_MONTHS_TABLE.male[hrs];
                        const isCurrent = activeProfile.gender === 'male' && currentTrainingHours === hrs;
                        return (
                          <tr
                            key={hrs}
                            style={{
                              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                              background: isCurrent ? 'rgba(0, 245, 155, 0.12)' : 'transparent',
                              fontWeight: isCurrent ? 700 : 400,
                            }}
                          >
                            <td style={{ padding: '0.5rem' }}>
                              {hrs} 小時 {isCurrent && <span style={{ color: 'var(--neon-green)' }}>👈 當前</span>}
                            </td>
                            <td style={{ padding: '0.5rem', color: 'var(--neon-amber)', fontWeight: 700 }}>{row.carbRatio} g/kg</td>
                            <td style={{ padding: '0.5rem', color: 'var(--neon-cyan)', fontWeight: 700 }}>{row.proteinRatio} g/kg</td>
                            <td style={{ padding: '0.5rem', color: 'var(--neon-rose)', fontWeight: 700 }}>{row.fatRatio} g/kg</td>
                            <td style={{ padding: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              C {Math.round(activeProfile.weightKg * row.carbRatio)}g / P {Math.round(activeProfile.weightKg * row.proteinRatio)}g / F {Math.round(activeProfile.weightKg * row.fatRatio)}g
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 女性對照表 */}
              <div style={{ background: 'rgba(12, 19, 34, 0.7)', borderRadius: '0.75rem', border: '1px solid var(--border-color)', padding: '0.75rem' }}>
                <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 800, color: 'var(--neon-purple)', fontSize: '0.9rem' }}>
                    👩 女性起點對照表 (3-MONTH · 女性)
                  </span>
                  {activeProfile.gender === 'female' && (
                    <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>您當前適用性別</span>
                  )}
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'center' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255, 255, 255, 0.05)', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '0.5rem' }}>每週訓練</th>
                        <th style={{ padding: '0.5rem', color: 'var(--neon-amber)' }}>碳水 (g/kg)</th>
                        <th style={{ padding: '0.5rem', color: 'var(--neon-cyan)' }}>蛋白質 (g/kg)</th>
                        <th style={{ padding: '0.5rem', color: 'var(--neon-rose)' }}>脂肪 (g/kg)</th>
                        <th style={{ padding: '0.5rem' }}>您的克數試算 ({activeProfile.weightKg}kg)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(['2-3', '4-5', '6-7', '8-9'] as WeeklyTrainingHours[]).map(hrs => {
                        const row = THREE_MONTHS_TABLE.female[hrs];
                        const isCurrent = activeProfile.gender === 'female' && currentTrainingHours === hrs;
                        return (
                          <tr
                            key={hrs}
                            style={{
                              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                              background: isCurrent ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
                              fontWeight: isCurrent ? 700 : 400,
                            }}
                          >
                            <td style={{ padding: '0.5rem' }}>
                              {hrs} 小時 {isCurrent && <span style={{ color: 'var(--neon-purple)' }}>👈 當前</span>}
                            </td>
                            <td style={{ padding: '0.5rem', color: 'var(--neon-amber)', fontWeight: 700 }}>{row.carbRatio} g/kg</td>
                            <td style={{ padding: '0.5rem', color: 'var(--neon-cyan)', fontWeight: 700 }}>{row.proteinRatio} g/kg</td>
                            <td style={{ padding: '0.5rem', color: 'var(--neon-rose)', fontWeight: 700 }}>{row.fatRatio} g/kg</td>
                            <td style={{ padding: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              C {Math.round(activeProfile.weightKg * row.carbRatio)}g / P {Math.round(activeProfile.weightKg * row.proteinRatio)}g / F {Math.round(activeProfile.weightKg * row.fatRatio)}g
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 核心規則 */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '0.75rem 1rem',
                borderRadius: '0.65rem',
                fontSize: '0.8rem',
                lineHeight: 1.6,
                color: 'var(--text-muted)'
              }}>
                <div style={{ fontWeight: 700, color: 'var(--neon-amber)', marginBottom: '0.25rem' }}>
                  📌 三個月動態版執行核心準則：
                </div>
                {THREE_MONTHS_RULES.map((rule, idx) => (
                  <div key={idx}>• {rule}</div>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setIsThreeMonthsModalOpen(false)}>
                關閉
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: 譚成義 · 焚訣 知識與補劑指南 ==================== */}
      {isKnowledgeModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '680px' }}>
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <BookOpen size={20} style={{ color: 'var(--neon-green)' }} />
                <h3 className="modal-title">焚訣《增肌減脂 & 補劑指南》</h3>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setIsKnowledgeModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body flex flex-col gap-4">
              {/* 底層邏輯 */}
              <div style={{
                background: 'rgba(0, 245, 155, 0.06)',
                border: '1px solid rgba(0, 245, 155, 0.25)',
                padding: '0.85rem 1rem',
                borderRadius: '0.75rem',
              }}>
                <div style={{ fontWeight: 800, color: 'var(--neon-green)', fontSize: '0.95rem', marginBottom: '0.4rem' }}>
                  增肌與減脂底層邏輯
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.6 }}>
                  • <strong>增肌</strong>：熱量盈餘 + 訓練強度（漸進超負荷）。吃得多 ≠ 狀態好，盲目吃會導致肌肉狀態差、犯困、起痘、消化差。<br />
                  • <strong>減脂</strong>：短期看熱量缺口，長期看激素穩定。用最小缺口（200-300 kcal/天）完成最大化減脂，大缺口會導致激素紊亂造成瓶頸期。<br />
                  • <strong>動態碳水核心</strong>：平時保持微飢餓感抗炎；訓練強渴望碳水時提高碳水 +0.5倍降蛋白；休息時降低碳水 -0.5倍增蛋白。
                </div>
              </div>

              {/* 補劑 3 條 */}
              <div style={{
                background: 'rgba(12, 19, 34, 0.7)',
                padding: '0.85rem 1rem',
                borderRadius: '0.75rem',
                border: '1px solid var(--border-color)',
              }}>
                <div style={{ fontWeight: 800, color: 'var(--neon-cyan)', fontSize: '0.92rem', marginBottom: '0.5rem' }}>
                  補劑：記住這 3 條 (只能補缺口，不能替代穩定飲食訓練)
                </div>
                <div className="flex flex-col gap-2">
                  {TAN_KNOWLEDGE.supplements.map(s => (
                    <div key={s.id} style={{ fontSize: '0.82rem' }}>
                      <strong style={{ color: 'var(--text-main)' }}>{s.title}</strong>：
                      <span style={{ color: 'var(--text-muted)' }}>{s.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 執行時到底看什麼 */}
              <div style={{
                background: 'rgba(12, 19, 34, 0.7)',
                padding: '0.85rem 1rem',
                borderRadius: '0.75rem',
                border: '1px solid var(--border-color)',
              }}>
                <div style={{ fontWeight: 800, color: 'var(--neon-amber)', fontSize: '0.92rem', marginBottom: '0.5rem' }}>
                  執行時到底看什麼？(體重只是一個指標，要看四組信息)
                </div>
                <div className="grid-cols-2 grid-responsive-2 gap-3">
                  {TAN_KNOWLEDGE.executionMetrics.map(m => (
                    <div key={m.id} style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.5rem 0.75rem', borderRadius: '0.5rem' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-main)' }}>{m.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{m.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 最常見的 4 個誤區 */}
              <div style={{
                background: 'rgba(244, 63, 94, 0.06)',
                border: '1px solid rgba(244, 63, 94, 0.25)',
                padding: '0.85rem 1rem',
                borderRadius: '0.75rem',
              }}>
                <div style={{ fontWeight: 800, color: 'var(--neon-rose)', fontSize: '0.92rem', marginBottom: '0.4rem' }}>
                  最常見的 4 個誤區
                </div>
                <div className="flex flex-col gap-1.5" style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {TAN_KNOWLEDGE.commonMistakes.map((mistake, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <AlertTriangle size={13} style={{ color: 'var(--neon-rose)', flexShrink: 0 }} />
                      <span>{mistake}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setIsKnowledgeModalOpen(false)}>
                了解並關閉
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: 切換 / 重新選擇飲食方案 ==================== */}
      {isProtocolModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '680px' }}>
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <RefreshCw size={20} style={{ color: 'var(--neon-green)' }} />
                <div>
                  <h3 className="modal-title">切換 / 重新選擇飲食方案</h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    若先前選錯或想嘗試不同階段週期，可隨時在此一鍵無痛切換
                  </div>
                </div>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setIsProtocolModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body flex flex-col gap-4">
              {/* 目標快速切換 (增肌 / 減脂 / 維持) */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-color)',
                padding: '0.85rem 1rem',
                borderRadius: '0.75rem',
              }}>
                <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    🎯 當前體態目標：
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    (點擊即可即時調整目標)
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  {(['gain_muscle', 'lose_fat', 'maintain'] as FitnessGoal[]).map(g => (
                    <button
                      key={g}
                      type="button"
                      className={`btn btn-sm ${activeProfile.goal === g ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ justifyContent: 'center', fontSize: '0.82rem' }}
                      onClick={() => handleGoalChange(g)}
                    >
                      {g === 'gain_muscle' ? '💪 增肌 (+250 kcal)' : g === 'lose_fat' ? '🔥 減脂 (-300 kcal)' : '⚖️ 維持體態'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 四大方案卡片列表 */}
              <div className="flex flex-col gap-3">
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  選擇主要執行的飲食方案 (點選任一卡片立即生效)：
                </div>

                {/* 1. 譚成義動態碳水循環 */}
                <div
                  onClick={() => handleProtocolChange('tan_carb_cycling')}
                  style={{
                    padding: '1rem',
                    borderRadius: '0.75rem',
                    cursor: 'pointer',
                    background: (targets.protocol === 'tan_carb_cycling') ? 'rgba(0, 245, 155, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                    border: `1.5px solid ${(targets.protocol === 'tan_carb_cycling') ? 'var(--neon-green)' : 'var(--border-color)'}`,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div className="flex items-center justify-between" style={{ marginBottom: '0.35rem' }}>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: '1.25rem' }}>🍚</span>
                      <div>
                        <span style={{ fontWeight: 800, fontSize: '0.95rem', color: targets.protocol === 'tan_carb_cycling' ? 'var(--neon-green)' : 'var(--text-main)' }}>
                          焚訣動態碳水循環法
                        </span>
                        <span className="badge badge-green" style={{ marginLeft: '0.5rem', fontSize: '0.68rem' }}>
                          增肌 / 體態重組首選
                        </span>
                      </div>
                    </div>
                    {targets.protocol === 'tan_carb_cycling' ? (
                      <span className="badge badge-green flex items-center gap-1" style={{ fontSize: '0.75rem' }}>
                        <Check size={12} /> 目前使用中
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>點擊套用</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5, paddingLeft: '1.8rem' }}>
                    基數碳水 2.5~3.5 g/kg · 蛋白 1.2~2.0 g/kg。平時保持微飢餓感抗炎；訓練強日高碳 +0.5倍降蛋白；休息日低碳 -0.5倍增蛋白。
                  </div>
                </div>

                {/* 2. 40 天固定衝刺階段表 */}
                <div
                  onClick={() => handleProtocolChange('sprint_40d')}
                  style={{
                    padding: '1rem',
                    borderRadius: '0.75rem',
                    cursor: 'pointer',
                    background: (targets.protocol === 'sprint_40d') ? 'rgba(244, 63, 94, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                    border: `1.5px solid ${(targets.protocol === 'sprint_40d') ? 'var(--neon-rose)' : 'var(--border-color)'}`,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div className="flex items-center justify-between" style={{ marginBottom: '0.35rem' }}>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: '1.25rem' }}>⚡</span>
                      <div>
                        <span style={{ fontWeight: 800, fontSize: '0.95rem', color: targets.protocol === 'sprint_40d' ? 'var(--neon-rose)' : 'var(--text-main)' }}>
                          40 天固定衝刺階段表
                        </span>
                        <span className="badge badge-rose" style={{ marginLeft: '0.5rem', fontSize: '0.68rem' }}>
                          男女極速減脂 · 40天週期
                        </span>
                      </div>
                    </div>
                    {targets.protocol === 'sprint_40d' ? (
                      <span className="badge badge-rose flex items-center gap-1" style={{ fontSize: '0.75rem' }}>
                        <Check size={12} /> 目前使用中
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>點擊套用</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5, paddingLeft: '1.8rem' }}>
                    分男/女階梯係數與嚴格天數表；第 12、24、36 天為高碳充碳日 (Refeed Day) 喚醒瘦素與代謝，突破停滯期。
                  </div>
                </div>

                {/* 3. 三個月動態減脂方案 */}
                <div
                  onClick={() => handleProtocolChange('dynamic_3months')}
                  style={{
                    padding: '1rem',
                    borderRadius: '0.75rem',
                    cursor: 'pointer',
                    background: (targets.protocol === 'dynamic_3months') ? 'rgba(168, 85, 247, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                    border: `1.5px solid ${(targets.protocol === 'dynamic_3months') ? 'var(--neon-purple)' : 'var(--border-color)'}`,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div className="flex items-center justify-between" style={{ marginBottom: '0.35rem' }}>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: '1.25rem' }}>⏱️</span>
                      <div>
                        <span style={{ fontWeight: 800, fontSize: '0.95rem', color: targets.protocol === 'dynamic_3months' ? 'var(--neon-purple)' : 'var(--text-main)' }}>
                          三個月動態減脂方案
                        </span>
                        <span className="badge badge-purple" style={{ marginLeft: '0.5rem', fontSize: '0.68rem' }}>
                          每週訓練時數起點
                        </span>
                      </div>
                    </div>
                    {targets.protocol === 'dynamic_3months' ? (
                      <span className="badge badge-purple flex items-center gap-1" style={{ fontSize: '0.75rem' }}>
                        <Check size={12} /> 目前使用中
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>點擊套用</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5, paddingLeft: '1.8rem' }}>
                    以每週運動時數（2-3h / 4-5h / 6-7h / 8-9h）為起點精算碳水/蛋白/脂肪；男女專屬對照係數，執行7-10天看體態反饋微調。
                  </div>
                </div>

                {/* 4. 傳統標準均衡模式 */}
                <div
                  onClick={() => handleProtocolChange('standard')}
                  style={{
                    padding: '1rem',
                    borderRadius: '0.75rem',
                    cursor: 'pointer',
                    background: (targets.protocol === 'standard') ? 'rgba(6, 182, 212, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                    border: `1.5px solid ${(targets.protocol === 'standard') ? 'var(--neon-cyan)' : 'var(--border-color)'}`,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div className="flex items-center justify-between" style={{ marginBottom: '0.35rem' }}>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: '1.25rem' }}>⚖️</span>
                      <div>
                        <span style={{ fontWeight: 800, fontSize: '0.95rem', color: targets.protocol === 'standard' ? 'var(--neon-cyan)' : 'var(--text-main)' }}>
                          傳統標準均衡模式
                        </span>
                        <span className="badge badge-cyan" style={{ marginLeft: '0.5rem', fontSize: '0.68rem' }}>
                          BMR / TDEE 自由加減
                        </span>
                      </div>
                    </div>
                    {targets.protocol === 'standard' ? (
                      <span className="badge badge-cyan flex items-center gap-1" style={{ fontSize: '0.75rem' }}>
                        <Check size={12} /> 目前使用中
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>點擊套用</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5, paddingLeft: '1.8rem' }}>
                    Mifflin-St Jeor 經典算式，依基礎代謝 BMR 與活動度計算 TDEE，支援手動微調與自訂宏量熱量。
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setIsProtocolModalOpen(false);
                  onOpenProfileEdit();
                }}
              >
                ⚙️ 編輯完整個人資料 (身高/體重/性別/年齡)
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setIsProtocolModalOpen(false)}>
                關閉視窗
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
