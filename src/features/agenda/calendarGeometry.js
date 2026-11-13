import { clock, dateKey } from "./api";

export const minute = value => { const [h, m] = value.split(":").map(Number); return h * 60 + m; };
export const instantMinute = value => minute(clock(value));
export function dayPlan(rules, day) {
  const special = rules.find(r => r.specific_date === day);
  if (special) return special.plan;
  const weekday = (new Date(day + "T12:00:00Z").getUTCDay() + 6) % 7;
  return rules.filter(r => r.weekday === weekday && r.effective_from <= day)
    .sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0]?.plan || { closed: true };
}
export function segment(start, end, day, from, to) {
  const a = dateKey(start) < day ? from : dateKey(start) > day ? to : instantMinute(start);
  const b = dateKey(end) > day ? to : dateKey(end) < day ? from : instantMinute(end);
  return { start: Math.max(from, a), end: Math.min(to, b) };
}
// Allocate side-by-side lanes only for genuinely overlapping intervals.
export function layoutEntries(entries) {
  const sorted = [...entries].sort((a, b) => a.start - b.start || b.end - a.end);
  let group = [], ends = [], groupEnd = -1;
  const result = [];
  function flush() { group.forEach(e => result.push({ ...e, lanes: ends.length })); group = []; ends = []; }
  for (const entry of sorted) {
    if (entry.start >= groupEnd) { flush(); groupEnd = -1; }
    let lane = ends.findIndex(end => end <= entry.start);
    if (lane < 0) lane = ends.length;
    ends[lane] = entry.end; groupEnd = Math.max(groupEnd, entry.end);
    group.push({ ...entry, lane });
  }
  flush();
  return result;
}
