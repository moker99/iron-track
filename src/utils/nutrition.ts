import type { ActivityLevel, FitnessGoal, Gender, UserProfile } from '../types';

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, { label: string; desc: string; factor: number }> = {
  sedentary: { label: '久坐族 (辦公室/幾乎無運動)', desc: '大部分時間坐著，很少活動', factor: 1.2 },
  light: { label: '輕度活動 (每週運動 1-3 天)', desc: '輕度運動或快走', factor: 1.375 },
  moderate: { label: '中度活動 (每週運動 3-5 天)', desc: '規律中等強度健身、重訓', factor: 1.55 },
  very_active: { label: '高強度活動 (每週運動 6-7 天)', desc: '高強度重訓或體能訓練', factor: 1.725 },
  extra_active: { label: '超高活動 (一日雙練/重勞力工)', desc: '專業運動員或高強度體力勞動', factor: 1.9 },
};

export const GOAL_CONFIGS: Record<FitnessGoal, { label: string; desc: string; calorieOffset: number }> = {
  lose_fat: { label: '減脂瘦身 (Fat Loss)', desc: '每日創造約 300~500 kcal 熱量赤字，同時保持高蛋白防止肌肉流失', calorieOffset: -400 },
  maintain: { label: '維持體態 (Maintenance)', desc: '熱量攝取等於消耗，優化身體組成與力量', calorieOffset: 0 },
  gain_muscle: { label: '增肌強壯 (Muscle Building)', desc: '微幅熱量盈餘 (+300 kcal)，提供肌肉合成原料與充沛訓練力量', calorieOffset: 300 },
};

/**
 * 計算基礎代謝率 BMR (Mifflin-St Jeor 公式)
 */
export function calculateBMR(gender: Gender, weightKg: number, heightCm: number, age: number): number {
  if (weightKg <= 0 || heightCm <= 0 || age <= 0) return 1500;
  if (gender === 'male') {
    return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + 5);
  } else {
    return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age - 161);
  }
}

/**
 * 計算每日總熱量消耗 TDEE
 */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  const factor = ACTIVITY_MULTIPLIERS[activityLevel]?.factor || 1.375;
  return Math.round(bmr * factor);
}

/**
 * 計算 BMI
 */
export function calculateBMI(weightKg: number, heightCm: number): { bmi: number; label: string; color: string } {
  if (heightCm <= 0 || weightKg <= 0) return { bmi: 0, label: '未知', color: 'text-gray-400' };
  const hM = heightCm / 100;
  const bmi = Number((weightKg / (hM * hM)).toFixed(1));
  if (bmi < 18.5) return { bmi, label: '偏輕', color: 'text-blue-400' };
  if (bmi < 24) return { bmi, label: '標準正常', color: 'text-emerald-400' };
  if (bmi < 27) return { bmi, label: '微偏重 (健壯)', color: 'text-yellow-400' };
  return { bmi, label: '肥胖警示', color: 'text-rose-400' };
}

/**
 * 智慧建議三大營養素配比 (蛋白質 4kcal/g, 碳水 4kcal/g, 脂肪 9kcal/g)
 */
export function calculateRecommendedMacros(
  targetCalories: number,
  weightKg: number,
  goal: FitnessGoal
): { proteinGrams: number; carbsGrams: number; fatGrams: number; macroCalories: number } {
  // 依目標給予蛋白質克數建議
  let proteinRatio = 1.8; // g/kg
  if (goal === 'lose_fat') proteinRatio = 2.1; // 減脂高蛋白抗分解
  if (goal === 'gain_muscle') proteinRatio = 2.0;

  const proteinGrams = Math.round(weightKg * proteinRatio);
  const proteinCals = proteinGrams * 4;

  // 脂肪佔總熱量 23%
  const fatCals = Math.round(targetCalories * 0.23);
  const fatGrams = Math.round(fatCals / 9);

  // 剩餘熱量全部分配給碳水化合物
  const remainingCals = Math.max(0, targetCalories - proteinCals - (fatGrams * 9));
  const carbsGrams = Math.round(remainingCals / 4);

  const macroCalories = (proteinGrams * 4) + (carbsGrams * 4) + (fatGrams * 9);

  return {
    proteinGrams,
    carbsGrams,
    fatGrams,
    macroCalories
  };
}

/**
 * 獲取使用者的當前目標數值 (支援自訂或自動計算)
 */
export function getUserNutritionTargets(user: UserProfile) {
  const bmr = calculateBMR(user.gender, user.weightKg, user.heightCm, user.age);
  const tdee = calculateTDEE(bmr, user.activityLevel);
  const goalOffset = GOAL_CONFIGS[user.goal]?.calorieOffset || 0;
  const autoTargetCalories = Math.max(1200, tdee + goalOffset);

  const targetCalories = user.customCalories || autoTargetCalories;

  const recommended = calculateRecommendedMacros(targetCalories, user.weightKg, user.goal);

  const targetProtein = user.customProteinGrams || recommended.proteinGrams;
  const targetCarbs = user.customCarbsGrams || recommended.carbsGrams;
  const targetFat = user.customFatGrams || recommended.fatGrams;

  // 三大營養素總卡路里驗證
  const macroCalculatedCalories = (targetProtein * 4) + (targetCarbs * 4) + (targetFat * 9);

  return {
    bmr,
    tdee,
    targetCalories,
    targetProtein,
    targetCarbs,
    targetFat,
    macroCalculatedCalories,
  };
}

/**
 * 預估單次最大肌力 1RM (Brzycki 公式)
 */
export function calculate1RM(weightKg: number, reps: number): number {
  if (reps <= 1) return weightKg;
  if (reps >= 37) return weightKg;
  return Math.round(weightKg * (36 / (37 - reps)));
}

/**
 * 估算重訓與健身運動消耗熱量 (ACSM 代謝當量 MET 公式)
 * @param weightKg 體重 (kg)
 * @param durationMinutes 訓練時長 (分)
 * @param totalSets 完成組數
 * @param totalVolumeKg 訓練總容量 (kg)
 */
export function estimateWorkoutCalories(
  weightKg: number,
  durationMinutes: number,
  totalSets: number,
  totalVolumeKg: number
): number {
  if (durationMinutes <= 0 && totalSets <= 0) return 0;
  const validDuration = Math.max(durationMinutes, totalSets * 2.5); // 若沒開計時碼錶，每組預估2.5分鐘
  // 重訓中高強度 MET 基準約 5.5
  const baseBurn = (5.5 * 3.5 * (weightKg || 70) / 200) * validDuration;
  // 加上總訓練容量強度加成
  const volumeBonus = Math.min(120, Math.round(totalVolumeKg / 150));
  return Math.round(baseBurn + volumeBonus);
}

