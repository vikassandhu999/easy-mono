export const weekdays = [
  {bit: 1, number: 1, short: 'Mon', long: 'Monday'},
  {bit: 2, number: 2, short: 'Tue', long: 'Tuesday'},
  {bit: 4, number: 3, short: 'Wed', long: 'Wednesday'},
  {bit: 8, number: 4, short: 'Thu', long: 'Thursday'},
  {bit: 16, number: 5, short: 'Fri', long: 'Friday'},
  {bit: 32, number: 6, short: 'Sat', long: 'Saturday'},
  {bit: 64, number: 7, short: 'Sun', long: 'Sunday'},
] as const;
export type Day = (typeof weekdays)[number];

export function daysLabel(mask: number) {
  if (mask === 127) {
    return 'Every day';
  }
  if (mask === 31) {
    return 'Mon–Fri';
  }
  if (mask === 96) {
    return 'Sat–Sun';
  }
  return weekdays
    .filter((day) => mask & day.bit)
    .map((day) => day.short)
    .join(' · ');
}
