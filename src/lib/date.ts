import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from "date-fns";

export interface Range {
  start: Date;
  end: Date;
}

export function dayRange(ref: Date = new Date()): Range {
  return { start: startOfDay(ref), end: endOfDay(ref) };
}

export function weekRange(ref: Date = new Date(), mondayStart = true): Range {
  const opts = { weekStartsOn: (mondayStart ? 1 : 0) as 0 | 1 };
  return { start: startOfWeek(ref, opts), end: endOfWeek(ref, opts) };
}

export function monthRange(ref: Date = new Date()): Range {
  return { start: startOfMonth(ref), end: endOfMonth(ref) };
}

export function yearRange(ref: Date = new Date()): Range {
  return { start: startOfYear(ref), end: endOfYear(ref) };
}
