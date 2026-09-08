import type { Exercise, FoodItem, UserProfile, WorkoutRoutineTemplate } from '../types';

export const DEFAULT_EXERCISES: Exercise[] = [
  // Chest
  { id: 'ex-bench-press', name: '槓鈴臥推 (Bench Press)', category: 'chest', equipment: 'barbell', primaryMuscle: '胸大肌' },
  { id: 'ex-incline-db-press', name: '上斜啞鈴臥推 (Incline DB Press)', category: 'chest', equipment: 'dumbbell', primaryMuscle: '上胸' },
  { id: 'ex-cable-fly', name: '滑輪夾胸 (Cable Fly)', category: 'chest', equipment: 'cable', primaryMuscle: '胸肌中縫' },
  { id: 'ex-dips', name: '雙槓臂屈伸 (Chest Dips)', category: 'chest', equipment: 'bodyweight', primaryMuscle: '下胸 / 三頭' },
  
  // Back
  { id: 'ex-pullup', name: '引體向上 (Pull-ups)', category: 'back', equipment: 'bodyweight', primaryMuscle: '背闊肌' },
  { id: 'ex-barbell-row', name: '俯身槓鈴划船 (Barbell Row)', category: 'back', equipment: 'barbell', primaryMuscle: '背闊肌 / 中背' },
  { id: 'ex-lat-pulldown', name: '滑輪下拉 (Lat Pulldown)', category: 'back', equipment: 'cable', primaryMuscle: '背闊肌' },
  { id: 'ex-seated-cable-row', name: '坐姿滑輪划船 (Seated Row)', category: 'back', equipment: 'cable', primaryMuscle: '菱形肌 / 菱形中背' },
  { id: 'ex-deadlift', name: '標準硬舉 (Deadlift)', category: 'back', equipment: 'barbell', primaryMuscle: '後側鏈 / 下背' },

  // Legs
  { id: 'ex-barbell-squat', name: '槓鈴深蹲 (Barbell Squat)', category: 'legs', equipment: 'barbell', primaryMuscle: '股四頭肌 / 臀大肌' },
  { id: 'ex-romanian-deadlift', name: '羅馬尼亞硬舉 (RDL)', category: 'legs', equipment: 'barbell', primaryMuscle: '腿後側膕旁肌 / 臀肌' },
  { id: 'ex-leg-press', name: '機械腿推 (Leg Press)', category: 'legs', equipment: 'machine', primaryMuscle: '股四頭肌' },
  { id: 'ex-leg-extension', name: '機械腿屈伸 (Leg Extension)', category: 'legs', equipment: 'machine', primaryMuscle: '股四頭肌' },
  { id: 'ex-leg-curl', name: '俯臥腿後勾 (Leg Curl)', category: 'legs', equipment: 'machine', primaryMuscle: '腿後側' },
  { id: 'ex-calf-raise', name: '提踵小腿訓練 (Calf Raise)', category: 'legs', equipment: 'machine', primaryMuscle: '腓腸肌' },

  // Shoulders
  { id: 'ex-overhead-press', name: '槓鈴肩推 (Overhead Press)', category: 'shoulders', equipment: 'barbell', primaryMuscle: '前三角肌' },
  { id: 'ex-lateral-raise', name: '啞鈴側平舉 (Lateral Raise)', category: 'shoulders', equipment: 'dumbbell', primaryMuscle: '中三角肌' },
  { id: 'ex-face-pull', name: '滑輪臉拉 (Face Pull)', category: 'shoulders', equipment: 'cable', primaryMuscle: '後三角肌 / 斜方肌' },
  { id: 'ex-arnold-press', name: '阿諾推舉 (Arnold Press)', category: 'shoulders', equipment: 'dumbbell', primaryMuscle: '三角肌全方位' },

  // Arms
  { id: 'ex-barbell-curl', name: '槓鈴二頭彎舉 (Barbell Curl)', category: 'arms', equipment: 'barbell', primaryMuscle: '肱二頭肌' },
  { id: 'ex-hammer-curl', name: '啞鈴槌式彎舉 (Hammer Curl)', category: 'arms', equipment: 'dumbbell', primaryMuscle: '肱肌 / 肱橈肌' },
  { id: 'ex-tricep-pushdown', name: '滑輪三頭下壓 (Tricep Pushdown)', category: 'arms', equipment: 'cable', primaryMuscle: '肱三頭肌' },
  { id: 'ex-skull-crusher', name: '仰臥臂屈伸 (Skull Crusher)', category: 'arms', equipment: 'barbell', primaryMuscle: '肱三頭肌長頭' },

  // Core & Cardio
  { id: 'ex-hanging-leg-raise', name: '懸垂舉腿 (Hanging Leg Raise)', category: 'core', equipment: 'bodyweight', primaryMuscle: '下腹肌' },
  { id: 'ex-plank', name: '核心平板支撐 (Plank)', category: 'core', equipment: 'bodyweight', primaryMuscle: '腹橫肌' },
  { id: 'ex-ab-wheel', name: '健腹輪 (Ab Wheel Rollout)', category: 'core', equipment: 'other', primaryMuscle: '腹直肌' },
];

