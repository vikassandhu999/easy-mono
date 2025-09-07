import {Stack, Group, Text, Title, Badge, Flex, Box, ThemeIcon, Card} from '@mantine/core';
import {Content, isMediaEmpty} from '@/api/contents.ts';
import {CONTENT_TYPE_CONFIG} from '@/components/Configs';
import {
    IconRun,
    IconChefHat,
    IconListDetails,
    IconClock,
    IconUsers,
    IconFlame,
    IconBarbell,
    IconApple,
} from '@tabler/icons-react';
import DOMPurify from 'dompurify';
import MediaDisplay from './MediaDisplay';
import {toTitleCase} from '@/utils/case';
import React from 'react';

type Props = {
    content: Content;
    titleRef: (instance: HTMLHeadingElement) => void;
};

function DisplayStat({label, text}: {label: string; text: number | string}) {
    return (
        <Box>
            <Text
                c="dimmed"
                size="xs"
                fw={500}
                tt="uppercase"
                style={{
                    letterSpacing: '0.5px',
                    marginBottom: '4px',
                }}
            >
                {label}
            </Text>
            <Text
                fw={600}
                size="sm"
                c="dark.9"
                style={{
                    textTransform: 'capitalize',
                }}
            >
                {text}
            </Text>
        </Box>
    );
}

function MetricBadge({
    icon,
    label,
    value,
    color = 'gray',
}: {
    icon: React.ComponentType<any>;
    label: string;
    value: string | string[];
    color?: string;
}) {
    const IconComponent = icon;
    const contentConfig = CONTENT_TYPE_CONFIG[color as keyof typeof CONTENT_TYPE_CONFIG];

    const text = Array.isArray(value)
        ? value.map((m: string) => toTitleCase(m)).join(', ')
        : toTitleCase(value.toString());

    return (
        <Group
            gap="sm"
            wrap={'wrap'}
            style={{maxWidth: '300px'}}
        >
            <ThemeIcon
                size={'md'}
                radius="md"
                variant="light"
                color={
                    contentConfig?.color
                        ? contentConfig.color.replace('var(--mantine-color-', '').replace(')', '')
                        : 'gray'
                }
            >
                <IconComponent size={24} />
            </ThemeIcon>
            <Stack gap={1}>
                <Text
                    size="xs"
                    c="dimmed"
                    fw={500}
                    style={{lineHeight: 1.2}}
                >
                    {label}
                </Text>
                <Text
                    size="sm"
                    fw={600}
                    style={{lineHeight: 1.2, textWrap: 'wrap'}}
                >
                    {text}
                </Text>
            </Stack>
        </Group>
    );
}

