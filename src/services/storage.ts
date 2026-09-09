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
  INITIAL_USER_PROFILES,
} from '../data/defaults';
import { calculate1RM } from '../utils/nutrition';
import {
  SupabaseSyncService,
  getCloudConfig,
  saveCloudConfig,
} from './supabase';

export const STORAGE_KEYS = {
  PROFILES: 'irontrack_profiles',
  ACTIVE_PROFILE_ID: 'irontrack_active_profile_id',
  AUTH_PROFILE_ID: 'irontrack_auth_profile_id',
  MEAL_LOGS: 'irontrack_meal_logs',
  WORKOUT_SESSIONS: 'irontrack_workout_sessions',
  CUSTOM_EXERCISES: 'irontrack_custom_exercises',
  CUSTOM_FOODS: 'irontrack_custom_foods',
  CUSTOM_ROUTINES: 'irontrack_custom_routines',
  CLOUD_CONFIG: 'irontrack_cloud_config',
  // Session storage key: 管理員本次登入後免密碼切換 (關閉分頁後自動清除)
  ADMIN_SESSION: 'irontrack_admin_session_unlocked',
};

export class StorageService {
  // ==================== 認證與登入狀態管理 ====================
  static getAuthenticatedProfileId(): string | null {
    return localStorage.getItem(STORAGE_KEYS.AUTH_PROFILE_ID);
  }

  static setAuthenticatedProfileId(id: string | null): void {
    if (id) {
      localStorage.setItem(STORAGE_KEYS.AUTH_PROFILE_ID, id);
      this.setActiveProfileId(id);
    } else {
      localStorage.removeItem(STORAGE_KEYS.AUTH_PROFILE_ID);
      // 登出時也清除管理員 session 暫存
      this.clearAdminSessionUnlock();
    }
  }

  /**
   * 管理員 Session 解鎖：
   * Admin 登入後，本次瀏覽 session 內切換任何成員均免密碼驗證。
   * 使用 sessionStorage：關閉分頁/瀏覽器後自動清除，安全又方便。
   */
  static isAdminSessionUnlocked(): boolean {
    return sessionStorage.getItem(STORAGE_KEYS.ADMIN_SESSION) === 'true';
  }

