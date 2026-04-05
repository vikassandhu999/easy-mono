import {MEAL_SLOT_LABELS, MEAL_SLOTS, normalizeMacros} from '@easy/utils';
import {Button, Spinner} from '@heroui/react';
import {ArrowLeft, Check, Plus} from 'lucide-react';
import {useMemo} from 'react';

import type {CoachFoodLog} from '@/api/foodLogs';

import {useListCoachFoodLogsQuery} from '@/api/foodLogs';

// ── Helpers ──────────────────────────────────────────────────

const MEAL_SLOT_ORDER = MEAL_SLOTS;

function computeCalories(macros: null | Record<string, number>, weightG: null | number): number {
  if (!macros || !weightG || weightG <= 0) return 0;
  const normalized = normalizeMacros(macros);
  return ((normalized.calories_per_100g ?? 0) * weightG) / 100;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const weekday = d.toLocaleDateString(undefined, {weekday: 'long'});
  const month = d.toLocaleDateString(undefined, {month: 'short'});
  const day = d.getDate();
  return `${weekday}, ${month} ${day}`;
}

// ── Component ───────────────────────────────────────────────

export default function ClientNutritionDetail({
  clientId,
  date,
  onBack,
}: {
  clientId: string;
  date: string;
  onBack: () => void;
}) {
  const {data, isLoading} = useListCoachFoodLogsQuery({client_id: clientId, date});
  const logs = useMemo(() => data?.data ?? [], [data]);

  // Group logs by meal_slot
  const groupedLogs = useMemo(() => {
    const groups: Record<string, CoachFoodLog[]> = {};
    for (const log of logs) {
      const slot = log.meal_slot;
      if (!groups[slot]) groups[slot] = [];
      groups[slot].push(log);
    }
    return groups;
  }, [logs]);

  // Get all slots that have logs, sorted
  const slots = useMemo(() => {
    const slotSet = new Set(logs.map((l) => l.meal_slot));
    return MEAL_SLOT_ORDER.filter((s) => slotSet.has(s));
  }, [logs]);

  // Total calories for the day
  const totalCal = useMemo(() => {
    let total = 0;
    for (const log of logs) {
      total += computeCalories(log.macros_snapshot, log.weight_g);
    }
    return Math.round(total);
  }, [logs]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size="sm" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Button
          onPress={onBack}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Back
        </Button>
      </div>

      <h3 className="mb-1 text-sm font-semibold">{formatDate(date)}</h3>
      <p className="mb-4 text-xs text-foreground-400">
        Logged: {totalCal} cal \u00B7 {logs.length} entries
      </p>

      {slots.length === 0 ? (
        <p className="text-sm text-foreground-400">No food logged for this day.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {slots.map((slot) => {
            const slotLogs = groupedLogs[slot] ?? [];
            const slotCal = slotLogs.reduce((sum, log) => sum + computeCalories(log.macros_snapshot, log.weight_g), 0);

            return (
              <section key={slot}>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground-400">
                    {MEAL_SLOT_LABELS[slot] ?? slot}
                  </h4>
                  <span className="text-xs text-foreground-400">{Math.round(slotCal)} cal</span>
                </div>
                <div className="overflow-hidden rounded-lg border border-divider">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-divider bg-content2 text-xs text-foreground-400">
                        <th className="px-3 py-1.5 text-left font-medium">Food</th>
                        <th className="px-3 py-1.5 text-right font-medium">Amount</th>
                        <th className="px-3 py-1.5 text-right font-medium">Cal</th>
                        <th className="w-8 px-2 py-1.5"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {slotLogs.map((log) => {
                        const displayName = log.food_name_snapshot ?? log.food?.name ?? log.recipe?.name ?? 'Unknown';
                        const displayAmount = log.amount != null ? `${log.amount}${log.unit ?? 'g'}` : '';
                        const cal = Math.round(computeCalories(log.macros_snapshot, log.weight_g));
                        const isUnplanned = !log.meal_item_id;

                        return (
                          <tr
                            className="border-b border-divider last:border-b-0"
                            key={log.id}
                          >
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1.5">
                                {isUnplanned ? (
                                  <Plus
                                    className="shrink-0 text-foreground-300"
                                    size={12}
                                  />
                                ) : null}
                                <span className="truncate">{displayName}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right text-foreground-400">{displayAmount}</td>
                            <td className="px-3 py-2 text-right">{cal}</td>
                            <td className="px-2 py-2 text-center">
                              {!isUnplanned ? (
                                <Check
                                  className="text-success"
                                  size={14}
                                />
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
