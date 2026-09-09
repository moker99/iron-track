import type {
  ActivityLevel,
  CarbCyclingPhase,
  DietProtocol,
  FitnessGoal,
  Gender,
  UserProfile,
  WeeklyTrainingHours,
} from '../types';

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, { label: string; desc: string; factor: number }> = {
  sedentary: { label: '久坐族 (辦公室/幾乎無運動)', desc: '大部分時間坐著，很少活動', factor: 1.2 },
  light: { label: '輕度活動 (每週運動 1-3 天)', desc: '輕度運動或快走', factor: 1.375 },
  moderate: { label: '中度活動 (每週運動 3-5 天)', desc: '規律中等強度健身、重訓', factor: 1.55 },
  very_active: { label: '高強度活動 (每週運動 6-7 天)', desc: '高強度重訓或體能訓練', factor: 1.725 },
  extra_active: { label: '超高活動 (一日雙練/重勞力工)', desc: '專業運動員或高強度體力勞動', factor: 1.9 },
};

export const GOAL_CONFIGS: Record<FitnessGoal, { label: string; desc: string; calorieOffset: number }> = {
  lose_fat: { label: '減脂瘦身 (Fat Loss)', desc: '最小缺口 200~300 kcal 保持激素穩定，長期維持高效燃脂', calorieOffset: -300 },
  maintain: { label: '維持體態 (Maintenance)', desc: '熱量攝取等於消耗，優化身體組成與力量', calorieOffset: 0 },
  gain_muscle: { label: '增肌強壯 (Muscle Building)', desc: '微幅熱量盈餘 (+250 kcal) + 漸進超負荷，吃得好不盲目硬塞', calorieOffset: 250 },
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

// ==================== 1. 40 天固定衝刺階段表 (分男/女) ====================
export interface Sprint40DayConfig {
  day: number;
  stageRange: string;
  stageName: string;
  isHighCarb: boolean;
  carbRatio: number;
  proteinRatio: number;
  fatRatio: number;
  notes: string;
}

export function getSprint40DayConfig(day: number, gender: Gender): Sprint40DayConfig {
  const clampedDay = Math.min(40, Math.max(1, Math.round(day || 1)));

  // 第 12、24、36 天為高碳充碳日 (Refeed Day)
  if (clampedDay === 12) {
    return {
      day: 12,
      stageRange: '第 12 天',
      stageName: '🔥 第1階段 高碳充碳日',
      isHighCarb: true,
      carbRatio: 5.0,
      proteinRatio: 1.0,
      fatRatio: gender === 'male' ? 0.4 : 0.5,
      notes: '高碳日只是宏量目標變化，不是放縱日！提高碳水降蛋白，喚醒瘦素與甲狀腺素。',
    };
  }
  if (clampedDay === 24) {
    return {
      day: 24,
      stageRange: '第 24 天',
      stageName: '🔥 第2階段 高碳充碳日',
      isHighCarb: true,
      carbRatio: 6.0,
      proteinRatio: 1.2,
      fatRatio: gender === 'male' ? 0.5 : 0.6,
      notes: '強力充碳突破瓶頸期，切勿隨便吃油膩放縱餐，嚴格記錄克數。',
    };
  }
  if (clampedDay === 36) {
    return {
      day: 36,
      stageRange: '第 36 天',
      stageName: '🔥 第3階段 高碳充碳日',
      isHighCarb: true,
      carbRatio: 6.0,
      proteinRatio: 1.2,
      fatRatio: gender === 'male' ? 0.5 : 0.6,
      notes: '最後衝刺充碳，充盈肌糖原，穩定神經與修復。',
    };
  }

  // 1–11 天
  if (clampedDay >= 1 && clampedDay <= 11) {
    return {
      day: clampedDay,
      stageRange: '1–11 天',
      stageName: '第 1 階段 普通日',
      isHighCarb: false,
      carbRatio: 3.0,
      proteinRatio: 1.4,
      fatRatio: gender === 'male' ? 0.4 : 0.5,
      notes: '建立減脂代謝節奏，熱量小缺口，保持微飢餓感抗炎。',
    };
  }
  // 13–23 天
  if (clampedDay >= 13 && clampedDay <= 23) {
    return {
      day: clampedDay,
      stageRange: '13–23 天',
      stageName: '第 2 階段 普通日',
      isHighCarb: false,
      carbRatio: 2.5,
      proteinRatio: 1.6,
      fatRatio: gender === 'male' ? 0.4 : 0.6,
      notes: '深化減脂，碳水微降至 2.5，蛋白質微增至 1.6 防肌肉分解。',
    };
  }
  // 25–35 天 與 37–40 天
  return {
    day: clampedDay,
    stageRange: clampedDay <= 35 ? '25–35 天' : '37–40 天',
    stageName: clampedDay <= 35 ? '第 3 階段 普通日' : '衝刺收尾 普通日',
    isHighCarb: false,
    carbRatio: 2.0,
    proteinRatio: 1.8,
    fatRatio: gender === 'male' ? 0.5 : 0.6,
    notes: '高強度燃脂期，碳水 2.0，高蛋白 1.8 鞏固瘦體重。',
  };
}

// ==================== 2. 焚訣動態碳水循環法 ====================
export const TAN_DEFAULT_RATIOS = {
  carb: 3.0,
  protein: 1.6,
  fat: 0.7,
  ranges: {
    carb: { min: 2.5, max: 3.5, default: 3.0, label: '2.5 ~ 3.5 g/kg', advice: '吸收能力與訓練強度掛鉤，吃不下 = 身體不需要，切勿硬塞' },
    protein: { min: 1.2, max: 2.0, default: 1.6, label: '1.2 ~ 2.0 g/kg', advice: '依身體反應調整，放屁多臭則減少' },
    fat: { min: 0.6, max: 0.8, default: 0.7, label: '0.6 ~ 0.8 g/kg', advice: '以 Omega-3 + 6 優質油脂為主' },
  },
};

export interface TanCarbCyclingConfig {
  phase: CarbCyclingPhase;
  phaseLabel: string;
  carbRatio: number;
  proteinRatio: number;
  fatRatio: number;
  baseCarbRatio: number;
  baseProteinRatio: number;
  baseFatRatio: number;
  cardioAdvice: string;
  mindsetAdvice: string;
}

export function getTanCarbCyclingConfig(
  phase: CarbCyclingPhase = 'baseline',
  customBaseRatios?: { carbRatio?: number; proteinRatio?: number; fatRatio?: number }
): TanCarbCyclingConfig {
  const baseCarb = customBaseRatios?.carbRatio ?? TAN_DEFAULT_RATIOS.carb;
  const baseProtein = customBaseRatios?.proteinRatio ?? TAN_DEFAULT_RATIOS.protein;
  const baseFat = customBaseRatios?.fatRatio ?? TAN_DEFAULT_RATIOS.fat;

  if (phase === 'high_carb') {
    return {
      phase: 'high_carb',
      phaseLabel: '🚀 提高碳水日 (高強度訓練 / 渴望碳水)',
      carbRatio: Math.round((baseCarb + 0.5) * 10) / 10, // 提高碳水 +0.5倍
      proteinRatio: Math.round(Math.max(1.0, baseProtein - 0.3) * 10) / 10, // 提高碳水降蛋白
      fatRatio: baseFat,
      baseCarbRatio: baseCarb,
      baseProteinRatio: baseProtein,
      baseFatRatio: baseFat,
      cardioAdvice: '訓練後可搭配 30 分鐘中低強度心肺整理，提升細胞粒線體合成。',
      mindsetAdvice: '渴望碳水是好的訊號！碳水集中於訓前與訓後加餐，充沛力量。',
    };
  }
  if (phase === 'low_carb') {
    return {
      phase: 'low_carb',
      phaseLabel: '🛡️ 降低碳水日 (休息日 / 渴望低)',
      carbRatio: Math.round(Math.max(1.5, baseCarb - 0.5) * 10) / 10, // 降低碳水 -0.5倍
      proteinRatio: Math.round((baseProtein + 0.3) * 10) / 10, // 降低碳水增蛋白
      fatRatio: baseFat,
      baseCarbRatio: baseCarb,
      baseProteinRatio: baseProtein,
      baseFatRatio: baseFat,
      cardioAdvice: '安排 30-40 分鐘中高強度有氧，動員脂肪酸氧化分解。',
      mindsetAdvice: '保持身體微微的飢餓感 ➔ 促進身體充分修復與深層抗炎。',
    };
  }
  // baseline 基準日
  return {
    phase: 'baseline',
    phaseLabel: '🍚 基準碳水平衡日 (中等強度/常規訓練)',
    carbRatio: baseCarb,
    proteinRatio: baseProtein,
    fatRatio: baseFat,
    baseCarbRatio: baseCarb,
    baseProteinRatio: baseProtein,
    baseFatRatio: baseFat,
    cardioAdvice: '每週保持 3-4 次有氧，每次 30-40 分鐘中高強度。',
    mindsetAdvice: '吃得多 ≠ 狀態好，安排飲食看身體感受，充足睡眠保證合成代謝。',
  };
}

// ==================== 3. 三個月動態減脂方案 (根據每週訓練小時數計算起點與動態反饋) ====================
export interface ThreeMonthsConfig {
  hours: WeeklyTrainingHours;
  hoursLabel: string;
  carbRatio: number;
  proteinRatio: number;
  fatRatio: number;
  gender: Gender;
  notes: string;
  rules: string[];
}

export const THREE_MONTHS_TABLE: Record<Gender, Record<WeeklyTrainingHours, { carbRatio: number; proteinRatio: number; fatRatio: number }>> = {
  male: {
    '2-3': { carbRatio: 2.2, proteinRatio: 1.4, fatRatio: 0.8 },
    '4-5': { carbRatio: 2.5, proteinRatio: 1.6, fatRatio: 0.9 },
    '6-7': { carbRatio: 3.0, proteinRatio: 1.7, fatRatio: 1.0 },
    '8-9': { carbRatio: 3.5, proteinRatio: 1.8, fatRatio: 1.0 },
  },
  female: {
    '2-3': { carbRatio: 2.0, proteinRatio: 1.4, fatRatio: 1.0 },
    '4-5': { carbRatio: 2.2, proteinRatio: 1.6, fatRatio: 1.1 },
    '6-7': { carbRatio: 2.5, proteinRatio: 1.7, fatRatio: 1.1 },
    '8-9': { carbRatio: 3.0, proteinRatio: 1.8, fatRatio: 1.2 },
  },
};

export const THREE_MONTHS_RULES = [
  '根據每週訓練小時數選擇起點；不是訓練越多就越應該硬壓熱量。',
  '男女係數不同；按自己的訓練量和當前體重計算，不照抄他人攝入。',
  '每日克數 = 當前體重 (kg) × 對應係數',
  '從對應訓練量區間開始，執行 7–10 天後再按反饋調整。',
  '不要因為某一天體重波動就立刻改方案。',
];

export const WEEKLY_TRAINING_HOURS_OPTIONS: { value: WeeklyTrainingHours; label: string; desc: string }[] = [
  { value: '2-3', label: '2–3 小時', desc: '輕量運動或新手入門' },
  { value: '4-5', label: '4–5 小時', desc: '常規健身頻率（推薦起點）' },
  { value: '6-7', label: '6–7 小時', desc: '進階規律分化訓練' },
  { value: '8-9', label: '8–9 小時', desc: '高容量訓練或大課表' },
];

export function getThreeMonthsConfig(
  hours: WeeklyTrainingHours = '4-5',
  gender: Gender = 'male'
): ThreeMonthsConfig {
  const g: Gender = gender === 'female' ? 'female' : 'male';
  const table = THREE_MONTHS_TABLE[g][hours] || THREE_MONTHS_TABLE[g]['4-5'];

  return {
    hours,
    hoursLabel: `每週訓練 ${hours} 小時`,
    carbRatio: table.carbRatio,
    proteinRatio: table.proteinRatio,
    fatRatio: table.fatRatio,
    gender: g,
    notes: '從對應訓練量區間開始，執行 7–10 天後再按反饋調整。不要因為某一天體重波動就立刻改方案。',
    rules: THREE_MONTHS_RULES,
  };
}

/**
 * 智慧建議三大營養素配比 (蛋白質 4kcal/g, 碳水 4kcal/g, 脂肪 9kcal/g)
 */
export function calculateRecommendedMacros(
  targetCalories: number,
  weightKg: number,
  goal: FitnessGoal
): { proteinGrams: number; carbsGrams: number; fatGrams: number; macroCalories: number } {
  let proteinRatio = 1.8;
  if (goal === 'lose_fat') proteinRatio = 2.1;
  if (goal === 'gain_muscle') proteinRatio = 1.8;

  const proteinGrams = Math.round(weightKg * proteinRatio);
  const proteinCals = proteinGrams * 4;

  const fatCals = Math.round(targetCalories * 0.23);
  const fatGrams = Math.round(fatCals / 9);

  const remainingCals = Math.max(0, targetCalories - proteinCals - (fatGrams * 9));
  const carbsGrams = Math.round(remainingCals / 4);

  const macroCalories = (proteinGrams * 4) + (carbsGrams * 4) + (fatGrams * 9);

  return {
    proteinGrams,
    carbsGrams,
    fatGrams,
    macroCalories,
  };
}

/**
 * 獲取使用者的當前目標數值 (支援 40天衝刺、動態碳水循環、3個月動態版、傳統計算)
 */
export function getUserNutritionTargets(
  user: UserProfile,
  options?: {
    currentDate?: string;
    overridePhase?: CarbCyclingPhase;
    overrideSprintDay?: number;
    overrideWeeklyTrainingHours?: WeeklyTrainingHours;
    overrideTanRatios?: { carbRatio?: number; proteinRatio?: number; fatRatio?: number };
  }
) {
  const protocol: DietProtocol = user.dietProtocol || 'standard';

  // 1. 方案一：40 天固定衝刺階段表
  if (protocol === 'sprint_40d') {
    let day = options?.overrideSprintDay || user.sprintManualDay || 1;
    if (!options?.overrideSprintDay && user.sprintStartDate) {
      const start = new Date(user.sprintStartDate);
      const cur = options?.currentDate ? new Date(options.currentDate) : new Date();
      const diffMs = cur.getTime() - start.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
      day = Math.min(40, Math.max(1, diffDays));
    }

    const sprint = getSprint40DayConfig(day, user.gender);
    const targetProtein = Math.round(user.weightKg * sprint.proteinRatio);
    const targetCarbs = Math.round(user.weightKg * sprint.carbRatio);
    const targetFat = Math.round(user.weightKg * sprint.fatRatio);
    const targetCalories = (targetProtein * 4) + (targetCarbs * 4) + (targetFat * 9);

    const bmr = calculateBMR(user.gender, user.weightKg, user.heightCm, user.age);
    const tdee = calculateTDEE(bmr, user.activityLevel);

    return {
      protocol,
      bmr,
      tdee,
      targetCalories,
      targetProtein,
      targetCarbs,
      targetFat,
      macroCalculatedCalories: targetCalories,
      sprintInfo: sprint,
    };
  }

  // 2. 方案二：焚訣動態碳水循環 (支援自訂動態基準輸入)
  if (protocol === 'tan_carb_cycling') {
    const phase = options?.overridePhase || user.carbCyclingPhase || 'baseline';
    const baseRatios = options?.overrideTanRatios || {
      carbRatio: user.tanBaselineCarbRatio,
      proteinRatio: user.tanBaselineProteinRatio,
      fatRatio: user.tanBaselineFatRatio,
    };
    const cycle = getTanCarbCyclingConfig(phase, baseRatios);
    const targetProtein = Math.round(user.weightKg * cycle.proteinRatio);
    const targetCarbs = Math.round(user.weightKg * cycle.carbRatio);
    const targetFat = Math.round(user.weightKg * cycle.fatRatio);
    const targetCalories = (targetProtein * 4) + (targetCarbs * 4) + (targetFat * 9);

    const bmr = calculateBMR(user.gender, user.weightKg, user.heightCm, user.age);
    const tdee = calculateTDEE(bmr, user.activityLevel);

    return {
      protocol,
      bmr,
      tdee,
      targetCalories,
      targetProtein,
      targetCarbs,
      targetFat,
      macroCalculatedCalories: targetCalories,
      carbCyclingInfo: cycle,
    };
  }

  // 3. 方案三：三個月動態減脂方案 (以每週運動訓練時數計算)
  if (protocol === 'dynamic_3months') {
    const hours: WeeklyTrainingHours = options?.overrideWeeklyTrainingHours || user.weeklyTrainingHours || '4-5';
    const threeMonth = getThreeMonthsConfig(hours, user.gender);
    const targetProtein = Math.round(user.weightKg * threeMonth.proteinRatio);
    const targetCarbs = Math.round(user.weightKg * threeMonth.carbRatio);
    const targetFat = Math.round(user.weightKg * threeMonth.fatRatio);
    const targetCalories = (targetProtein * 4) + (targetCarbs * 4) + (targetFat * 9);

    const bmr = calculateBMR(user.gender, user.weightKg, user.heightCm, user.age);
    const tdee = calculateTDEE(bmr, user.activityLevel);

    return {
      protocol,
      bmr,
      tdee,
      targetCalories,
      targetProtein,
      targetCarbs,
      targetFat,
      macroCalculatedCalories: targetCalories,
      threeMonthsInfo: threeMonth,
    };
  }

  // 4. 方案四：傳統標準計算 (BMR + TDEE 赤字/盈餘)
  const bmr = calculateBMR(user.gender, user.weightKg, user.heightCm, user.age);
  const tdee = calculateTDEE(bmr, user.activityLevel);
  const goalOffset = GOAL_CONFIGS[user.goal]?.calorieOffset || 0;
  const autoTargetCalories = Math.max(1200, tdee + goalOffset);

  const targetCalories = user.customCalories || autoTargetCalories;
  const recommended = calculateRecommendedMacros(targetCalories, user.weightKg, user.goal);

  const targetProtein = user.customProteinGrams || recommended.proteinGrams;
  const targetCarbs = user.customCarbsGrams || recommended.carbsGrams;
  const targetFat = user.customFatGrams || recommended.fatGrams;
  const macroCalculatedCalories = (targetProtein * 4) + (targetCarbs * 4) + (targetFat * 9);

  return {
    protocol,
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
 */
export function estimateWorkoutCalories(
  weightKg: number,
  durationMinutes: number,
  totalSets: number,
  totalVolumeKg: number
): number {
  if (durationMinutes <= 0 && totalSets <= 0) return 0;
  const validDuration = Math.max(durationMinutes, totalSets * 2.5);
  const baseBurn = (5.5 * 3.5 * (weightKg || 70) / 200) * validDuration;
  const volumeBonus = Math.min(120, Math.round(totalVolumeKg / 150));
  return Math.round(baseBurn + volumeBonus);
}

// ==================== 知識指南常數 (補劑、四大指標、四大誤區) ====================
export const TAN_KNOWLEDGE = {
  supplements: [
    {
      id: 'electrolyte',
      title: '01. 電解質 (Electrolytes)',
      desc: '大量出汗或飲水不足時，補水還需考慮鈉、鉀等電解質。實際需求取決於出汗、飲食與健康狀況。',
    },
    {
      id: 'protein',
      title: '02. 蛋白質 (Protein)',
      desc: '攝取範圍約 1.2~2.0 g/kg；一般訓練者可從 1.6 g/kg 估算，優先從原型日常食物獲取，不足時以乳清補充。',
    },
    {
      id: 'creatine',
      title: '03. 肌酸 (Creatine)',
      desc: '通常每日 3~5g 持續補充，多數人無需裝載期；建議隨含碳水餐食使用，並保持充足日常補水。',
    },
  ],
  executionMetrics: [
    {
      id: 'weight_trend',
      title: '01. 體重趨勢',
      desc: '看連續多日平均變化，不看單日微小波動。',
    },
    {
      id: 'measurements_photos',
      title: '02. 圍度與照片',
      desc: '體重不變也可能體脂下降、肌肉充盈，體態在改善。',
    },
    {
      id: 'training_performance',
      title: '03. 訓練表現',
      desc: '關注力量、動作質量與完成度是否下降。',
    },
    {
      id: 'sleep_recovery',
      title: '04. 睡眠與恢復',
      desc: '觀察精神狀態、疲勞感與情緒是否惡化。',
    },
  ],
  commonMistakes: [
    '照抄其他人攝入量，不按自己體重計算',
    '一次餓、一次漲秤，就立刻大幅增減碳水',
    '把高碳日理解成不計克數的暴飲暴食放縱日',
    '只看體重數字，忽略訓練表現、睡眠和神經恢復',
  ],
  hardStopSignals: '出現持續乏力 | 訓練表現明顯下降 | 睡眠、情緒或恢復顯著變差時，請立即停止硬頂！',
};


