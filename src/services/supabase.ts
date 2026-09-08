import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { StorageService } from './storage';

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const config = StorageService.getCloudConfig();
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
    // 透過呼叫 auth.getSession 或讀取公共狀態來測試連線
    const { error } = await client.auth.getSession();
    if (error) {
      return { success: false, message: `認證錯誤: ${error.message}` };
    }
    return { success: true, message: '成功連線至 Supabase 雲端後端！' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, message: `連線失敗: ${message}` };
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
  custom_calories INTEGER,
  custom_protein_grams INTEGER,
  custom_carbs_grams INTEGER,
  custom_fat_grams INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. 飲食紀錄表
CREATE TABLE IF NOT EXISTS public.meal_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_type TEXT NOT NULL,
  food_name TEXT NOT NULL,
  servings NUMERIC NOT NULL,
  serving_unit TEXT,
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
  created_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 啟用 RLS 安全策略
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_foods ENABLE ROW LEVEL SECURITY;

-- 允許持有金鑰的 5 位成員自由讀寫共享
CREATE POLICY "Public full access profiles" ON public.profiles FOR ALL USING (true);
CREATE POLICY "Public full access meal_entries" ON public.meal_entries FOR ALL USING (true);
CREATE POLICY "Public full access workout_sessions" ON public.workout_sessions FOR ALL USING (true);
CREATE POLICY "Public full access routine_templates" ON public.routine_templates FOR ALL USING (true);
CREATE POLICY "Public full access custom_exercises" ON public.custom_exercises FOR ALL USING (true);
CREATE POLICY "Public full access custom_foods" ON public.custom_foods FOR ALL USING (true);
`;
