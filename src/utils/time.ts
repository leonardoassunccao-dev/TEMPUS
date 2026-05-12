import { format, parse, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PunchRecord, PunchType, WorkdayConfig, DailySummary } from '../types';

export const minutesToHHmm = (minutes: number): string => {
  const sign = minutes < 0 ? '-' : '';
  const absMinutes = Math.abs(minutes);
  const h = Math.floor(absMinutes / 60);
  const m = absMinutes % 60;
  return `${sign}${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export const HHmmToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

export const formatDisplayDate = (dateStr: string): string => {
  const date = parse(dateStr, 'yyyy-MM-dd', new Date());
  return format(date, "EEEE, dd 'de' MMMM", { locale: ptBR });
};

export const calculateDailySummary = (
  date: string,
  records: PunchRecord[],
  config: WorkdayConfig
): DailySummary => {
  // Sort records by time
  const sorted = [...records].sort((a, b) => a.time.localeCompare(b.time));
  
  let totalWorkedMinutes = 0;
  let lunchMinutes = 0;

  const entry = sorted.find(r => r.type === PunchType.ENTRY);
  const lunchStart = sorted.find(r => r.type === PunchType.LUNCH_START);
  const lunchEnd = sorted.find(r => r.type === PunchType.LUNCH_END);
  const exit = sorted.find(r => r.type === PunchType.EXIT);
  const extra = sorted.filter(r => r.type === PunchType.EXTRA);

  // Basic calculation: (LunchStart - Entry) + (Exit - LunchEnd)
  if (entry && lunchStart) {
    totalWorkedMinutes += Math.max(0, HHmmToMinutes(lunchStart.time) - HHmmToMinutes(entry.time));
  }
  if (lunchEnd && exit) {
    totalWorkedMinutes += Math.max(0, HHmmToMinutes(exit.time) - HHmmToMinutes(lunchEnd.time));
  }
  
  // Lunch break calculation
  if (lunchStart && lunchEnd) {
    lunchMinutes = HHmmToMinutes(lunchEnd.time) - HHmmToMinutes(lunchStart.time);
  }

  // Add extra types if they have duration or just calculate between points if user used them differently
  // For simplicity, this MVP focuses on the 4 main points. 
  // We can add logic for extra points if they follow a pattern or just let them be markers.
  
  const diff = totalWorkedMinutes - config.dailyHours;
  const absDiff = Math.abs(diff);
  
  // Apply tolerance
  let balanceMinutes = diff;
  if (absDiff <= config.toleranceMinutes) {
    balanceMinutes = 0;
  }

  let status: DailySummary['status'] = 'incomplete';
  if (entry && lunchStart && lunchEnd && exit) {
    if (balanceMinutes > 0) status = 'extra';
    else if (balanceMinutes < 0) status = 'warning';
    else status = 'complete';
  }

  return {
    date,
    records: sorted,
    totalWorkedMinutes,
    lunchMinutes,
    balanceMinutes,
    status
  };
};