export const DEFAULT_ROUTINE_TEMPLATES: WorkoutRoutineTemplate[] = [
  {
    id: 'routine-ppl-push',
    title: 'PPL 推 (Push) - 胸/肩/三頭',
    category: 'PPL 專項',
    description: '專注於推力肌群，提升上肢推力容量與維度。',
    exercises: [
      { exerciseId: 'ex-bench-press', exerciseName: '槓鈴臥推 (Bench Press)', category: 'chest', targetSets: 4, targetReps: 8 },
      { exerciseId: 'ex-incline-db-press', exerciseName: '上斜啞鈴臥推 (Incline DB Press)', category: 'chest', targetSets: 3, targetReps: 10 },
      { exerciseId: 'ex-overhead-press', exerciseName: '槓鈴肩推 (Overhead Press)', category: 'shoulders', targetSets: 3, targetReps: 8 },
      { exerciseId: 'ex-lateral-raise', exerciseName: '啞鈴側平舉 (Lateral Raise)', category: 'shoulders', targetSets: 4, targetReps: 15 },
      { exerciseId: 'ex-tricep-pushdown', exerciseName: '滑輪三頭下壓 (Tricep Pushdown)', category: 'arms', targetSets: 3, targetReps: 12 },
    ]
  },
  {
    id: 'routine-ppl-pull',
    title: 'PPL 拉 (Pull) - 背/二頭/後肩',
    category: 'PPL 專項',
    description: '強化後側鏈拉力、背部寬度厚度與手臂二頭。',
    exercises: [
      { exerciseId: 'ex-deadlift', exerciseName: '標準硬舉 (Deadlift)', category: 'back', targetSets: 3, targetReps: 5 },
      { exerciseId: 'ex-pullup', exerciseName: '引體向上 (Pull-ups)', category: 'back', targetSets: 3, targetReps: 8 },
      { exerciseId: 'ex-barbell-row', exerciseName: '俯身槓鈴划船 (Barbell Row)', category: 'back', targetSets: 4, targetReps: 10 },
      { exerciseId: 'ex-face-pull', exerciseName: '滑輪臉拉 (Face Pull)', category: 'shoulders', targetSets: 3, targetReps: 15 },
      { exerciseId: 'ex-barbell-curl', exerciseName: '槓鈴二頭彎舉 (Barbell Curl)', category: 'arms', targetSets: 3, targetReps: 12 },
    ]
  },
  {
    id: 'routine-ppl-legs',
    title: 'PPL 腿 (Legs) - 深蹲/後側/核心',
    category: 'PPL 專項',
    description: '下肢動力鏈打造，高強度腿部增肌與全身合成代謝刺激。',
    exercises: [
      { exerciseId: 'ex-barbell-squat', exerciseName: '槓鈴深蹲 (Barbell Squat)', category: 'legs', targetSets: 4, targetReps: 6 },
      { exerciseId: 'ex-romanian-deadlift', exerciseName: '羅馬尼亞硬舉 (RDL)', category: 'legs', targetSets: 3, targetReps: 8 },
      { exerciseId: 'ex-leg-press', exerciseName: '機械腿推 (Leg Press)', category: 'legs', targetSets: 3, targetReps: 12 },
      { exerciseId: 'ex-hanging-leg-raise', exerciseName: '懸垂舉腿 (Hanging Leg Raise)', category: 'core', targetSets: 3, targetReps: 15 },
    ]
  },
  {
    id: 'routine-upper-body',
    title: '上半身力量分化 (Upper Body)',
    category: '上下肢分化',
    description: '高效全方位刺激上身胸、背、肩、臂，適合每週訓練 3~4 次者。',
    exercises: [
      { exerciseId: 'ex-bench-press', exerciseName: '槓鈴臥推 (Bench Press)', category: 'chest', targetSets: 4, targetReps: 8 },
      { exerciseId: 'ex-lat-pulldown', exerciseName: '滑輪下拉 (Lat Pulldown)', category: 'back', targetSets: 4, targetReps: 10 },
      { exerciseId: 'ex-overhead-press', exerciseName: '槓鈴肩推 (Overhead Press)', category: 'shoulders', targetSets: 3, targetReps: 8 },
      { exerciseId: 'ex-seated-cable-row', exerciseName: '坐姿滑輪划船 (Seated Row)', category: 'back', targetSets: 3, targetReps: 10 },
      { exerciseId: 'ex-tricep-pushdown', exerciseName: '滑輪三頭下壓 (Tricep Pushdown)', category: 'arms', targetSets: 3, targetReps: 12 },
    ]
  }
];

