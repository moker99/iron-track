import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  CloudConfig,
  Exercise,
  FoodItem,
  MealEntry,
  UserProfile,
  WeightEntry,
  WorkoutRoutineTemplate,
  WorkoutSession,
} from '../types';
import { INITIAL_USER_PROFILES } from '../data/defaults';

let supabaseClient: SupabaseClient | null = null;

const STORAGE_KEYS = {
  PROFILES: 'irontrack_profiles',
  ACTIVE_PROFILE_ID: 'irontrack_active_profile_id',
  MEAL_LOGS: 'irontrack_meal_logs',
  WORKOUT_SESSIONS: 'irontrack_workout_sessions',
  CUSTOM_EXERCISES: 'irontrack_custom_exercises',
  CUSTOM_FOODS: 'irontrack_custom_foods',
  CUSTOM_ROUTINES: 'irontrack_custom_routines',
  CLOUD_CONFIG: 'irontrack_cloud_config',
  WEIGHT_ENTRIES: 'irontrack_weight_entries',
};

/**
 * 取得當前 Supabase 雲端設定（優先讀取 LocalStorage 手動設定，若無則讀取 .env 環境變數）
 */
export function getCloudConfig(): CloudConfig {
  try {
    const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
    const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

    const data = localStorage.getItem(STORAGE_KEYS.CLOUD_CONFIG);
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed.supabaseUrl && parsed.supabaseAnonKey) {
        return {
          ...parsed,
          syncEnabled: parsed.syncEnabled !== false,
        };
      }
    }
    return {
      supabaseUrl: envUrl,
      supabaseAnonKey: envKey,
      syncEnabled: Boolean(envUrl && envKey),
    };
  } catch {
    return { supabaseUrl: '', supabaseAnonKey: '', syncEnabled: false };
  }
}

export function saveCloudConfig(config: CloudConfig): void {
  localStorage.setItem(STORAGE_KEYS.CLOUD_CONFIG, JSON.stringify(config));
  resetSupabaseClient();
}

export function getSupabaseClient(): SupabaseClient | null {
  const config = getCloudConfig();
  if (!config.supabaseUrl || !config.supabaseAnonKey || !config.syncEnabled) {
    return null;
  }

  if (!supabaseClient) {
    try {
      supabaseClient = createClient(config.supabaseUrl, config.supabaseAnonKey);
    } catch (e) {
      console.error('Failed to init Supabase client:', e);
      return null;
    }
  }

  return supabaseClient;
}

export function resetSupabaseClient(): void {
  supabaseClient = null;
}

export async function testSupabaseConnection(url: string, anonKey: string): Promise<{ success: boolean; message: string }> {
  try {
    const client = createClient(url, anonKey);
    const { error } = await client.from('profiles').select('id').limit(1);
    if (error) {
      // 若資料表不存在或是權限問題
      if (error.code === '42P01') {
        return {
          success: true,
          message: '已成功連線至專案，但尚未執行 SQL 建表指令！請複製下方 SQL 語法至 Supabase SQL Editor 執行。'
        };
      }
      return { success: false, message: `認證錯誤: ${error.message} (${error.code})` };
    }
    return { success: true, message: '🎉 成功連線至 Supabase 雲端後端，資料表已就緒！' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, message: `連線失敗: ${message}` };
  }
}

/**
 * Supabase 雲端即時雙向同步服務
 */
