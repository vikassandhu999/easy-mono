export function periodError(startDate: string | null, endDate: string | null): string | null {
  return startDate && endDate && endDate < startDate ? 'End date must be on or after the start date' : null;
}
