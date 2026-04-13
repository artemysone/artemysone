import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const SUPABASE_URL = 'https://yogekxymgkvphxmertuy.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ynXNtl0pK4LYj_WZuRjbpg_0aLnB5j-';

export const CONFIG_DIR = join(homedir(), '.config', 'artemys');
const SESSION_FILE = join(CONFIG_DIR, 'session.json');

function ensureConfigDir(): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
}

const FileStorageAdapter = {
  getItem(key: string): string | null {
    try {
      const data = JSON.parse(readFileSync(SESSION_FILE, 'utf-8'));
      return data[key] ?? null;
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): void {
    ensureConfigDir();
    let data: Record<string, string> = {};
    try {
      data = JSON.parse(readFileSync(SESSION_FILE, 'utf-8'));
    } catch {}
    data[key] = value;
    writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2));
  },
  removeItem(key: string): void {
    try {
      const data = JSON.parse(readFileSync(SESSION_FILE, 'utf-8'));
      delete data[key];
      writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2));
    } catch {}
  },
};

export function clearSession(): void {
  try {
    if (existsSync(SESSION_FILE)) {
      unlinkSync(SESSION_FILE);
    }
  } catch {}
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: FileStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