export class SupabaseSyncService {
  /**
   * 從 Supabase 下載並同步全部資料至本機 LocalStorage 快取
   */
  static async syncAllFromCloud(): Promise<{ success: boolean; message: string }> {
    const client = getSupabaseClient();
    if (!client) {
      return { success: false, message: 'Supabase 尚未連線或未啟用雲端設定' };
    }

    try {
      // 1. 取得 Profiles：完全以 SQL 為準！SQL 有什麼就抓什麼，絕不自動新增或回推成員，只要確保有 admin 管理者即可
      const { data: cloudProfiles, error: profileErr } = await client
        .from('profiles')
        .select('*');

      if (!profileErr && cloudProfiles) {
        if (cloudProfiles.length === 0) {
          // 若 SQL 完全為空，才寫入預設的 Admin 管理者
          await this.seedInitialProfiles(client);
          localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(INITIAL_USER_PROFILES));
        } else {
          const mappedProfiles: UserProfile[] = cloudProfiles.map((p: any) => ({
            id: p.id === 'user-shawn-admin' ? 'user-shawn' : p.id,
            name: p.name,
            avatar: p.avatar || '🏋️',
            gender: p.gender || 'male',
            age: Number(p.age) || 25,
            heightCm: Number(p.height_cm) || 175,
            weightKg: Number(p.weight_kg) || 72,
            activityLevel: p.activity_level || 'moderate',
            goal: p.goal || 'maintain',
            role: p.role || (p.id === 'user-shawn' ? 'admin' : 'member'),
            password: p.password || p.pin_code || (p.role === 'admin' ? '8888' : '1234'),
            pinCode: p.password || p.pin_code || (p.role === 'admin' ? '8888' : '1234'),
            dietProtocol: p.diet_protocol || 'standard',
            carbCyclingPhase: p.carb_cycling_phase || 'baseline',
            sprintStartDate: p.sprint_start_date || undefined,
            sprintManualDay: p.sprint_manual_day ? Number(p.sprint_manual_day) : undefined,
            weeklyTrainingHours: p.weekly_training_hours || '4-5',
            threeMonthsStartDate: p.three_months_start_date || undefined,
            threeMonthsManualWeek: p.three_months_manual_week ? Number(p.three_months_manual_week) : undefined,
            customCalories: p.custom_calories ? Number(p.custom_calories) : undefined,
            customProteinGrams: p.custom_protein_grams ? Number(p.custom_protein_grams) : undefined,
            customCarbsGrams: p.custom_carbs_grams ? Number(p.custom_carbs_grams) : undefined,
            customFatGrams: p.custom_fat_grams ? Number(p.custom_fat_grams) : undefined,
            targetWeightKg: p.target_weight_kg ? Number(p.target_weight_kg) : undefined,
            createdAt: p.created_at || new Date().toISOString(),
          }));

          // 去重（依名稱防止重複）
          const uniqueCloudProfiles: UserProfile[] = [];
          const seen = new Set<string>();
          for (const cp of mappedProfiles) {
            const key = cp.name.trim().toLowerCase();
            if (!seen.has(key)) {
              seen.add(key);
              uniqueCloudProfiles.push(cp);
            }
          }

          // 只要確保有 admin 管理者就好
          const hasAdmin = uniqueCloudProfiles.some(p => p.role === 'admin' || p.id === 'user-shawn');
          if (!hasAdmin) {
            uniqueCloudProfiles.unshift(INITIAL_USER_PROFILES[0]);
          }

          // 直接存入 localStorage 快取供前端使用，完全不回推、不新增任何成員至 SQL！
          localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(uniqueCloudProfiles));

          // 若當前選中的 Profile ID 已不存在，自動切換至第一位可用成員
          const activeId = localStorage.getItem(STORAGE_KEYS.ACTIVE_PROFILE_ID);
          if (!activeId || !uniqueCloudProfiles.some(p => p.id === activeId)) {
            localStorage.setItem(STORAGE_KEYS.ACTIVE_PROFILE_ID, uniqueCloudProfiles[0]?.id || 'user-shawn');
          }
        }
      }

      // 2. 同步 Meal Entries
      const { data: cloudMeals, error: mealErr } = await client
        .from('meal_entries')
        .select('*');

