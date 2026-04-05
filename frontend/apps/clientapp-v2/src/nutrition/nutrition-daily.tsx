import {computePlannedMacros, formatDateISO, MEAL_SLOTS, sumMacros} from '@easy/utils';
import {Alert, Button, Spinner, toast} from '@heroui/react';
import {Plus} from 'lucide-react';
import {useCallback, useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import type {FoodLog} from '@/api/foodLogs';
import type {TodayPlanMealItem} from '@/api/nutritionPlans';

import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';
import {useListMyFoodLogsQuery, useLogDayMutation} from '@/api/foodLogs';
import {useGetTodayPlanQuery} from '@/api/nutritionPlans';
import DailyMacroProgress from '@/nutrition/components/daily-macro-progress';
import DateNavigator from '@/nutrition/components/date-navigator';
import EditLogInline from '@/nutrition/components/edit-log-inline';
import LogItemInline from '@/nutrition/components/log-item-inline';
import MealSlotSection from '@/nutrition/components/meal-slot-section';

// ── Main component ───────────────────────────────────────────

export default function NutritionDaily() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const dateISO = formatDateISO(selectedDate);

  // Fetch today's plan + logs in parallel
  const {data: todayPlanData, isError: isPlanError, isLoading: isPlanLoading} = useGetTodayPlanQuery({date: dateISO});
  const {data: logsData, isError: isLogsError, isLoading: isLogsLoading} = useListMyFoodLogsQuery({date: dateISO});

  const [logDay, {isLoading: isLoggingDay}] = useLogDayMutation();

  // Inline states
  const [activeLogItem, setActiveLogItem] = useState<null | {item: TodayPlanMealItem; mealSlot: string}>(null);
  const [editingLog, setEditingLog] = useState<FoodLog | null>(null);

  const todayPlan = todayPlanData?.data;
  const logs: FoodLog[] = useMemo(() => logsData?.data ?? [], [logsData]);
  const isLoading = isPlanLoading || isLogsLoading;

  // Compute macro totals
  const plannedMacros = useMemo(
    () => (todayPlan ? computePlannedMacros(todayPlan.meals) : {calories: 0, carbs: 0, fat: 0, protein: 0}),
    [todayPlan],
  );
  const consumedMacros = useMemo(() => sumMacros(logs), [logs]);

  // Check if all planned items are logged
  const allPlannedLogged = useMemo(() => {
    if (!todayPlan || todayPlan.meals.length === 0) return true;
    for (const meal of todayPlan.meals) {
      for (const item of meal.items) {
        if (!logs.some((log) => log.meal_item_id === item.meal_item_id)) {
          return false;
        }
      }
    }
    return true;
  }, [todayPlan, logs]);

  const handleTapItem = useCallback((item: TodayPlanMealItem, mealSlot: string) => {
    setEditingLog(null);
    setActiveLogItem({item, mealSlot});
  }, []);

  const handleEditLog = useCallback((log: FoodLog) => {
    setActiveLogItem(null);
    setEditingLog(log);
  }, []);

  const handleLogAllDay = async () => {
    if (!todayPlan) return;
    try {
      await logDay({date: dateISO, plan_id: todayPlan.plan_id}).unwrap();
      toast.success('All meals logged for the day');
    } catch {
      toast.danger('Failed to log all meals.');
    }
  };

  if (isLoading) {
    return (
      <PageLayout title="Nutrition">
        <div className="flex items-center justify-center py-20">
          <Spinner color="accent" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Nutrition">
      <div className="max-w-lg">
        {/* Date navigator */}
        <div className="mb-4">
          <DateNavigator
            date={selectedDate}
            onDateChange={setSelectedDate}
          />
        </div>

        {/* Daily macro progress — show for plan OR freestyle (consumed-only) */}
        {todayPlan || logs.length > 0 ? (
          <div className="mb-4">
            <DailyMacroProgress
              consumed={consumedMacros}
              planned={plannedMacros}
            />
          </div>
        ) : null}

        {/* No plan state */}
        {!todayPlan && isPlanError ? (
          <div className="mb-4">
            <Alert status="default">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>No nutrition plan</Alert.Title>
                <Alert.Description>
                  Your coach hasn&apos;t assigned a nutrition plan yet, or there&apos;s no plan for this day.
                </Alert.Description>
              </Alert.Content>
            </Alert>
          </div>
        ) : null}

        {/* Logs fetch error state */}
        {isLogsError ? (
          <div className="mb-4">
            <Alert status="default">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Failed to load food logs</Alert.Title>
                <Alert.Description>
                  We couldn&apos;t load your food logs. Please try refreshing the page.
                </Alert.Description>
              </Alert.Content>
            </Alert>
          </div>
        ) : null}

        {/* Inline log new item */}
        {activeLogItem ? (
          <div className="mb-4">
            <LogItemInline
              date={dateISO}
              item={activeLogItem.item}
              mealSlot={activeLogItem.mealSlot}
              onClose={() => setActiveLogItem(null)}
              onReplace={() => {
                setActiveLogItem(null);
                navigate(ROUTES.NUTRITION_ADD_FOOD, {
                  state: {
                    date: dateISO,
                    mealItemId: activeLogItem.item.meal_item_id,
                    mealSlot: activeLogItem.mealSlot,
                    replace: true,
                  },
                });
              }}
            />
          </div>
        ) : null}

        {/* Inline edit existing log */}
        {editingLog ? (
          <div className="mb-4">
            <EditLogInline
              log={editingLog}
              onClose={() => setEditingLog(null)}
            />
          </div>
        ) : null}

        {/* Meal slots */}
        {todayPlan ? (
          <div className="flex flex-col gap-3">
            {todayPlan.meals
              .sort(
                (a, b) =>
                  MEAL_SLOTS.indexOf(a.meal_slot as (typeof MEAL_SLOTS)[number]) -
                  MEAL_SLOTS.indexOf(b.meal_slot as (typeof MEAL_SLOTS)[number]),
              )
              .map((meal) => (
                <MealSlotSection
                  date={dateISO}
                  key={meal.meal_slot}
                  logs={logs}
                  meal={meal}
                  onEditLog={handleEditLog}
                  onTapItem={(item) => handleTapItem(item, meal.meal_slot)}
                />
              ))}
          </div>
        ) : null}

        {/* Freestyle logs (no plan, but has logs) */}
        {!todayPlan && logs.length > 0 ? (
          <div className="mb-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground-400">Logged today</p>
            <div className="flex flex-col gap-1 rounded-xl bg-default p-3">
              {logs.map((log) => (
                <button
                  className="flex min-h-11 w-full items-center gap-3 py-1 text-left"
                  key={log.id}
                  onClick={() => handleEditLog(log)}
                  type="button"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{log.food_name_snapshot ?? 'Unknown'}</p>
                    <p className="text-xs text-foreground-400">
                      {log.amount ?? ''}
                      {log.unit ?? ''}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Bottom actions */}
        <div className="mt-4 flex flex-col gap-2">
          <Button
            className="w-full"
            onPress={() => navigate(ROUTES.NUTRITION_ADD_FOOD, {state: {date: dateISO}})}
            variant="secondary"
          >
            <Plus size={16} />
            Add food
          </Button>

          {todayPlan && !allPlannedLogged ? (
            <Button
              className="w-full"
              isDisabled={isLoggingDay}
              isPending={isLoggingDay}
              onPress={handleLogAllDay}
              variant="ghost"
            >
              Log all meals
            </Button>
          ) : null}
        </div>
      </div>
    </PageLayout>
  );
}
