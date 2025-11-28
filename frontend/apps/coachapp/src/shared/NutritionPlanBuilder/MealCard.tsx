import {ActionIcon, Text} from '@mantine/core';
import {useDisclosure} from '@mantine/hooks';
import {IconChevronDown, IconPlus} from '@tabler/icons-react';

import {Meal, MealDaytime} from '@/services/nutrition_plans';

import MealRecipeItem from './MealRecipeItem';
import classes from './styles.module.css';

type MealCardProps = {
    mealType: {
        label: string;
        value: MealDaytime;
        icon?: React.ReactNode;
    };
    meal: Meal | undefined;
    onAddRecipe: (mealId: string | undefined, daytime: MealDaytime, label: string) => void;
    onDeleteRecipe: (itemId: string, mealId: string) => void;
    nutritionPlanId: string;
    defaultExpanded?: boolean;
};

export const MealCard = ({
    mealType,
    meal,
    onAddRecipe,
    onDeleteRecipe,
    nutritionPlanId,
    defaultExpanded = false,
}: MealCardProps) => {
    const [isOpen, {toggle}] = useDisclosure(defaultExpanded);
    const itemCount = meal?.meal_items?.length ?? 0;
    const hasItems = itemCount > 0;

    const handleAddClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onAddRecipe(meal?.id, mealType.value, mealType.label);
    };

    return (
        <div className={classes.mealSection}>
            {/* Clickable Header */}
            <div
                aria-expanded={isOpen}
                className={classes.mealSectionHeader}
                onClick={toggle}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggle();
                    }
                }}
                role="button"
                tabIndex={0}
            >
                {/* Left: Title & Count */}
                <div className={classes.mealSectionInfo}>
                    <div className={classes.mealTitleGroup}>
                        <Text className={classes.mealTitle}>{mealType.label}</Text>
                        {!isOpen && hasItems && (
                            <Text className={classes.mealSubtitle}>
                                {itemCount} {itemCount === 1 ? 'item' : 'items'}
                            </Text>
                        )}
                    </div>
                </div>

                {/* Right: Actions */}
                <div className={classes.mealSectionActions}>
                    {hasItems && <span className={classes.itemCountActive}>{itemCount}</span>}
                    <ActionIcon
                        aria-label={`Add recipe to ${mealType.label}`}
                        className={classes.addButton}
                        color="brand"
                        onClick={handleAddClick}
                        radius="md"
                        size="sm"
                        variant="light"
                    >
                        <IconPlus size={16} />
                    </ActionIcon>
                    <IconChevronDown
                        className={isOpen ? classes.chevronIconOpen : classes.chevronIcon}
                        size={18}
                    />
                </div>
            </div>

            {/* Collapsible Body */}
            <div className={isOpen ? classes.mealSectionBodyOpen : classes.mealSectionBody}>
                <div className={classes.mealSectionBodyInner}>
                    {hasItems ? (
                        <div className={classes.recipesList}>
                            {meal!.meal_items.map((item) => (
                                <MealRecipeItem
                                    item={item}
                                    key={item.id}
                                    nutritionPlanId={nutritionPlanId}
                                    onDelete={() => {
                                        onDeleteRecipe(item.id, meal!.id);
                                    }}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className={classes.emptyState}>
                            <Text className={classes.emptyStateText}>Tap + to add items</Text>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MealCard;
