import {humanizeError} from '@easy/error-parser';
import {Button, Loader, Stack, Text} from '@mantine/core';
import {DatePickerInput} from '@mantine/dates';
import {useDebouncedValue} from '@mantine/hooks';
import {IconCalendar, IconX} from '@tabler/icons-react';
import {useMemo, useState} from 'react';

import useParamsDrawer from '@/hooks/useParamDrawer';
import {NutritionPlan, useAssignNutritionPlan, useListNutritionPlans} from '@/services/nutrition_plans';
import AutoDrawer from '@/shared/AutoDrawer/AutoDrawer';
import {notifyError, notifySuccess} from '@/utils/notification';

import classes from './AssignPlanDrawer.module.css';

interface NutritionPlanTemplateItemProps {
    isSelected: boolean;
    onSelect: (plan: NutritionPlan) => void;
    plan: NutritionPlan;
}

const NutritionPlanTemplateItem = ({plan, onSelect, isSelected}: NutritionPlanTemplateItemProps) => {
    const mealsCount = plan.meals?.length ?? 0;

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
                    className={classes.planName}
                    fw={500}
                    size="sm"
                >
                    {plan.name}
                </Text>
                {plan.description && (
                    <Text
                        c="dimmed"
                        lineClamp={1}
                        size="xs"
                    >
                        {plan.description}
                    </Text>
                )}
                <div className={classes.planMeta}>
                    {plan.duration_weeks && (
                        <span className={classes.metaTag}>
                            {plan.duration_weeks} {plan.duration_weeks === 1 ? 'week' : 'weeks'}
                        </span>
                    )}
                    {mealsCount > 0 && (
                        <span className={classes.metaTag}>
                            {mealsCount} {mealsCount === 1 ? 'meal' : 'meals'}
                        </span>
                    )}
                </div>
            </div>
            <div className={`${classes.selectIndicator} ${isSelected ? classes.selectIndicatorActive : ''}`} />
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
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const AssignNutritionPlanDrawer = () => {
    const {closeDrawer, getDrawerParams} = useParamsDrawer({});
    const {client_id} = getDrawerParams();

    const [selectedPlan, setSelectedPlan] = useState<null | NutritionPlan>(null);
    const [startDate, setStartDate] = useState<Date | null>(new Date());
    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch] = useDebouncedValue(searchInput, 300);
    const {closeAllDrawers} = useParamsDrawer({});

    const [assignPlan, {isLoading: isAssigning}] = useAssignNutritionPlan();

    const {data, isLoading} = useListNutritionPlans({
        is_template: true,
        search: debouncedSearch || undefined,
    });

    const plans = useMemo(() => data?.pages?.flatMap((page) => page.records) ?? [], [data?.pages]);

    const handleSelectPlan = (plan: NutritionPlan) => {
        setSelectedPlan(plan.id === selectedPlan?.id ? null : plan);
    };

    const handleAssign = async () => {
        if (!selectedPlan || !client_id) return;

        try {
            await assignPlan({
                id: selectedPlan.id,
                client_id,
                start_date: formatDateForApi(startDate),
            }).unwrap();
            notifySuccess(`"${selectedPlan.name}" assigned successfully`);
            closeDrawer();
            closeAllDrawers();
        } catch (error) {
            const errMsg = humanizeError(error);
            notifyError(errMsg);
        }
    };

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchInput(event.currentTarget.value);
    };

    const handleClearSearch = () => {
        setSearchInput('');
    };

    return (
        <AutoDrawer
            actions={
                <Button
                    color="green"
                    disabled={!selectedPlan || !startDate}
                    fullWidth
                    loading={isAssigning}
                    onClick={handleAssign}
                    radius="xl"
                    size="sm"
                >
                    Assign Plan
                </Button>
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

                    {/* Search Input */}
                    <div className={classes.searchWrapper}>
                        <input
                            className={classes.searchInput}
                            onChange={handleSearchChange}
                            placeholder="Search templates..."
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

                    {/* Plan List */}
                    {isLoading ? (
                        <div className={classes.centered}>
                            <Loader size="sm" />
                        </div>
                    ) : plans.length === 0 ? (
                        <div className={classes.emptyState}>
                            <Text
                                c="dimmed"
                                size="sm"
                                ta="center"
                            >
                                {searchInput
                                    ? 'No templates match your search'
                                    : 'No nutrition plan templates available'}
                            </Text>
                        </div>
                    ) : (
                        <Stack gap="xs">
                            {plans.map((plan) => (
                                <NutritionPlanTemplateItem
                                    isSelected={selectedPlan?.id === plan.id}
                                    key={plan.id}
                                    onSelect={handleSelectPlan}
                                    plan={plan}
                                />
                            ))}
                        </Stack>
                    )}
                </Stack>
            }
            onClose={closeDrawer}
            title="Assign Nutrition Plan"
        />
    );
};

export default AssignNutritionPlanDrawer;