      if (!mealErr && cloudMeals) {
        const mappedMeals: MealEntry[] = cloudMeals.map((m: any) => ({
          id: m.id,
          userId: m.user_id,
          date: m.date,
          mealType: m.meal_type,
          foodName: m.food_name,
          servings: Number(m.servings),
          servingUnit: m.serving_unit || '份',
          weightGrams: m.weight_grams ? Number(m.weight_grams) : undefined,
          inputMode: m.input_mode || 'grams',
          calories: Number(m.calories),
          protein: Number(m.protein),
          carbs: Number(m.carbs),
          fat: Number(m.fat),
          createdAt: m.created_at || new Date().toISOString(),
        }));

        // 安全合併：永不以空雲端清空本地記錄
        const localRaw = localStorage.getItem(STORAGE_KEYS.MEAL_LOGS);
        const localMeals: MealEntry[] = localRaw ? JSON.parse(localRaw) : [];
        const mealMap = new Map<string, MealEntry>();

        localMeals.forEach(m => mealMap.set(m.id, m));
        mappedMeals.forEach(m => mealMap.set(m.id, m));

        const missingOnCloud = localMeals.filter(lm => !mappedMeals.some(cm => cm.id === lm.id));
        for (const missing of missingOnCloud) {
          this.pushMealEntry(missing).catch(() => {});
        }

        localStorage.setItem(STORAGE_KEYS.MEAL_LOGS, JSON.stringify(Array.from(mealMap.values())));
      }

      // 3. 同步 Workout Sessions
      const { data: cloudSessions, error: sessionErr } = await client
        .from('workout_sessions')
        .select('*');

      if (!sessionErr && cloudSessions) {
        const mappedSessions: WorkoutSession[] = cloudSessions.map((s: any) => ({
          id: s.id,
          userId: s.user_id,
          date: s.date,
          startTime: s.start_time || '10:00',
          endTime: s.end_time || undefined,
          durationMinutes: s.duration_minutes ? Number(s.duration_minutes) : undefined,
          caloriesBurned: s.calories_burned ? Number(s.calories_burned) : undefined,
          routineTitle: s.routine_title || '自由訓練',
          exercises: Array.isArray(s.exercises) ? s.exercises : [],
          totalVolumeKg: Number(s.total_volume_kg) || 0,
          totalSets: Number(s.total_sets) || 0,
          notes: s.notes || undefined,
        }));

        // 安全合併：永不以空雲端清空本地記錄
        const localRaw = localStorage.getItem(STORAGE_KEYS.WORKOUT_SESSIONS);
        const localSessions: WorkoutSession[] = localRaw ? JSON.parse(localRaw) : [];
        const sessionMap = new Map<string, WorkoutSession>();

        localSessions.forEach(s => sessionMap.set(s.id, s));
        mappedSessions.forEach(s => sessionMap.set(s.id, s));

        const missingOnCloud = localSessions.filter(ls => !mappedSessions.some(cs => cs.id === ls.id));
        for (const missing of missingOnCloud) {
          this.pushWorkoutSession(missing).catch(() => {});
        }

        localStorage.setItem(STORAGE_KEYS.WORKOUT_SESSIONS, JSON.stringify(Array.from(sessionMap.values())));
      }

      // 4. 同步 Routine Templates (安全非破壞性合併)
      const { data: cloudRoutines, error: routineErr } = await client
        .from('routine_templates')
        .select('*');

      if (!routineErr && cloudRoutines) {
        const mappedRoutines: WorkoutRoutineTemplate[] = cloudRoutines.map((r: any) => ({
          id: r.id,
          userId: r.user_id,
          authorName: r.author_name || undefined,
          title: r.title,
          category: r.category,
          description: r.description || '',
          exercises: Array.isArray(r.exercises) ? r.exercises : [],
          isCustom: r.is_custom ?? true,
          isShared: r.is_shared ?? true,
          createdAt: r.created_at || new Date().toISOString(),
        }));

        // 安全非破壞性合併：先保留本地已建立的自訂課表，避免空雲端覆蓋清空
        const localRaw = localStorage.getItem(STORAGE_KEYS.CUSTOM_ROUTINES);
        const localRoutines: WorkoutRoutineTemplate[] = localRaw ? JSON.parse(localRaw) : [];
        const routineMap = new Map<string, WorkoutRoutineTemplate>();

        // 1. 先放本地課表
        localRoutines.forEach(r => routineMap.set(r.id, r));
        // 2. 雲端資料同步更新
        mappedRoutines.forEach(r => routineMap.set(r.id, r));

        // 3. 若本地有課表但雲端尚未存在，背景補推至雲端
        const missingOnCloud = localRoutines.filter(lr => !mappedRoutines.some(cr => cr.id === lr.id));
        for (const missing of missingOnCloud) {
          this.pushRoutineTemplate(missing).catch(() => {});
        }

        localStorage.setItem(STORAGE_KEYS.CUSTOM_ROUTINES, JSON.stringify(Array.from(routineMap.values())));
      }

