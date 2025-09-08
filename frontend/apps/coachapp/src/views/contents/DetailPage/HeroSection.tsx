import {Badge, Box, Card, Flex, Group, Stack, Text, ThemeIcon, Title} from '@mantine/core';
import {
    IconApple,
    IconBarbell,
    IconChefHat,
    IconClock,
    IconFlame,
    IconListDetails,
    IconRun,
    IconUsers,
} from '@tabler/icons-react';
import DOMPurify from 'dompurify';
import React from 'react';

import {Content, isMediaEmpty} from '@/api/contents.ts';
import {CONTENT_TYPE_CONFIG} from '@/components/Configs';
import {toTitleCase} from '@/utils/case';

import MediaDisplay from './MediaDisplay';

type Props = {
    content: Content;
    titleRef: (instance: HTMLHeadingElement) => void;
};

export default function HeroSection({content, titleRef}: Props) {
    const sanitizedContent = DOMPurify.sanitize(content.instructions || '');
    const contentConfig = CONTENT_TYPE_CONFIG[content.type];

    return (
        <Stack>
            {/* Main Content Card */}
            <Card
                style={{
                    borderRadius: 'var(--title3-offset)',
                    boxShadow: 'var(--shadow-sm)',
                    paddingBottom: 'var(--title3-font-size)',
                    paddingLeft: 'var(--title3-font-size)',
                    paddingRight: 'var(--title3-font-size)',
                    paddingTop: 'var(--title3-offset)',
                }}
                withBorder
            >
                <Stack gap="xl">
                    <Box>
                        <Group
                            align="start"
                            justify="start"
                            wrap="nowrap"
                        >
                            <Title
                                order={5}
                                ref={titleRef}
                                style={{
                                    color: 'var(--mantine-color-text-primary)',
                                    marginBottom: 'var(--ce-size-xs)',
                                    wordBreak: 'break-word',
                                }}
                            >
                                {content.name}
                            </Title>

                            <Badge
                                color={contentConfig.iconColor.replace('var(--mantine-color-', '').replace(')', '')}
                                radius={9999}
                                size="md"
                                style={{
                                    fontWeight: 600,
                                    textTransform: 'capitalize',
                                }}
                                variant="light"
                            >
                                {contentConfig.label}
                            </Badge>
                        </Group>

                        {content.instructions && (
                            <Text
                                c="dimmed"
                                dangerouslySetInnerHTML={{__html: sanitizedContent}}
                                lineClamp={4}
                                style={{
                                    fontSize: 'var(--callout-font-size)',
                                    lineHeight: 'var(--callout-line-height)',
                                    marginBottom: 'var(--callout-offset)',
                                    wordBreak: 'break-word',
                                }}
                            />
                        )}
                    </Box>

                    {content.duration && (
                        <DisplayStat
                            label="Duration"
                            text={`${content.duration} seconds`}
                        />
                    )}

                    {/* Domain-specific metadata display */}
                    <DomainMetadataDisplay content={content} />
                </Stack>
            </Card>
            {!isMediaEmpty(content.media) ? (
                <MediaDisplay
                    fallbackThumbnail={content.thumbnail_url}
                    media={content.media}
                />
            ) : null}
        </Stack>
    );
}

function DisplayStat({label, text}: {label: string; text: number | string}) {
    return (
        <Box>
            <Text
                c="dimmed"
                fw={500}
                size="xs"
                style={{
                    letterSpacing: '0.5px',
                    marginBottom: '4px',
                }}
                tt="uppercase"
            >
                {label}
            </Text>
            <Text
                c="dark.9"
                fw={600}
                size="sm"
                style={{
                    textTransform: 'capitalize',
                }}
            >
                {text}
            </Text>
        </Box>
    );
}

// Main component to render domain-specific metadata
function DomainMetadataDisplay({content}: {content: Content}) {
    switch (content.type) {
        case 'exercise':
            return <ExerciseMetadataDisplay metadata={content.exercise_metadata} />;
        case 'food':
            return <FoodMetadataDisplay metadata={content.food_metadata} />;
        case 'recipe':
            return <RecipeMetadataDisplay metadata={content.recipe_metadata} />;
        default:
            return null;
    }
}

// Exercise-specific metadata display
function ExerciseMetadataDisplay({metadata}: {metadata: any}) {
    if (!metadata) return null;

    const displayItems = [];

    if (metadata.difficulty) {
        displayItems.push(
            <MetricBadge
                color="exercise"
                icon={IconBarbell}
                key="difficulty"
                label="Difficulty"
                value={metadata.difficulty}
            />,
        );
    }

    if (metadata.calories_burned_per_minute) {
        displayItems.push(
            <MetricBadge
                color="exercise"
                icon={IconFlame}
                key="calories"
                label="Cal/min"
                value={metadata.calories_burned_per_minute}
            />,
        );
    }

    if (metadata.muscle_groups?.length > 0) {
        const muscleText = metadata.muscle_groups.map((m: string) => toTitleCase(m)).join(', ');

        displayItems.push(
            <MetricBadge
                color="exercise"
                icon={IconRun}
                key="muscles"
                label="Muscle Groups"
                value={muscleText}
            />,
        );
    }

    if (metadata.equipment?.length > 0) {
        const equipmentText = metadata.equipment.map((e: string) => toTitleCase(e)).join(', ');
        displayItems.push(
            <MetricBadge
                color="exercise"
                icon={IconBarbell}
                key="equipment"
                label="Equipment"
                value={equipmentText}
            />,
        );
    }

    return displayItems.length > 0 ? (
        <Flex
            gap={'lg'}
            wrap="wrap"
        >
            {displayItems}
        </Flex>
    ) : null;
}