export const DEFAULT_FOOD_ITEMS: FoodItem[] = [
  // 蛋白質主力
  { id: 'f-chicken-breast', name: '即食舒肥雞胸肉 (100g)', calories: 120, protein: 24, carbs: 1, fat: 2, servingSize: '100g', baseWeightGrams: 100, category: 'meat' },
  { id: 'f-boiled-egg', name: '水煮全蛋 (大顆/1顆)', calories: 75, protein: 6.5, carbs: 0.6, fat: 5.2, servingSize: '1顆 (55g)', baseWeightGrams: 55, category: 'egg_dairy' },
  { id: 'f-egg-whites', name: '純蛋白液 / 蛋白丁 (100g)', calories: 50, protein: 11, carbs: 0.7, fat: 0.2, servingSize: '100g', baseWeightGrams: 100, category: 'egg_dairy' },
  { id: 'f-whey-isolate', name: '乳清蛋白粉 (分離乳清/1匙)', calories: 115, protein: 25, carbs: 1.5, fat: 0.8, servingSize: '1份 (30g)', baseWeightGrams: 30, category: 'supplement' },
  { id: 'f-beef-steak', name: '牛板腱 / 菲力牛排 (100g)', calories: 145, protein: 22, carbs: 0, fat: 6, servingSize: '100g', baseWeightGrams: 100, category: 'meat' },
  { id: 'f-salmon', name: '香煎大西洋鮭魚 (100g)', calories: 206, protein: 22, carbs: 0, fat: 12.5, servingSize: '100g', baseWeightGrams: 100, category: 'meat' },
  { id: 'f-canned-tuna', name: '水煮鮪魚罐頭 (100g瀝乾)', calories: 105, protein: 24, carbs: 0, fat: 0.8, servingSize: '100g', baseWeightGrams: 100, category: 'meat' },
  { id: 'f-greek-yogurt', name: '無糖希臘式優格 (100g)', calories: 60, protein: 10, carbs: 3.8, fat: 0.4, servingSize: '100g', baseWeightGrams: 100, category: 'egg_dairy' },
  { id: 'f-tofu', name: '傳統板豆腐 (100g)', calories: 88, protein: 8.5, carbs: 1.5, fat: 5.2, servingSize: '100g', baseWeightGrams: 100, category: 'staple' },
  { id: 'f-soy-milk', name: '無糖高纖豆漿 (1瓶/400ml)', calories: 135, protein: 14.5, carbs: 7.2, fat: 5.5, servingSize: '400ml', baseWeightGrams: 400, category: 'egg_dairy' },

  // 優質碳水化合物
  { id: 'f-sweet-potato', name: '蒸地瓜 / 烤番薯 (中條)', calories: 140, protein: 2.2, carbs: 33, fat: 0.3, servingSize: '1條 (約120g)', baseWeightGrams: 120, category: 'staple' },
  { id: 'f-white-rice', name: '熟白米飯 (半碗/100g)', calories: 142, protein: 2.7, carbs: 31.5, fat: 0.4, servingSize: '100g', baseWeightGrams: 100, category: 'staple' },
  { id: 'f-brown-rice', name: '糙米黑米飯 (100g)', calories: 130, protein: 3.1, carbs: 28, fat: 1.1, servingSize: '100g', baseWeightGrams: 100, category: 'staple' },
  { id: 'f-oats', name: '原味大燕麥片 (乾重40g)', calories: 152, protein: 5.2, carbs: 26.5, fat: 2.8, servingSize: '40g', baseWeightGrams: 40, category: 'staple' },
  { id: 'f-banana', name: '練前香蕉 (中等大小/1根)', calories: 105, protein: 1.3, carbs: 27, fat: 0.3, servingSize: '1根 (118g)', baseWeightGrams: 118, category: 'staple' },

  // 蔬菜與健康油脂
  { id: 'f-broccoli', name: '川燙綠花椰菜 (1碗/100g)', calories: 34, protein: 2.8, carbs: 6.6, fat: 0.4, servingSize: '100g', baseWeightGrams: 100, category: 'veggie' },
  { id: 'f-avocado', name: '熟酪梨 (1/4顆/50g)', calories: 80, protein: 1, carbs: 4.2, fat: 7.3, servingSize: '50g', baseWeightGrams: 50, category: 'other' },
  { id: 'f-almonds', name: '原味堅果杏仁 (1小把/15g)', calories: 90, protein: 3.1, carbs: 3.2, fat: 7.8, servingSize: '15g', baseWeightGrams: 15, category: 'other' },
];

export const INITIAL_USER_PROFILES: UserProfile[] = [
  {
    id: 'user-default-1',
    name: 'Shawn (隊長)',
    avatar: '🏋️‍♂️',
    gender: 'male',
    age: 28,
    heightCm: 178,
    weightKg: 75,
    activityLevel: 'moderate',
    goal: 'gain_muscle',
    customCalories: 2650,
    customProteinGrams: 165,
    customCarbsGrams: 310,
    customFatGrams: 75,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user-default-2',
    name: 'Emily (減脂夥伴)',
    avatar: '🏃‍♀️',
    gender: 'female',
    age: 26,
    heightCm: 163,
    weightKg: 54,
    activityLevel: 'light',
    goal: 'lose_fat',
    customCalories: 1550,
    customProteinGrams: 110,
    customCarbsGrams: 165,
    customFatGrams: 45,
    createdAt: new Date().toISOString(),
  }
];