      // 5. 同步 Custom Exercises
      const { data: cloudExercises, error: exerciseErr } = await client
        .from('custom_exercises')
        .select('*');

      if (!exerciseErr && cloudExercises) {
        const mappedExercises: Exercise[] = cloudExercises.map((e: any) => ({
          id: e.id,
          name: e.name,
          category: e.category,
          equipment: e.equipment,
          primaryMuscle: e.primary_muscle,
          notes: e.notes || undefined,
          isCustom: true,
        }));

        const localRaw = localStorage.getItem(STORAGE_KEYS.CUSTOM_EXERCISES);
        const localExercises: Exercise[] = localRaw ? JSON.parse(localRaw) : [];
        const exMap = new Map<string, Exercise>();

        localExercises.forEach(e => exMap.set(e.id, e));
        mappedExercises.forEach(e => exMap.set(e.id, e));

        // 若本地有自訂動作尚未存在於雲端，背景補推至雲端
        const missingExercises = localExercises.filter(le => !mappedExercises.some(ce => ce.id === le.id));
        for (const missing of missingExercises) {
          this.pushCustomExercise(missing, 'user-shawn').catch(() => {});
        }

        localStorage.setItem(STORAGE_KEYS.CUSTOM_EXERCISES, JSON.stringify(Array.from(exMap.values())));
      }

      // 6. 同步 Custom Foods
      const { data: cloudFoods, error: foodErr } = await client
        .from('custom_foods')
        .select('*');

      if (!foodErr && cloudFoods) {
        const mappedFoods: FoodItem[] = cloudFoods.map((f: any) => ({
          id: f.id,
          name: f.name,
          calories: Number(f.calories),
          protein: Number(f.protein),
          carbs: Number(f.carbs),
          fat: Number(f.fat),
          servingSize: f.serving_size || '100g',
          baseWeightGrams: f.base_weight_grams ? Number(f.base_weight_grams) : 100,
          category: f.category || 'other',
          isCustom: true,
        }));

        const localRaw = localStorage.getItem(STORAGE_KEYS.CUSTOM_FOODS);
        const localFoods: FoodItem[] = localRaw ? JSON.parse(localRaw) : [];
        const foodMap = new Map<string, FoodItem>();

        localFoods.forEach(f => foodMap.set(f.id, f));
        mappedFoods.forEach(f => foodMap.set(f.id, f));

        // 若本地有自訂食物尚未存在於雲端，背景補推至雲端
        const missingFoods = localFoods.filter(lf => !mappedFoods.some(cf => cf.id === lf.id));
        for (const missing of missingFoods) {
          this.pushCustomFood(missing, 'user-shawn').catch(() => {});
        }

        localStorage.setItem(STORAGE_KEYS.CUSTOM_FOODS, JSON.stringify(Array.from(foodMap.values())));
      }

      // 7. 同步 Weight Entries (每日體重紀錄)
      const { data: cloudWeights, error: weightErr } = await client
        .from('weight_entries')
        .select('*');