  static setAdminSessionUnlocked(unlocked: boolean): void {
    if (unlocked) {
      sessionStorage.setItem(STORAGE_KEYS.ADMIN_SESSION, 'true');
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION);
    }
  }

  static clearAdminSessionUnlock(): void {
    sessionStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION);
  }

  static verifyPassword(profileId: string, inputPass: string): boolean {
    const profiles = this.getProfiles();
    const target = profiles.find(p => p.id === profileId);
    if (!target) return false;
    const expected = target.password || target.pinCode || (target.role === 'admin' ? '8888' : '1234');
    return inputPass.trim() === expected.trim();
  }

  static verifyPin(profileId: string, pin: string): boolean {
    return this.verifyPassword(profileId, pin);
  }

  // ==================== 多使用者 (Profiles) 管理 ====================
  static getProfiles(): UserProfile[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROFILES);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(INITIAL_USER_PROFILES));
        return INITIAL_USER_PROFILES;
      }
      const parsed: UserProfile[] = JSON.parse(data);
      // 自動將舊的 user-shawn-admin 統一遷移至 user-shawn
      let modified = false;
      const normalized = parsed.map(p => {
        if (p.id === 'user-shawn-admin') {
          modified = true;
          return { ...p, id: 'user-shawn' };
        }
        return p;
      });
      if (modified) {
        localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(normalized));
        if (localStorage.getItem(STORAGE_KEYS.ACTIVE_PROFILE_ID) === 'user-shawn-admin') {
          this.setActiveProfileId('user-shawn');
        }
      }
      return normalized;
    } catch {
      return INITIAL_USER_PROFILES;
    }
  }

  static getActiveProfileId(): string {
    const authId = this.getAuthenticatedProfileId();
    if (authId) {
      if (authId === 'user-shawn-admin') {
        this.setAuthenticatedProfileId('user-shawn');
        return 'user-shawn';
      }
      return authId;
    }
    const id = localStorage.getItem(STORAGE_KEYS.ACTIVE_PROFILE_ID);
    if (id) {
      if (id === 'user-shawn-admin') {
        this.setActiveProfileId('user-shawn');
        return 'user-shawn';
      }
      return id;
    }
    const profiles = this.getProfiles();
    const defaultId = profiles[0]?.id || 'user-shawn';
    localStorage.setItem(STORAGE_KEYS.ACTIVE_PROFILE_ID, defaultId);
    return defaultId;
  }

  static setActiveProfileId(id: string): void {
    const normalized = id === 'user-shawn-admin' ? 'user-shawn' : id;
    localStorage.setItem(STORAGE_KEYS.ACTIVE_PROFILE_ID, normalized);
  }

  static getActiveProfile(): UserProfile {
    const profiles = this.getProfiles();
    const activeId = this.getActiveProfileId();
    return profiles.find(p => p.id === activeId) || profiles[0] || INITIAL_USER_PROFILES[0];
  }

  static saveProfile(profile: UserProfile): void {
    const normalizedProfile: UserProfile = {
      ...profile,
      id: profile.id === 'user-shawn-admin' ? 'user-shawn' : profile.id,
    };
    const profiles = this.getProfiles();
    const index = profiles.findIndex(p => p.id === normalizedProfile.id);
    if (index >= 0) {
      profiles[index] = normalizedProfile;
    } else {
      profiles.push(normalizedProfile);
    }
    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
    // 雲端即時同步
    SupabaseSyncService.pushProfile(normalizedProfile);
  }

  static deleteProfile(profileId: string): void {
    const normalizedId = profileId === 'user-shawn-admin' ? 'user-shawn' : profileId;
    const profiles = this.getProfiles().filter(p => p.id !== normalizedId);
    if (profiles.length === 0) return; // 保留至少一個
    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
    if (this.getActiveProfileId() === normalizedId) {
      this.setActiveProfileId(profiles[0].id);
    }
    // 雲端即時同步
    SupabaseSyncService.deleteProfile(normalizedId);
  }

  // ==================== 飲食記錄 (Meal Logs) 管理 ====================
  static getMealLogs(userId?: string): MealEntry[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MEAL_LOGS);
      let all: MealEntry[] = data ? JSON.parse(data) : [];
      let modified = false;
      all = all.map(m => {
        if (m.userId === 'user-shawn-admin') {
          modified = true;
          return { ...m, userId: 'user-shawn' };
        }
        return m;
      });
      if (modified) {
        localStorage.setItem(STORAGE_KEYS.MEAL_LOGS, JSON.stringify(all));
      }
      if (!userId) return all;
      const targetUserId = userId === 'user-shawn-admin' ? 'user-shawn' : userId;
      return all.filter(m => m.userId === targetUserId);
    } catch {
      return [];
    }
  }

  static getMealsByDate(userId: string, date: string): MealEntry[] {
    const targetUserId = userId === 'user-shawn-admin' ? 'user-shawn' : userId;
    return this.getMealLogs(targetUserId).filter(m => m.date === date);
  }

  static addMealEntry(entry: MealEntry): void {
    const normalizedEntry: MealEntry = {
      ...entry,
      userId: entry.userId === 'user-shawn-admin' ? 'user-shawn' : entry.userId,
    };
    const all = this.getMealLogs();
    all.unshift(normalizedEntry);
    localStorage.setItem(STORAGE_KEYS.MEAL_LOGS, JSON.stringify(all));
    // 雲端即時同步
    SupabaseSyncService.pushMealEntry(normalizedEntry);
  }

  static updateMealEntry(entry: MealEntry): void {
    const normalizedEntry: MealEntry = {
      ...entry,
      userId: entry.userId === 'user-shawn-admin' ? 'user-shawn' : entry.userId,
    };
    const all = this.getMealLogs().map(m => m.id === entry.id ? normalizedEntry : m);
    localStorage.setItem(STORAGE_KEYS.MEAL_LOGS, JSON.stringify(all));
    // 雲端即時同步
    SupabaseSyncService.pushMealEntry(normalizedEntry);
  }

  static deleteMealEntry(id: string): void {
    const all = this.getMealLogs().filter(m => m.id !== id);
    localStorage.setItem(STORAGE_KEYS.MEAL_LOGS, JSON.stringify(all));
    // 雲端即時同步
    SupabaseSyncService.deleteMealEntry(id);
  }

  // ==================== 訓練紀錄 (Workout Sessions) 管理 ====================
  static getWorkoutSessions(userId?: string): WorkoutSession[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.WORKOUT_SESSIONS);
      let all: WorkoutSession[] = data ? JSON.parse(data) : [];
      let modified = false;
      all = all.map(s => {
        if (s.userId === 'user-shawn-admin') {
          modified = true;
          return { ...s, userId: 'user-shawn' };
        }
        return s;
      });
      if (modified) {
        localStorage.setItem(STORAGE_KEYS.WORKOUT_SESSIONS, JSON.stringify(all));
      }
      if (!userId) return all;
      const targetUserId = userId === 'user-shawn-admin' ? 'user-shawn' : userId;
      return all.filter(s => s.userId === targetUserId);
    } catch {
      return [];
    }
  }

  static addWorkoutSession(session: WorkoutSession): void {
    const normalized: WorkoutSession = {
      ...session,
      userId: session.userId === 'user-shawn-admin' ? 'user-shawn' : session.userId,
    };
    const all = this.getWorkoutSessions();
    all.unshift(normalized);
    localStorage.setItem(STORAGE_KEYS.WORKOUT_SESSIONS, JSON.stringify(all));
    // 雲端即時同步
    SupabaseSyncService.pushWorkoutSession(normalized);
  }

  static deleteWorkoutSession(id: string): void {
    const all = this.getWorkoutSessions().filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.WORKOUT_SESSIONS, JSON.stringify(all));
    // 雲端即時同步
    SupabaseSyncService.deleteWorkoutSession(id);
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
          const currentPr = prMap.get(ex.exerciseId);

          if (!currentPr || e1rm > currentPr.estimatedOneRepMax) {
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
      // 雲端即時同步 (標記建立者)
      SupabaseSyncService.pushCustomExercise(exercise, this.getActiveProfileId());
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
      // 雲端即時同步 (標記建立者)
      SupabaseSyncService.pushCustomFood(food, this.getActiveProfileId());
    } catch (e) {
      console.error(e);
    }
  }

  static updateCustomFood(food: FoodItem): void {
    try {
      const custom = localStorage.getItem(STORAGE_KEYS.CUSTOM_FOODS);
      const customList: FoodItem[] = custom ? JSON.parse(custom) : [];
      const updatedList = customList.map(f => f.id === food.id ? food : f);
      localStorage.setItem(STORAGE_KEYS.CUSTOM_FOODS, JSON.stringify(updatedList));
      // 雲端即時同步
      SupabaseSyncService.pushCustomFood(food, this.getActiveProfileId());
    } catch (e) {
      console.error(e);
    }
  }

  static deleteCustomFood(foodId: string): void {
    try {
      const custom = localStorage.getItem(STORAGE_KEYS.CUSTOM_FOODS);
      const customList: FoodItem[] = custom ? JSON.parse(custom) : [];
      const updatedList = customList.filter(f => f.id !== foodId);
      localStorage.setItem(STORAGE_KEYS.CUSTOM_FOODS, JSON.stringify(updatedList));
    } catch (e) {
      console.error(e);
    }
  }

  // ==================== 課表模板 (Workout Routine Templates) 管理 ====================
  static getAllRoutines(): WorkoutRoutineTemplate[] {
    try {
      const custom = localStorage.getItem(STORAGE_KEYS.CUSTOM_ROUTINES);
      const customList: WorkoutRoutineTemplate[] = custom ? JSON.parse(custom) : [];
      return customList;
    } catch {
      return [];
    }
  }

  static getRawCustomRoutines(): WorkoutRoutineTemplate[] {
    return this.getAllRoutines();
  }

  static addCustomRoutine(routine: WorkoutRoutineTemplate): void {
    try {
      const custom = localStorage.getItem(STORAGE_KEYS.CUSTOM_ROUTINES);
      const customList: WorkoutRoutineTemplate[] = custom ? JSON.parse(custom) : [];
      customList.push(routine);
      localStorage.setItem(STORAGE_KEYS.CUSTOM_ROUTINES, JSON.stringify(customList));
      // 雲端即時同步
      SupabaseSyncService.pushRoutineTemplate(routine);
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
      // 雲端即時同步
      SupabaseSyncService.deleteRoutineTemplate(id);
    } catch (e) {
      console.error(e);
    }
  }

  // ==================== 雲端設定 (Supabase Cloud Config) ====================
  static getCloudConfig(): CloudConfig {
    return getCloudConfig();
  }

  static saveCloudConfig(config: CloudConfig): void {
    saveCloudConfig(config);
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
