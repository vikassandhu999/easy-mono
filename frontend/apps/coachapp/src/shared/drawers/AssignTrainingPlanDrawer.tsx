import {humanizeError} from '@easy/error-parser';
import {Button, Group, Loader, Stack, Text} from '@mantine/core';
import {DatePickerInput} from '@mantine/dates';
import {useDebouncedValue} from '@mantine/hooks';
import {IconCalendar, IconX} from '@tabler/icons-react';
import {useMemo, useState} from 'react';

import useParamsDrawer from "@/hooks/useParamDrawer";
import {
  TrainingPlan,
  useAssignTrainingPlan,
  useListTrainingPlans,
} from "@/services/training_plans";
import AutoDrawer from "@/shared/AutoDrawer/AutoDrawer";
import { notifyError } from "@/utils/notification";

import classes from "./AssignPlanDrawer.module.css";

interface TrainingPlanTemplateItemProps {
  isSelected: boolean;
  onSelect: (plan: TrainingPlan) => void;
  plan: TrainingPlan;
}

const TrainingPlanTemplateItem = ({plan, onSelect, isSelected}: TrainingPlanTemplateItemProps) => {
    const workoutCount = plan.workouts?.length ?? 0;

    return (
        <div
            className={`${classes.planItem} ${isSelected ? classes.planItemSelected : ''}`}
            onClick={() => onSelect(plan)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(plan);
                }
            }}
            role="button"
            tabIndex={0}
        >
            <div className={classes.planInfo}>
                <Text
                    fw={500}
                    size="sm"
                >
                    {plan.name}
                </Text>
                {plan.description && (
                    <Text
                        c="dimmed"
                        lineClamp={2}
                        size="xs"
                    >
                        {plan.description}
                    </Text>
                )}
                <Group
                    gap="xs"
                    mt="xs"
                >
                    {workoutCount > 0 && (
                        <span className={classes.tag}>
                            {workoutCount} {workoutCount === 1 ? 'workout' : 'workouts'}
                        </span>
                    )}
                    <span className={classes.tag}>Weekly Schedule</span>
                </Group>
            </div>
            <div className={`${classes.checkbox} ${isSelected ? classes.checkboxSelected : ''}`}>
                {isSelected && <span className={classes.checkmark}>✓</span>}
            </div>
        </div>
    );
};

const formatDateForApi = (date: Date | null): string | undefined => {
  if (!date) return undefined;

  // Ensure we have a Date object
  const dateObj = date instanceof Date ? date : new Date(date);

  // Check if valid date
  if (isNaN(dateObj.getTime())) return undefined;

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const AssignTrainingPlanDrawer = () => {
  const { closeDrawer, getDrawerParams } = useParamsDrawer({});
  const { client_id } = getDrawerParams();

    const [selectedPlan, setSelectedPlan] = useState<null | TrainingPlan>(null);
    const [startDate, setStartDate] = useState<Date | null>(new Date());
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch] = useDebouncedValue(searchInput, 300);

  const [assignPlan, { isLoading: isAssigning }] = useAssignTrainingPlan();

  const { data, isLoading } = useListTrainingPlans({
    search: debouncedSearch || undefined,
    is_template: true,
  });

  const plans = useMemo(
    () => data?.pages?.flatMap((page) => page.records) ?? [],
    [data?.pages],
  );

  const handleSelect = (plan: TrainingPlan) => {
    setSelectedPlan(plan.id === selectedPlan?.id ? null : plan);
  };

    const handleAssign = async () => {
        if (!selectedPlan || !client_id || !startDate || !endDate) return;

        const formattedStartDate = formatDateForApi(startDate);
        const formattedEndDate = formatDateForApi(endDate);

        if (!formattedStartDate || !formattedEndDate) {
            notifyError('Please select valid start and end dates');
            return;
        }

        try {
            await assignPlan({
                id: selectedPlan.id,
                client_id,
                start_date: formattedStartDate,
                end_date: formattedEndDate,
            }).unwrap();
            closeDrawer();
        } catch (error) {
            const errMsg = humanizeError(error);
            notifyError(errMsg);
        }
    };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(event.currentTarget.value);
  };

  const handleClearSearch = () => {
    setSearchInput("");
  };

    return (
        <AutoDrawer
            actions={
                <Group w="100%">
                    <Button
                        color="blue"
                        disabled={!selectedPlan || !startDate || !endDate}
                        flex={1}
                        loading={isAssigning}
                        onClick={handleAssign}
                        radius="xl"
                        size="sm"
                        variant="solid"
                    >
                        Assign Plan
                    </Button>
                </Group>
            }
            content={
                <Stack gap="md">
                    {/* Start Date Picker */}
                    <DatePickerInput
                        clearable={false}
                        description="When should this plan start for the client?"
                        label="Start Date"
                        minDate={new Date()}
                        onChange={setStartDate}
                        placeholder="Select start date"
                        required
                        rightSection={<IconCalendar size={16} />}
                        rightSectionPointerEvents="none"
                        value={startDate}
                    />

                    {/* End Date Picker */}
                    <DatePickerInput
                        clearable
                        description="When should this plan end for the client?"
                        disabled={!startDate}
                        label="End Date"
                        minDate={startDate ?? new Date()}
                        onChange={setEndDate}
                        placeholder="Select end date"
                        required
                        rightSection={<IconCalendar size={16} />}
                        rightSectionPointerEvents="none"
                        value={endDate}
                    />

          {/* Search Input */}
          <div className={classes.searchWrapper}>
            <input
              className={classes.searchInput}
              onChange={handleSearchChange}
              placeholder="Search training plans..."
              type="text"
              value={searchInput}
            />
            {searchInput && (
              <button
                aria-label="Clear search"
                className={classes.clearButton}
                onClick={handleClearSearch}
                type="button"
              >
                <IconX size={14} />
              </button>
            )}
          </div>

          {/* Plans List */}
          {isLoading ? (
            <div className={classes.loadingState}>
              <Loader size="sm" />
              <Text c="dimmed" size="sm">
                Loading training plans...
              </Text>
            </div>
          ) : plans.length === 0 ? (
            <div className={classes.emptyState}>
              <Text c="dimmed" size="sm">
                {searchInput
                  ? "No plans match your search"
                  : "No training plan templates available"}
              </Text>
            </div>
          ) : (
            <div className={classes.plansList}>
              {plans.map((plan) => (
                <TrainingPlanTemplateItem
                  isSelected={selectedPlan?.id === plan.id}
                  key={plan.id}
                  onSelect={handleSelect}
                  plan={plan}
                />
              ))}
            </div>
          )}
        </Stack>
      }
      onClose={closeDrawer}
      title="Assign Training Plan"
    />
  );
};

export default AssignTrainingPlanDrawer;