      if (!weightErr && cloudWeights) {
        const mappedWeights: WeightEntry[] = cloudWeights.map((w: any) => ({
          id: w.id,
          userId: w.user_id === 'user-shawn-admin' ? 'user-shawn' : w.user_id,
          date: w.date,
          weightKg: Number(w.weight_kg),
          note: w.note || undefined,
          createdAt: w.created_at || new Date().toISOString(),
        }));

        const localRaw = localStorage.getItem(STORAGE_KEYS.WEIGHT_ENTRIES);
        const localWeights: WeightEntry[] = localRaw ? JSON.parse(localRaw) : [];
        const weightMap = new Map<string, WeightEntry>();

        localWeights.forEach(w => weightMap.set(w.id, w));
        mappedWeights.forEach(w => weightMap.set(w.id, w));

        const missingOnCloud = localWeights.filter(lw => !mappedWeights.some(cw => cw.id === lw.id));
        for (const missing of missingOnCloud) {
          this.pushWeightEntry(missing).catch(() => {});
        }

        const mergedWeights = Array.from(weightMap.values()).sort((a, b) => b.date.localeCompare(a.date));
        localStorage.setItem(STORAGE_KEYS.WEIGHT_ENTRIES, JSON.stringify(mergedWeights));
      }

      return { success: true, message: '雲端資料同步完成！' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Supabase syncAllFromCloud failed:', msg);
      return { success: false, message: `同步失敗: ${msg}` };
    }
  }

  private static async seedInitialProfiles(client: SupabaseClient): Promise<void> {
    try {
      const rows = INITIAL_USER_PROFILES.map(p => ({
        id: p.id === 'user-shawn-admin' ? 'user-shawn' : p.id,
        name: p.name,
        avatar: p.avatar,
        gender: p.gender,
        age: p.age,
        height_cm: p.heightCm,
        weight_kg: p.weightKg,
        activity_level: p.activityLevel,
        goal: p.goal,
        role: p.role || 'member',
        custom_calories: p.customCalories || null,
        custom_protein_grams: p.customProteinGrams || null,
        custom_carbs_grams: p.customCarbsGrams || null,
        custom_fat_grams: p.customFatGrams || null,
        target_weight_kg: p.targetWeightKg || null,
      }));
      await client.from('profiles').upsert(rows);
    } catch (e) {
      console.warn('Could not auto-seed profiles:', e);
    }
  }

  // ==================== 即時非同步寫入 / 刪除方法 ====================

  static async pushProfile(profile: UserProfile): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;
    const targetId = profile.id === 'user-shawn-admin' ? 'user-shawn' : profile.id;
    try {
      // 階段 1：嘗試完整 payload (含飲食協議與密碼等新欄位)
      const fullPayload: Record<string, any> = {
        id: targetId,
        name: profile.name,
        avatar: profile.avatar,
        gender: profile.gender,
        age: profile.age,
        height_cm: profile.heightCm,
        weight_kg: profile.weightKg,
        activity_level: profile.activityLevel,
        goal: profile.goal,
        role: profile.role || 'member',
        pin_code: profile.password || profile.pinCode || (profile.role === 'admin' ? '8888' : '1234'),
        diet_protocol: profile.dietProtocol || 'standard',
        carb_cycling_phase: profile.carbCyclingPhase || 'baseline',
        sprint_start_date: profile.sprintStartDate || null,
        sprint_manual_day: profile.sprintManualDay || null,
        weekly_training_hours: profile.weeklyTrainingHours || '4-5',
        three_months_start_date: profile.threeMonthsStartDate || null,
        three_months_manual_week: profile.threeMonthsManualWeek || null,
        custom_calories: profile.customCalories || null,
        custom_protein_grams: profile.customProteinGrams || null,
        custom_carbs_grams: profile.customCarbsGrams || null,
        custom_fat_grams: profile.customFatGrams || null,
        target_weight_kg: profile.targetWeightKg || null,
      };

      const { error: fullErr } = await client.from('profiles').upsert(fullPayload);
      if (!fullErr) return;

      // 階段 2：若雲端尚未升級飲食欄位，降級嘗試只含 pin_code 的核心表
      const coreWithPin: Record<string, any> = {
        id: targetId,
        name: profile.name,
        avatar: profile.avatar,
        gender: profile.gender,
        age: profile.age,
        height_cm: profile.heightCm,
        weight_kg: profile.weightKg,
        activity_level: profile.activityLevel,
        goal: profile.goal,
        role: profile.role || 'member',
        pin_code: profile.password || profile.pinCode || (profile.role === 'admin' ? '8888' : '1234'),
        custom_calories: profile.customCalories || null,
        custom_protein_grams: profile.customProteinGrams || null,
        custom_carbs_grams: profile.customCarbsGrams || null,
        custom_fat_grams: profile.customFatGrams || null,
        target_weight_kg: profile.targetWeightKg || null,
      };
      const { error: pinErr } = await client.from('profiles').upsert(coreWithPin);
      if (!pinErr) return;

      // 階段 3：保證 100% 寫入成功的原生基礎欄位（不含 pin_code，確保身高、體重、年齡、熱量三大元素永遠精準保存）
      const basePayload: Record<string, any> = {
        id: targetId,
        name: profile.name,
        avatar: profile.avatar,
        gender: profile.gender,
        age: profile.age,
        height_cm: profile.heightCm,
        weight_kg: profile.weightKg,
        activity_level: profile.activityLevel,
        goal: profile.goal,
        role: profile.role || 'member',
        custom_calories: profile.customCalories || null,
        custom_protein_grams: profile.customProteinGrams || null,
        custom_carbs_grams: profile.customCarbsGrams || null,
        custom_fat_grams: profile.customFatGrams || null,
        target_weight_kg: profile.targetWeightKg || null,
      };
      const { error: baseErr } = await client.from('profiles').upsert(basePayload);
      if (baseErr) {
        console.error('pushProfile to Supabase failed:', baseErr);
      }
    } catch (e) {
      console.error('pushProfile to Supabase exception:', e);
    }
  }

  static async deleteProfile(profileId: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;
    const targetId = profileId === 'user-shawn-admin' ? 'user-shawn' : profileId;
    try {
      await client.from('profiles').delete().eq('id', targetId);
    } catch (e) {
      console.error('deleteProfile from Supabase failed:', e);
    }
  }

  static async pushMealEntry(entry: MealEntry): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;
    const targetUserId = entry.userId === 'user-shawn-admin' ? 'user-shawn' : entry.userId;
    try {
      await client.from('meal_entries').upsert({
        id: entry.id,
        user_id: targetUserId,
        date: entry.date,
        meal_type: entry.mealType,
        food_name: entry.foodName,
        servings: entry.servings,
        serving_unit: entry.servingUnit,
        weight_grams: entry.weightGrams || null,
        input_mode: entry.inputMode || 'grams',
        calories: entry.calories,
        protein: entry.protein,
        carbs: entry.carbs,
        fat: entry.fat,
      });
    } catch (e) {
      console.error('pushMealEntry to Supabase failed:', e);
    }
  }

  static async deleteMealEntry(id: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;
    try {
      await client.from('meal_entries').delete().eq('id', id);
    } catch (e) {
      console.error('deleteMealEntry from Supabase failed:', e);
    }
  }

  static async pushWorkoutSession(session: WorkoutSession): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;
    const targetUserId = session.userId === 'user-shawn-admin' ? 'user-shawn' : session.userId;
    try {
      await client.from('workout_sessions').upsert({
        id: session.id,
        user_id: targetUserId,
        date: session.date,
        start_time: session.startTime,
        end_time: session.endTime || null,
        duration_minutes: session.durationMinutes || null,
        calories_burned: session.caloriesBurned || null,
        routine_title: session.routineTitle,
        exercises: session.exercises,
        total_volume_kg: session.totalVolumeKg,
        total_sets: session.totalSets,
        notes: session.notes || null,
      });
    } catch (e) {
      console.error('pushWorkoutSession to Supabase failed:', e);
    }
  }

  static async deleteWorkoutSession(id: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;
    try {
      await client.from('workout_sessions').delete().eq('id', id);
    } catch (e) {
      console.error('deleteWorkoutSession from Supabase failed:', e);
    }
  }

  static async pushRoutineTemplate(routine: WorkoutRoutineTemplate): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;
    const targetUserId = routine.userId === 'user-shawn-admin' ? 'user-shawn' : routine.userId;
    let finalUserId: string | null = targetUserId || null;
    try {
      // 確保關聯的 user profile 存在於雲端 (避免 23503 foreign key error)
      if (targetUserId) {
        const { data: profileCheck } = await client
          .from('profiles')
          .select('id')
          .eq('id', targetUserId)
          .maybeSingle();

        if (!profileCheck) {
          finalUserId = null;
        }
      }

      const { error } = await client.from('routine_templates').upsert({
        id: routine.id,
        user_id: finalUserId,
        author_name: routine.authorName || null,
        title: routine.title,
        category: routine.category,
        description: routine.description || '',
        exercises: routine.exercises,
        is_custom: routine.isCustom ?? true,
        is_shared: routine.isShared ?? true,
      });

      if (error) {
        console.error('pushRoutineTemplate Supabase upsert error:', error);
      }
    } catch (e) {
      console.error('pushRoutineTemplate to Supabase failed:', e);
    }
  }

  static async deleteRoutineTemplate(id: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;
    try {
      await client.from('routine_templates').delete().eq('id', id);
    } catch (e) {
      console.error('deleteRoutineTemplate from Supabase failed:', e);
    }
  }

  static async pushCustomExercise(exercise: Exercise, userId?: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;
    const targetUserId = userId === 'user-shawn-admin' ? 'user-shawn' : userId;
    try {
      await client.from('custom_exercises').upsert({
        id: exercise.id,
        name: exercise.name,
        category: exercise.category,
        equipment: exercise.equipment,
        primary_muscle: exercise.primaryMuscle,
        notes: exercise.notes || null,
        is_custom: true,
        created_by: targetUserId || null,
      });
    } catch (e) {
      console.error('pushCustomExercise to Supabase failed:', e);
    }
  }

  static async pushCustomFood(food: FoodItem, userId?: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;
    const targetUserId = userId === 'user-shawn-admin' ? 'user-shawn' : userId;
    try {
      await client.from('custom_foods').upsert({
        id: food.id,
        name: food.name,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        serving_size: food.servingSize,
        base_weight_grams: food.baseWeightGrams || 100,
        category: food.category || 'other',
        is_custom: true,
        created_by: targetUserId || null,
      });
    } catch (e) {
      console.error('pushCustomFood to Supabase failed:', e);
    }
  }

  static async pushWeightEntry(entry: WeightEntry): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;
    const targetUserId = entry.userId === 'user-shawn-admin' ? 'user-shawn' : entry.userId;
    try {
      await client.from('weight_entries').upsert({
        id: entry.id,
        user_id: targetUserId,
        date: entry.date,
        weight_kg: entry.weightKg,
        note: entry.note || null,
        created_at: entry.createdAt,
      });
    } catch (e) {
      console.error('pushWeightEntry to Supabase failed:', e);
    }
  }

  static async deleteWeightEntry(id: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;
    try {
      await client.from('weight_entries').delete().eq('id', id);
    } catch (e) {
      console.error('deleteWeightEntry from Supabase failed:', e);
    }
  }

  /**
   * 雲端即時密碼驗證 (當剛清除 storage 或尚未同步完成時，直接與雲端資料庫比對)
   */
  static async verifyPasswordOnline(profileId: string, inputPass: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;
    const targetId = profileId === 'user-shawn-admin' ? 'user-shawn' : profileId;
    try {
      const { data, error } = await client
        .from('profiles')
        .select('pin_code, role')
        .eq('id', targetId)
        .limit(1)
        .maybeSingle();

      if (error || !data) return false;
      const expected = data.pin_code || (data.role === 'admin' ? '8888' : '1234');
      return inputPass.trim() === expected.trim();
    } catch {
      return false;
    }
  }
}