// Exercise-specific metadata display
function ExerciseMetadataDisplay({metadata}: {metadata: any}) {
    if (!metadata) return null;

    const displayItems = [];

    if (metadata.difficulty) {
        displayItems.push(
            <MetricBadge
                key="difficulty"
                icon={IconBarbell}
                label="Difficulty"
                value={metadata.difficulty}
                color="exercise"
            />,
        );
    }

    if (metadata.calories_burned_per_minute) {
        displayItems.push(
            <MetricBadge
                key="calories"
                icon={IconFlame}
                label="Cal/min"
                value={metadata.calories_burned_per_minute}
                color="exercise"
            />,
        );
    }

    if (metadata.muscle_groups?.length > 0) {
        const muscleText = metadata.muscle_groups.map((m: string) => toTitleCase(m)).join(', ');

        displayItems.push(
            <MetricBadge
                key="muscles"
                icon={IconRun}
                label="Muscle Groups"
                value={muscleText}
                color="exercise"
            />,
        );
    }

    if (metadata.equipment?.length > 0) {
        const equipmentText = metadata.equipment.map((e: string) => toTitleCase(e)).join(', ');
        displayItems.push(
            <MetricBadge
                key="equipment"
                icon={IconBarbell}
                label="Equipment"
                value={equipmentText}
                color="exercise"
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
                key="calories"
                icon={IconFlame}
                label="Cal/100g"
                value={metadata.calories_per_100g}
                color="food"
            />,
        );
    }

    if (metadata.macros_per_100g?.protein_g) {
        displayItems.push(
            <MetricBadge
                key="protein"
                icon={IconApple}
                label="Protein/100g"
                value={`${metadata.macros_per_100g.protein_g}g`}
                color="food"
            />,
        );
    }

    if (metadata.macros_per_100g?.carbs_g) {
        displayItems.push(
            <MetricBadge
                key="carbs"
                icon={IconApple}
                label="Carbs/100g"
                value={`${metadata.macros_per_100g.carbs_g}g`}
                color="food"
            />,
        );
    }

    if (metadata.macros_per_100g?.fats_g) {
        displayItems.push(
            <MetricBadge
                key="fats"
                icon={IconApple}
                label="Fats/100g"
                value={`${metadata.macros_per_100g.fats_g}g`}
                color="food"
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
                key="dietary"
                icon={IconChefHat}
                label="Dietary"
                value={`${flagText}${moreText}`}
                color="food"
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

// Recipe-specific metadata display
function RecipeMetadataDisplay({metadata}: {metadata: any}) {
    if (!metadata) return null;

    const displayItems = [];

    if (metadata.servings_yield) {
        displayItems.push(
            <MetricBadge
                key="servings"
                icon={IconUsers}
                label="Servings"
                value={metadata.servings_yield}
                color="recipe"
            />,
        );
    }

    const totalTime = (metadata.prep_time_minutes || 0) + (metadata.cook_time_minutes || 0);
    if (totalTime > 0) {
        displayItems.push(
            <MetricBadge
                key="time"
                icon={IconClock}
                label="Total Time"
                value={`${totalTime} min`}
                color="recipe"
            />,
        );
    }

    if (metadata.prep_time_minutes) {
        displayItems.push(
            <MetricBadge
                key="prep"
                icon={IconClock}
                label="Prep Time"
                value={`${metadata.prep_time_minutes} min`}
                color="recipe"
            />,
        );
    }

    if (metadata.difficulty) {
        displayItems.push(
            <MetricBadge
                key="difficulty"
                icon={IconListDetails}
                label="Difficulty"
                value={metadata.difficulty}
                color="recipe"
            />,
        );
    }

    if (metadata.nutrition_per_serving?.calories) {
        displayItems.push(
            <MetricBadge
                key="calories"
                icon={IconFlame}
                label="Cal/serving"
                value={metadata.nutrition_per_serving.calories}
                color="recipe"
            />,
        );
    }

    if (metadata.meal_types?.length > 0) {
        displayItems.push(
            <MetricBadge
                key="meal-types"
                icon={IconChefHat}
                label="Meal Type"
                value={
                    metadata.meal_types.slice(0, 2).join(', ') +
                    (metadata.meal_types.length > 2 ? ` +${metadata.meal_types.length - 2}` : '')
                }
                color="recipe"
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

export default function HeroSection({content, titleRef}: Props) {
    const sanitizedContent = DOMPurify.sanitize(content.instructions || '');
    const contentConfig = CONTENT_TYPE_CONFIG[content.type];

    return (
        <Stack>
            {/* Main Content Card */}
            <Card
                style={{
                    paddingLeft: 'var(--title3-font-size)',
                    paddingRight: 'var(--title3-font-size)',
                    paddingBottom: 'var(--title3-font-size)',
                    paddingTop: 'var(--title3-offset)',
                    borderRadius: 'var(--title3-offset)',
                    boxShadow: 'var(--shadow-sm)',
                }}
                withBorder
            >
                <Stack gap="xl">
                    <Box>
                        <Group
                            justify="start"
                            align="start"
                            wrap="nowrap"
                        >
                            <Title
                                order={5}
                                ref={titleRef}
                                style={{
                                    wordBreak: 'break-word',
                                    color: 'var(--mantine-color-text-primary)',
                                    marginBottom: 'var(--ce-size-xs)',
                                }}
                            >
                                {content.name}
                            </Title>

                            <Badge
                                size="md"
                                radius={9999}
                                variant="light"
                                color={contentConfig.iconColor.replace('var(--mantine-color-', '').replace(')', '')}
                                style={{
                                    textTransform: 'capitalize',
                                    fontWeight: 600,
                                }}
                            >
                                {contentConfig.label}
                            </Badge>
                        </Group>

                        {content.instructions && (
                            <Text
                                c="dimmed"
                                lineClamp={4}
                                style={{
                                    wordBreak: 'break-word',
                                    fontSize: 'var(--callout-font-size)',
                                    lineHeight: 'var(--callout-line-height)',
                                    marginBottom: 'var(--callout-offset)',
                                }}
                                dangerouslySetInnerHTML={{__html: sanitizedContent}}
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
                    media={content.media}
                    fallbackThumbnail={content.thumbnail_url}
                />
            ) : null}
        </Stack>
    );
}
