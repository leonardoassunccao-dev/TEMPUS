import { get, set, del, keys } from 'idb-keyval';
import { PunchRecord, WorkdayConfig, UserProfile } from './types';

const STORAGE_KEYS = {
  RECORDS: 'tempus_records',
  CONFIG: 'tempus_config',
  USER: 'tempus_user',
  RECEIPTS: 'tempus_receipts_' // Prefix for IndexedDB
};

export const DEFAULT_CONFIG: WorkdayConfig = {
  entryTime: '07:00',
  lunchStartTime: '11:00',
  lunchEndTime: '12:00',
  exitTime: '17:00',
  dailyHours: 540, // 9h
  toleranceMinutes: 5
};

export const DEFAULT_USER: UserProfile = {
  name: 'Mestre Léo',
  theme: 'dark'
};

// LocalStorage helpers for simple data
export const saveConfig = (config: WorkdayConfig) => {
  localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
};

export const loadConfig = (): WorkdayConfig => {
  const saved = localStorage.getItem(STORAGE_KEYS.CONFIG);
  return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
};

export const saveUser = (user: UserProfile) => {
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
};

export const loadUser = (): UserProfile => {
  const saved = localStorage.getItem(STORAGE_KEYS.USER);
  return saved ? JSON.parse(saved) : DEFAULT_USER;
};

// Punch Records (LocalStorage for metadata)
export const saveRecords = (records: PunchRecord[]) => {
  localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
};

export const loadRecords = (): PunchRecord[] => {
  const saved = localStorage.getItem(STORAGE_KEYS.RECORDS);
  return saved ? JSON.parse(saved) : [];
};

// Receipts (IndexedDB for images)
export const saveReceipt = async (id: string, blob: Blob): Promise<string> => {
  const key = `${STORAGE_KEYS.RECEIPTS}${id}`;
  await set(key, blob);
  return id;
};

export const loadReceipt = async (id: string): Promise<Blob | undefined> => {
  const key = `${STORAGE_KEYS.RECEIPTS}${id}`;
  return await get(key);
};

export const deleteReceipt = async (id: string) => {
  const key = `${STORAGE_KEYS.RECEIPTS}${id}`;
  await del(key);
};

export const clearAllData = async () => {
  localStorage.clear();
  const allKeys = await keys();
  for (const key of allKeys) {
    if (typeof key === 'string' && key.startsWith(STORAGE_KEYS.RECEIPTS)) {
      await del(key);
    }
  }
};