/**
 * 提供給使用者在 Supabase 一鍵執行的免費 SQL 建表語法
 */
export const SUPABASE_SQL_SCHEMA = `-- IronTrack 免費版 Supabase 雲端資料庫建表指令
-- 請複製以下語法貼至 Supabase 控制台的 SQL Editor 中並點擊 RUN

-- 1. 使用者基本設定表
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  avatar TEXT,
  gender TEXT,
  age INTEGER,
  height_cm NUMERIC,
  weight_kg NUMERIC,
  activity_level TEXT,
  goal TEXT,
  role TEXT DEFAULT 'member',
  pin_code TEXT DEFAULT '1234',
  diet_protocol TEXT DEFAULT 'standard',
  carb_cycling_phase TEXT DEFAULT 'baseline',
  sprint_start_date TEXT,
  sprint_manual_day INTEGER,
  weekly_training_hours TEXT DEFAULT '4-5',
  three_months_start_date TEXT,
  three_months_manual_week INTEGER,
  custom_calories INTEGER,
  custom_protein_grams INTEGER,
  custom_carbs_grams INTEGER,
  custom_fat_grams INTEGER,
  target_weight_kg NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 若您先前已建立過 profiles 資料表，請執行此段升級語法：
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS diet_protocol TEXT DEFAULT 'standard';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS carb_cycling_phase TEXT DEFAULT 'baseline';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sprint_start_date TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sprint_manual_day INTEGER;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS weekly_training_hours TEXT DEFAULT '4-5';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS three_months_start_date TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS three_months_manual_week INTEGER;

-- 2. 飲食紀錄表
CREATE TABLE IF NOT EXISTS public.meal_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_type TEXT NOT NULL,
  food_name TEXT NOT NULL,
  servings NUMERIC NOT NULL,
  serving_unit TEXT,
  weight_grams NUMERIC,
  input_mode TEXT,
  calories NUMERIC NOT NULL,
  protein NUMERIC NOT NULL,
  carbs NUMERIC NOT NULL,
  fat NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. 健身訓練紀錄表
CREATE TABLE IF NOT EXISTS public.workout_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TEXT,
  end_time TEXT,
  duration_minutes INTEGER,
  calories_burned NUMERIC,
  routine_title TEXT,
  exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_volume_kg NUMERIC DEFAULT 0,
  total_sets INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. 訓練課表模板表 (支援個人專屬或團隊共享)
CREATE TABLE IF NOT EXISTS public.routine_templates (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_name TEXT,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_custom BOOLEAN DEFAULT true,
  is_shared BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. 團隊自訂動作庫 (Custom Exercises - 任何成員新增，全隊皆可查閱使用)
CREATE TABLE IF NOT EXISTS public.custom_exercises (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  equipment TEXT NOT NULL,
  primary_muscle TEXT NOT NULL,
  notes TEXT,
  is_custom BOOLEAN DEFAULT true,
  created_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. 團隊自訂食材庫 (Custom Foods - 任何成員新增，全隊皆可查閱使用)
CREATE TABLE IF NOT EXISTS public.custom_foods (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  calories NUMERIC NOT NULL,
  protein NUMERIC NOT NULL,
  carbs NUMERIC NOT NULL,
  fat NUMERIC NOT NULL,
  serving_size TEXT,
  base_weight_grams NUMERIC DEFAULT 100,
  category TEXT,
  is_custom BOOLEAN DEFAULT true,
  created_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. 每日體重追蹤表 (Daily Weight Entries)
CREATE TABLE IF NOT EXISTS public.weight_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weight_kg NUMERIC NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 啟用 RLS 安全策略
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_entries ENABLE ROW LEVEL SECURITY;

-- 允許持有金鑰的成員自由讀寫共享
CREATE POLICY "Public full access profiles" ON public.profiles FOR ALL USING (true);
CREATE POLICY "Public full access meal_entries" ON public.meal_entries FOR ALL USING (true);
CREATE POLICY "Public full access workout_sessions" ON public.workout_sessions FOR ALL USING (true);
CREATE POLICY "Public full access routine_templates" ON public.routine_templates FOR ALL USING (true);
CREATE POLICY "Public full access custom_exercises" ON public.custom_exercises FOR ALL USING (true);
CREATE POLICY "Public full access custom_foods" ON public.custom_foods FOR ALL USING (true);
CREATE POLICY "Public full access weight_entries" ON public.weight_entries FOR ALL USING (true);
`;