// Food-specific metadata display
function FoodMetadataDisplay({metadata}: {metadata: any}) {
    if (!metadata) return null;

    const displayItems = [];

    if (metadata.calories_per_100g) {
        displayItems.push(
            <MetricBadge
                color="food"
                icon={IconFlame}
                key="calories"
                label="Cal/100g"
                value={metadata.calories_per_100g}
            />,
        );
    }

    if (metadata.macros_per_100g?.protein_g) {
        displayItems.push(
            <MetricBadge
                color="food"
                icon={IconApple}
                key="protein"
                label="Protein/100g"
                value={`${metadata.macros_per_100g.protein_g}g`}
            />,
        );
    }

    if (metadata.macros_per_100g?.carbs_g) {
        displayItems.push(
            <MetricBadge
                color="food"
                icon={IconApple}
                key="carbs"
                label="Carbs/100g"
                value={`${metadata.macros_per_100g.carbs_g}g`}
            />,
        );
    }

    if (metadata.macros_per_100g?.fats_g) {
        displayItems.push(
            <MetricBadge
                color="food"
                icon={IconApple}
                key="fats"
                label="Fats/100g"
                value={`${metadata.macros_per_100g.fats_g}g`}
            />,
        );
    }

    if (metadata.dietary_flags?.length > 0) {
        const flagText = metadata.dietary_flags
            .slice(0, 2)
            .map((f: string) => f.replace(/_/g, ' '))
            .join(', ');
        const moreText = metadata.dietary_flags.length > 2 ? ` +${metadata.dietary_flags.length - 2}` : '';

        displayItems.push(
            <MetricBadge
                color="food"
                icon={IconChefHat}
                key="dietary"
                label="Dietary"
                value={`${flagText}${moreText}`}
            />,
        );
    }

    return displayItems.length > 0 ? (
        <Flex
            gap={'lg'}
            wrap="wrap"
        >
            {displayItems}
        </Flex>
    ) : null;
}

function MetricBadge({
    color = 'gray',
    icon,
    label,
    value,
}: {
    color?: string;
    icon: React.ComponentType<any>;
    label: string;
    value: string | string[];
}) {
    const IconComponent = icon;
    const contentConfig = CONTENT_TYPE_CONFIG[color as keyof typeof CONTENT_TYPE_CONFIG];

    const text = Array.isArray(value)
        ? value.map((m: string) => toTitleCase(m)).join(', ')
        : toTitleCase(value.toString());

    return (
        <Group
            gap="sm"
            style={{maxWidth: '300px'}}
            wrap={'wrap'}
        >
            <ThemeIcon
                color={
                    contentConfig?.color
                        ? contentConfig.color.replace('var(--mantine-color-', '').replace(')', '')
                        : 'gray'
                }
                radius="md"
                size={'md'}
                variant="light"
            >
                <IconComponent size={24} />
            </ThemeIcon>
            <Stack gap={1}>
                <Text
                    c="dimmed"
                    fw={500}
                    size="xs"
                    style={{lineHeight: 1.2}}
                >
                    {label}
                </Text>
                <Text
                    fw={600}
                    size="sm"
                    style={{lineHeight: 1.2, textWrap: 'wrap'}}
                >
                    {text}
                </Text>
            </Stack>
        </Group>
    );
}

// Recipe-specific metadata display
function RecipeMetadataDisplay({metadata}: {metadata: any}) {
    if (!metadata) return null;

    const displayItems = [];

    if (metadata.servings_yield) {
        displayItems.push(
            <MetricBadge
                color="recipe"
                icon={IconUsers}
                key="servings"
                label="Servings"
                value={metadata.servings_yield}
            />,
        );
    }

    const totalTime = (metadata.prep_time_minutes || 0) + (metadata.cook_time_minutes || 0);
    if (totalTime > 0) {
        displayItems.push(
            <MetricBadge
                color="recipe"
                icon={IconClock}
                key="time"
                label="Total Time"
                value={`${totalTime} min`}
            />,
        );
    }

    if (metadata.prep_time_minutes) {
        displayItems.push(
            <MetricBadge
                color="recipe"
                icon={IconClock}
                key="prep"
                label="Prep Time"
                value={`${metadata.prep_time_minutes} min`}
            />,
        );
    }

    if (metadata.difficulty) {
        displayItems.push(
            <MetricBadge
                color="recipe"
                icon={IconListDetails}
                key="difficulty"
                label="Difficulty"
                value={metadata.difficulty}
            />,
        );
    }

    if (metadata.nutrition_per_serving?.calories) {
        displayItems.push(
            <MetricBadge
                color="recipe"
                icon={IconFlame}
                key="calories"
                label="Cal/serving"
                value={metadata.nutrition_per_serving.calories}
            />,
        );
    }

    if (metadata.meal_types?.length > 0) {
        displayItems.push(
            <MetricBadge
                color="recipe"
                icon={IconChefHat}
                key="meal-types"
                label="Meal Type"
                value={
                    metadata.meal_types.slice(0, 2).join(', ') +
                    (metadata.meal_types.length > 2 ? ` +${metadata.meal_types.length - 2}` : '')
                }
            />,
        );
    }

    return displayItems.length > 0 ? (
        <Flex
            gap={'lg'}
            wrap="wrap"
        >
            {displayItems}
        </Flex>
    ) : null;
}
