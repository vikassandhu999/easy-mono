import {humanizeError} from '@easy/error-parser';
import {Button, Group, Loader, Stack, Text} from '@mantine/core';
import {useDebouncedValue} from '@mantine/hooks';
import {IconSearch, IconX} from '@tabler/icons-react';
import {useMemo, useState} from 'react';

import useParamsDrawer from '@/hooks/useParamDrawer';
import {TrainingPlan, useAssignTrainingPlan, useListTrainingPlans} from '@/services/training_plans';
import AutoDrawer from '@/shared/AutoDrawer/AutoDrawer';
import {notifyError, notifySuccess} from '@/utils/notification';

import classes from './AssignPlanDrawer.module.css';

interface TrainingPlanTemplateItemProps {
    isSelected: boolean;
    onSelect: (plan: TrainingPlan) => void;
    plan: TrainingPlan;
}

const TrainingPlanTemplateItem = ({plan, onSelect, isSelected}: TrainingPlanTemplateItemProps) => {
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
                    {plan.duration_weeks && (
                        <span className={classes.tag}>
                            {plan.duration_weeks} {plan.duration_weeks === 1 ? 'week' : 'weeks'}
                        </span>
                    )}
                </Group>
            </div>
            <div className={`${classes.checkbox} ${isSelected ? classes.checkboxSelected : ''}`}>
                {isSelected && <span className={classes.checkmark}>✓</span>}
            </div>
        </div>
    );
};

const AssignTrainingPlanDrawer = () => {
    const {closeDrawer, getDrawerParams} = useParamsDrawer({});
    const {client_id} = getDrawerParams();

    const [selectedPlan, setSelectedPlan] = useState<null | TrainingPlan>(null);
    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch] = useDebouncedValue(searchInput, 300);

    const [assignPlan, {isLoading: isAssigning}] = useAssignTrainingPlan();

    const {data, isLoading} = useListTrainingPlans({
        search: debouncedSearch || undefined,
        is_template: true,
    });

    const plans = useMemo(() => data?.pages?.flatMap((page) => page.records) ?? [], [data?.pages]);

    const handleSelect = (plan: TrainingPlan) => {
        setSelectedPlan(plan.id === selectedPlan?.id ? null : plan);
    };

    const handleAssign = async () => {
        if (!selectedPlan || !client_id) return;

        try {
            await assignPlan({
                id: selectedPlan.id,
                client_id,
            }).unwrap();
            notifySuccess(`"${selectedPlan.name}" assigned successfully`);
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
        setSearchInput('');
    };

    return (
        <AutoDrawer
            actions={
                <Group w="100%">
                    <Button
                        color="blue"
                        disabled={!selectedPlan}
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
                    {/* Search Input */}
                    <div className={classes.searchWrapper}>
                        <IconSearch
                            className={classes.searchIcon}
                            size={16}
                        />
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
                            <Text
                                c="dimmed"
                                size="sm"
                            >
                                Loading training plans...
                            </Text>
                        </div>
                    ) : plans.length === 0 ? (
                        <div className={classes.emptyState}>
                            <Text
                                c="dimmed"
                                size="sm"
                            >
                                {searchInput ? 'No plans match your search' : 'No training plan templates available'}
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
