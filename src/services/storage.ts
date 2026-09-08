import type {
  CloudConfig,
  Exercise,
  FoodItem,
  MealEntry,
  PersonalRecord,
  UserProfile,
  WorkoutRoutineTemplate,
  WorkoutSession,
} from '../types';
import {
  DEFAULT_EXERCISES,
  DEFAULT_FOOD_ITEMS,
  DEFAULT_ROUTINE_TEMPLATES,
  INITIAL_USER_PROFILES,
} from '../data/defaults';
import { calculate1RM } from '../utils/nutrition';

const STORAGE_KEYS = {
  PROFILES: 'irontrack_profiles',
  ACTIVE_PROFILE_ID: 'irontrack_active_profile_id',
  MEAL_LOGS: 'irontrack_meal_logs',
  WORKOUT_SESSIONS: 'irontrack_workout_sessions',
  CUSTOM_EXERCISES: 'irontrack_custom_exercises',
  CUSTOM_FOODS: 'irontrack_custom_foods',
  CUSTOM_ROUTINES: 'irontrack_custom_routines',
  CLOUD_CONFIG: 'irontrack_cloud_config',
};

export class StorageService {
  // ==================== 多使用者 (Profiles) 管理 ====================
  static getProfiles(): UserProfile[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROFILES);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(INITIAL_USER_PROFILES));
        return INITIAL_USER_PROFILES;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_USER_PROFILES;
    }
  }

  static getActiveProfileId(): string {
    const id = localStorage.getItem(STORAGE_KEYS.ACTIVE_PROFILE_ID);
    if (id) return id;
    const profiles = this.getProfiles();
    const defaultId = profiles[0]?.id || 'user-default-1';
    localStorage.setItem(STORAGE_KEYS.ACTIVE_PROFILE_ID, defaultId);
    return defaultId;
  }

  static setActiveProfileId(id: string): void {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_PROFILE_ID, id);
  }

  static getActiveProfile(): UserProfile {
    const profiles = this.getProfiles();
    const activeId = this.getActiveProfileId();
    return profiles.find(p => p.id === activeId) || profiles[0] || INITIAL_USER_PROFILES[0];
  }

  static saveProfile(profile: UserProfile): void {
    const profiles = this.getProfiles();
    const index = profiles.findIndex(p => p.id === profile.id);
    if (index >= 0) {
      profiles[index] = profile;
    } else {
      profiles.push(profile);
    }
    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
  }

  static deleteProfile(profileId: string): void {
    const profiles = this.getProfiles().filter(p => p.id !== profileId);
    if (profiles.length === 0) return; // 保留至少一個
    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
    if (this.getActiveProfileId() === profileId) {
      this.setActiveProfileId(profiles[0].id);
    }
  }

  // ==================== 飲食記錄 (Meal Logs) 管理 ====================
  static getMealLogs(userId?: string): MealEntry[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MEAL_LOGS);
      const all: MealEntry[] = data ? JSON.parse(data) : [];
      if (!userId) return all;
      return all.filter(m => m.userId === userId);
    } catch {
      return [];
    }
  }

  static getMealsByDate(userId: string, date: string): MealEntry[] {
    return this.getMealLogs(userId).filter(m => m.date === date);
  }

  static addMealEntry(entry: MealEntry): void {
    const all = this.getMealLogs();
    all.unshift(entry);
    localStorage.setItem(STORAGE_KEYS.MEAL_LOGS, JSON.stringify(all));
  }

  static deleteMealEntry(id: string): void {
    const all = this.getMealLogs().filter(m => m.id !== id);
    localStorage.setItem(STORAGE_KEYS.MEAL_LOGS, JSON.stringify(all));
  }

  // ==================== 訓練紀錄 (Workout Sessions) 管理 ====================
  static getWorkoutSessions(userId?: string): WorkoutSession[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.WORKOUT_SESSIONS);
      const all: WorkoutSession[] = data ? JSON.parse(data) : [];
      if (!userId) return all;
      return all.filter(s => s.userId === userId);
    } catch {
      return [];
    }
  }

  static addWorkoutSession(session: WorkoutSession): void {
    const all = this.getWorkoutSessions();
    all.unshift(session);
    localStorage.setItem(STORAGE_KEYS.WORKOUT_SESSIONS, JSON.stringify(all));
  }

  static deleteWorkoutSession(id: string): void {
    const all = this.getWorkoutSessions().filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.WORKOUT_SESSIONS, JSON.stringify(all));
  }

  /**
   * 計算個人最佳紀錄 (Personal Records)
   */
  static getPersonalRecords(userId: string): PersonalRecord[] {
    const sessions = this.getWorkoutSessions(userId);
    const prMap = new Map<string, PersonalRecord>();

    sessions.forEach(session => {
      session.exercises.forEach(ex => {
        ex.sets.forEach(set => {
          if (!set.completed || set.weightKg <= 0 || set.reps <= 0) return;
          const e1rm = calculate1RM(set.weightKg, set.reps);
          const current = prMap.get(ex.exerciseId);

          if (!current || e1rm > current.estimatedOneRepMax) {
            prMap.set(ex.exerciseId, {
              exerciseId: ex.exerciseId,
              exerciseName: ex.exerciseName,
              maxWeightKg: set.weightKg,
              maxReps: set.reps,
              estimatedOneRepMax: e1rm,
              date: session.date,
            });
          }
        });
      });
    });

    return Array.from(prMap.values());
  }

  // ==================== 食物庫與動作庫擴充 ====================
  static getAllExercises(): Exercise[] {
    try {
      const custom = localStorage.getItem(STORAGE_KEYS.CUSTOM_EXERCISES);
      const customList: Exercise[] = custom ? JSON.parse(custom) : [];
      return [...DEFAULT_EXERCISES, ...customList];
    } catch {
      return DEFAULT_EXERCISES;
    }
  }

  static addCustomExercise(exercise: Exercise): void {
    try {
      const custom = localStorage.getItem(STORAGE_KEYS.CUSTOM_EXERCISES);
      const customList: Exercise[] = custom ? JSON.parse(custom) : [];
      customList.push(exercise);
      localStorage.setItem(STORAGE_KEYS.CUSTOM_EXERCISES, JSON.stringify(customList));
    } catch (e) {
      console.error(e);
    }
  }

  static getAllFoods(): FoodItem[] {
    try {
      const custom = localStorage.getItem(STORAGE_KEYS.CUSTOM_FOODS);
      const customList: FoodItem[] = custom ? JSON.parse(custom) : [];
      return [...DEFAULT_FOOD_ITEMS, ...customList];
    } catch {
      return DEFAULT_FOOD_ITEMS;
    }
  }

  static addCustomFood(food: FoodItem): void {
    try {
      const custom = localStorage.getItem(STORAGE_KEYS.CUSTOM_FOODS);
      const customList: FoodItem[] = custom ? JSON.parse(custom) : [];
      customList.push(food);
      localStorage.setItem(STORAGE_KEYS.CUSTOM_FOODS, JSON.stringify(customList));
    } catch (e) {
      console.error(e);
    }
  }

  // ==================== 課表模板 (Workout Routine Templates) 管理 ====================
  static getAllRoutines(): WorkoutRoutineTemplate[] {
    try {
      const custom = localStorage.getItem(STORAGE_KEYS.CUSTOM_ROUTINES);
      const customList: WorkoutRoutineTemplate[] = custom ? JSON.parse(custom) : [];
      return [...DEFAULT_ROUTINE_TEMPLATES, ...customList];
    } catch {
      return DEFAULT_ROUTINE_TEMPLATES;
    }
  }

  static addCustomRoutine(routine: WorkoutRoutineTemplate): void {
    try {
      const custom = localStorage.getItem(STORAGE_KEYS.CUSTOM_ROUTINES);
      const customList: WorkoutRoutineTemplate[] = custom ? JSON.parse(custom) : [];
      customList.push(routine);
      localStorage.setItem(STORAGE_KEYS.CUSTOM_ROUTINES, JSON.stringify(customList));
    } catch (e) {
      console.error(e);
    }
  }

  static deleteCustomRoutine(id: string): void {
    try {
      const custom = localStorage.getItem(STORAGE_KEYS.CUSTOM_ROUTINES);
      const customList: WorkoutRoutineTemplate[] = custom ? JSON.parse(custom) : [];
      const filtered = customList.filter(r => r.id !== id);
      localStorage.setItem(STORAGE_KEYS.CUSTOM_ROUTINES, JSON.stringify(filtered));
    } catch (e) {
      console.error(e);
    }
  }

  // ==================== 雲端設定 (Supabase Cloud Config) ====================
  static getCloudConfig(): CloudConfig {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CLOUD_CONFIG);
      return data ? JSON.parse(data) : { supabaseUrl: '', supabaseAnonKey: '', syncEnabled: false };
    } catch {
      return { supabaseUrl: '', supabaseAnonKey: '', syncEnabled: false };
    }
  }

  static saveCloudConfig(config: CloudConfig): void {
    localStorage.setItem(STORAGE_KEYS.CLOUD_CONFIG, JSON.stringify(config));
  }

  // ==================== 資料備份與還原 (JSON Export / Import) ====================
  static exportFullBackup(): string {
    const backup = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      profiles: this.getProfiles(),
      activeProfileId: this.getActiveProfileId(),
      mealLogs: this.getMealLogs(),
      workoutSessions: this.getWorkoutSessions(),
      customRoutines: localStorage.getItem(STORAGE_KEYS.CUSTOM_ROUTINES) ? JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOM_ROUTINES)!) : [],
      customExercises: localStorage.getItem(STORAGE_KEYS.CUSTOM_EXERCISES) ? JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOM_EXERCISES)!) : [],
      customFoods: localStorage.getItem(STORAGE_KEYS.CUSTOM_FOODS) ? JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOM_FOODS)!) : [],
    };
    return JSON.stringify(backup, null, 2);
  }

  static importFullBackup(jsonString: string): boolean {
    try {
      const backup = JSON.parse(jsonString);
      if (backup.profiles && Array.isArray(backup.profiles)) {
        localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(backup.profiles));
      }
      if (backup.activeProfileId) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_PROFILE_ID, backup.activeProfileId);
      }
      if (backup.mealLogs && Array.isArray(backup.mealLogs)) {
        localStorage.setItem(STORAGE_KEYS.MEAL_LOGS, JSON.stringify(backup.mealLogs));
      }
      if (backup.workoutSessions && Array.isArray(backup.workoutSessions)) {
        localStorage.setItem(STORAGE_KEYS.WORKOUT_SESSIONS, JSON.stringify(backup.workoutSessions));
      }
      if (backup.customRoutines) {
        localStorage.setItem(STORAGE_KEYS.CUSTOM_ROUTINES, JSON.stringify(backup.customRoutines));
      }
      if (backup.customExercises) {
        localStorage.setItem(STORAGE_KEYS.CUSTOM_EXERCISES, JSON.stringify(backup.customExercises));
      }
      if (backup.customFoods) {
        localStorage.setItem(STORAGE_KEYS.CUSTOM_FOODS, JSON.stringify(backup.customFoods));
      }
      return true;
    } catch (e) {
      console.error('Failed to import backup:', e);
      return false;
    }
  }

  static resetToDefault(): void {
    localStorage.clear();
  }
}
