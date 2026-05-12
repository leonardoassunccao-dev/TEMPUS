/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum PunchType {
  ENTRY = 'ENTRY',
  LUNCH_START = 'LUNCH_START',
  LUNCH_END = 'LUNCH_END',
  EXIT = 'EXIT',
  EXTRA = 'EXTRA'
}

export interface PunchRecord {
  id: string;
  date: string; // ISO Date YYYY-MM-DD
  time: string; // HH:mm
  type: PunchType;
  observation?: string;
  receiptId?: string; // ID for IndexedDB
  createdAt: string; // ISO Timestamp
}

export interface WorkdayConfig {
  entryTime: string; // 07:00
  lunchStartTime: string; // 11:00
  lunchEndTime: string; // 12:00
  exitTime: string; // 17:00
  dailyHours: number; // in minutes, e.g. 540 (9h)
  toleranceMinutes: number; // 5
}

export interface UserProfile {
  name: string;
  theme: 'dark' | 'light';
}

export interface DailySummary {
  date: string;
  records: PunchRecord[];
  totalWorkedMinutes: number;
  lunchMinutes: number;
  balanceMinutes: number; // positive for overtime, negative for delay
  status: 'complete' | 'incomplete' | 'warning' | 'extra';
}
