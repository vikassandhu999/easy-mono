import {APIErrorParser} from '@easy/error-parser';
import {ActionIcon, Button, Loader, Modal, Text} from '@mantine/core';
import {useDisclosure} from '@mantine/hooks';
import {IconMinus, IconPlus, IconTrash} from '@tabler/icons-react';
import {useCallback, useEffect, useState} from 'react';

import {useUpdateMealItem} from '@/services/meal_items';
import {notifyError, notifySuccess} from '@/utils/notification';

import classes from './styles.module.css';

type MealRecipeItemProps = {
    item: {
        id: string;
        recipe_id: string;
        recipe?: {
            id: string;
            name: string;
        };
        servings: number | string;
        meal_id: string;
    };
    onDelete: () => void;
    nutritionPlanId: string;
};

// Quick preset serving sizes
const SERVING_PRESETS = [0.5, 1, 1.5, 2, 2.5, 3];

interface ServingModalProps {
    currentServings: number;
    onClose: () => void;
    onDelete: () => void;
    onSave: (servings: number) => Promise<void>;
    opened: boolean;
    recipeName: string;
}

const ServingModal = ({opened, onClose, recipeName, currentServings, onSave, onDelete}: ServingModalProps) => {
    const [servings, setServings] = useState(currentServings);
    const [isSaving, setIsSaving] = useState(false);

    // Reset servings when modal opens
    useEffect(() => {
        if (opened) {
            setServings(currentServings);
        }
    }, [opened, currentServings]);

    const handleSave = async () => {
        if (servings === currentServings) {
            onClose();
            return;
        }
        setIsSaving(true);
        try {
            await onSave(servings);
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    const increment = () => setServings((s) => Math.min(10, s + 0.5));
    const decrement = () => setServings((s) => Math.max(0.5, s - 0.5));

    return (
        <Modal
            centered
            onClose={onClose}
            opened={opened}
            padding={0}
            radius="lg"
            size="xs"
            withCloseButton={false}
        >
            <div className={classes.servingModal}>
                {/* Header */}
                <div className={classes.servingModalHeader}>
                    <Text className={classes.servingModalTitle}>{recipeName}</Text>
                    <Text className={classes.servingModalSubtitle}>Adjust portion size</Text>
                </div>

                {/* Stepper Control */}
                <div className={classes.servingStepperSection}>
                    <ActionIcon
                        aria-label="Decrease"
                        className={classes.servingStepperButton}
                        disabled={servings <= 0.5 || isSaving}
                        onClick={decrement}
                        radius="xl"
                        size="xl"
                        variant="light"
                    >
                        <IconMinus size={20} />
                    </ActionIcon>

                    <div className={classes.servingStepperValue}>
                        <span className={classes.servingStepperNumber}>{servings}</span>
                        <span className={classes.servingStepperLabel}>{servings === 1 ? 'serving' : 'servings'}</span>
                    </div>

                    <ActionIcon
                        aria-label="Increase"
                        className={classes.servingStepperButton}
                        disabled={servings >= 10 || isSaving}
                        onClick={increment}
                        radius="xl"
                        size="xl"
                        variant="light"
                    >
                        <IconPlus size={20} />
                    </ActionIcon>
                </div>

                {/* Quick Presets */}
                <div className={classes.servingPresets}>
                    {SERVING_PRESETS.map((preset) => (
                        <button
                            className={`${classes.servingPresetButton} ${servings === preset ? classes.servingPresetActive : ''}`}
                            disabled={isSaving}
                            key={preset}
                            onClick={() => setServings(preset)}
                            type="button"
                        >
                            {preset}
                        </button>
                    ))}
                </div>

                {/* Actions */}
                <div className={classes.servingModalActions}>
                    <Button
                        className={classes.servingModalRemove}
                        color="red"
                        disabled={isSaving}
                        onClick={() => {
                            onDelete();
                            onClose();
                        }}
                        size="md"
                        variant="subtle"
                    >
                        <IconTrash size={16} />
                        Remove
                    </Button>

                    <Button
                        color="brand"
                        disabled={isSaving}
                        onClick={handleSave}
                        radius="lg"
                        size="md"
                    >
                        {isSaving ? (
                            <Loader
                                color="white"
                                size="xs"
                            />
                        ) : (
                            'Done'
                        )}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export const MealRecipeItem = ({item, onDelete, nutritionPlanId}: MealRecipeItemProps) => {
    const recipeName = item.recipe?.name || 'Unknown Recipe';
    const servings = typeof item.servings === 'string' ? parseFloat(item.servings) : item.servings;
    const [opened, {open, close}] = useDisclosure(false);

    const [updateMealItem] = useUpdateMealItem();

    const handleSave = useCallback(
        async (newServings: number) => {
            try {
                await updateMealItem({
                    id: item.id,
                    servings: newServings,
                    nutrition_plan_id: nutritionPlanId,
                }).unwrap();
                notifySuccess('Portion updated');
            } catch (e) {
                const err_msg = new APIErrorParser(e).humanize();
                notifyError(err_msg);
                throw e; // Re-throw to let modal know save failed
            }
        },
        [item.id, nutritionPlanId, updateMealItem],
    );

    return (
        <>
            <ServingModal
                currentServings={servings}
                onClose={close}
                onDelete={onDelete}
                onSave={handleSave}
                opened={opened}
                recipeName={recipeName}
            />

            <div
                className={classes.recipeItem}
                onClick={open}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        open();
                    }
                }}
                role="button"
                tabIndex={0}
            >
                <div className={classes.recipeItemInfo}>
                    <Text className={classes.recipeName}>{recipeName}</Text>
                    <Text className={classes.recipeServings}>
                        {servings} {servings === 1 ? 'serving' : 'servings'}
                    </Text>
                </div>

                <ActionIcon
                    aria-label={`Remove ${recipeName}`}
                    className={classes.deleteButton}
                    color="red"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    size="sm"
                    variant="subtle"
                >
                    <IconTrash size={14} />
                </ActionIcon>
            </div>
        </>
    );
};

export default MealRecipeItem;
