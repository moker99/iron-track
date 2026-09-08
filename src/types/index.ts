export type Gender = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very_active' | 'extra_active';
export type FitnessGoal = 'lose_fat' | 'maintain' | 'gain_muscle';
export type UserRole = 'admin' | 'member';

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  gender: Gender;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: FitnessGoal;
  role?: UserRole;
  customCalories?: number;
  customProteinGrams?: number;
  customCarbsGrams?: number;
  customFatGrams?: number;
  targetWeightKg?: number;
  createdAt: string;
}

export type ExerciseCategory = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'cardio';
export type EquipmentType = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'other';

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  equipment: EquipmentType;
  primaryMuscle: string;
  notes?: string;
  isCustom?: boolean;
}

export interface WorkoutSet {
  id: string;
  setNumber: number;
  weightKg: number;
  reps: number;
  rpe?: number;
  completed: boolean;
  isWarmup?: boolean;
}

export interface WorkoutExerciseLog {
  exerciseId: string;
  exerciseName: string;
  category: ExerciseCategory;
  sets: WorkoutSet[];
}

export interface WorkoutSession {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // ISO or HH:mm
  endTime?: string;
  durationMinutes?: number; // 訓練時長 (分鐘)
  caloriesBurned?: number;  // 本次訓練消耗卡路里 (kcal)
  routineTitle: string;
  exercises: WorkoutExerciseLog[];
  totalVolumeKg: number;
  totalSets: number;
  notes?: string;
}

export interface WorkoutRoutineTemplate {
  id: string;
  title: string;
  category: string;
  description: string;
  exercises: {
    exerciseId: string;
    exerciseName: string;
    category: ExerciseCategory;
    targetSets: number;
    targetReps: number;
  }[];
  userId?: string;
  isCustom?: boolean;
  createdAt?: string;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type FoodCategory = 'meat' | 'staple' | 'egg_dairy' | 'veggie' | 'supplement' | 'other';

export interface FoodItem {
  id: string;
  name: string;
  calories: number; // kcal per serving
  protein: number;  // g
  carbs: number;    // g
  fat: number;      // g
  servingSize: string; // e.g. "100g", "1份", "1匙"
  baseWeightGrams?: number; // 基底公克數 (例: 100 代表此份量為 100g，便於依克數秤重精確換算)
  category: FoodCategory;
  isCustom?: boolean;
}

export interface MealEntry {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  mealType: MealType;
  foodName: string;
  servings: number;
  servingUnit: string;
  weightGrams?: number; // 實際吃下的克數 (g)
  inputMode?: 'grams' | 'servings';
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  createdAt: string;
}

export interface DailyNutritionSummary {
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
}

export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  maxWeightKg: number;
  maxReps: number;
  estimatedOneRepMax: number;
  date: string;
}

export interface CloudConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  syncEnabled: boolean;
  lastSyncedAt?: string;
}
