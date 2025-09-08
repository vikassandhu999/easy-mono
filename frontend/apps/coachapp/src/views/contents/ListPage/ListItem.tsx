import {ActionIcon, Badge, Card, Group, Menu, Stack, Text, Title} from '@mantine/core';
import {CopySimpleIcon, DotsThreeVerticalIcon, PencilSimpleIcon, TrashIcon} from '@phosphor-icons/react';
import {IconChefHat, IconClock, IconFlame, IconListDetails, IconUsers} from '@tabler/icons-react';
import React, {ReactNode} from 'react';

import {Content} from '@/api/contents.ts';
import {CONTENT_TYPE_CONFIG} from '@/components/Configs';
import {toTitleCase} from '@/utils/case';

interface Props {
    content: Content;
    onDelete?: (id: string) => void;
    onEdit?: (id: string) => void;
    onView: (id: string) => void;
}

function CaptionBadge({icon, text}: {icon?: React.ComponentType<any>; text: ReactNode | string}) {
    const IconComponent = icon;
    return (
        <Group
            align={'center'}
            style={{gap: 'var(--ce-size-xs)'}}
        >
            {IconComponent ? (
                <IconComponent
                    color={'var(--mantine-color-gray-6)'}
                    size={16}
                />
            ) : null}
            <Text
                c="gray.6"
                style={{
                    fontSize: 'var(--body-font-size)',
                    fontWeight: 400,
                    lineHeight: 'var(--body-line-height)',
                    wordBreak: 'break-word',
                }}
            >
                {typeof text === 'string' ? toTitleCase(text) : text}
            </Text>
        </Group>
    );
}

function ContentListItem({content, onEdit, onView}: Props) {
    const typeConfig = CONTENT_TYPE_CONFIG[content.type]!;
    return (
        <Card
            onClick={() => onView(content.id)}
            shadow={'xxs'}
            style={{
                borderRadius: 'var(--body-offset)',
                cursor: 'pointer',
                paddingBottom: 'var(--ce-size-md)',
                paddingInline: 'var(--ce-size-md)',
                paddingTop: 'var(--body-offset)',
            }}
            withBorder
        >
            <Stack
                gap={'var(--mantine-spacing-xs)'}
                style={{flex: 1, minWidth: 0}}
            >
                <Group
                    align={'flex-start'}
                    justify={'space-between'}
                    wrap={'nowrap'}
                >
                    <Stack gap={0}>
                        <Title
                            order={6}
                            style={{
                                flex: 1,
                                fontSize: 'var(--h6-font-size)',
                                fontWeight: 600,
                                lineHeight: 'var(--h6-line-height)',
                                marginBottom: 'var(--ce-size-xs)',
                                wordBreak: 'break-word',
                            }}
                        >
                            {content.name}
                        </Title>
                        <Badge
                            color={typeConfig.color}
                            size={'lg'}
                            style={{flex: 1, marginBottom: 'var(--ce-size-xs)'}}
                            tt={'capitalize'}
                            variant={'light'}
                        >
                            {typeConfig.label}
                        </Badge>
                    </Stack>

                    <Menu
                        position={'bottom-end'}
                        shadow={'lg'}
                    >
                        <Menu.Target>
                            <ActionIcon
                                aria-label="Content actions"
                                color={'dark'}
                                onClick={(e) => e.stopPropagation()}
                                radius={9999}
                                size={'xl'}
                                variant={'subtle'}
                            >
                                <DotsThreeVerticalIcon size={18} />
                            </ActionIcon>
                        </Menu.Target>

                        <Menu.Dropdown onClick={(e) => e.stopPropagation()}>
                            <Menu.Item
                                leftSection={<CopySimpleIcon size={20} />}
                                onClick={() => {
                                    console.log('Copy content:', content.id);
                                }}
                            >
                                Copy to client
                            </Menu.Item>

                            <Menu.Item
                                leftSection={<PencilSimpleIcon size={20} />}
                                onClick={() => {
                                    onEdit?.(content.id);
                                }}
                            >
                                Edit content
                            </Menu.Item>

                            <Menu.Divider />

                            <Menu.Item
                                color="red"
                                leftSection={<TrashIcon size={20} />}
                                onClick={() => {
                                    console.log('Delete content:', content.id);
                                }}
                            >
                                Delete content
                            </Menu.Item>
                        </Menu.Dropdown>
                    </Menu>
                </Group>

                {/* Content type badge and domain metadata */}
                <Group
                    gap={'var(--ce-size-2xs)'}
                    wrap={'wrap'}
                >
                    <DomainMetadata content={content} />
                </Group>
            </Stack>
        </Card>
    );
}

// Main component to render domain-specific metadata
function DomainMetadata({content}: {content: Content}) {
    switch (content.type) {
        case 'exercise':
            return <ExerciseMetadata metadata={content.exercise_metadata} />;
        case 'food':
            return <FoodMetadata metadata={content.food_metadata} />;
        case 'recipe':
            return <RecipeMetadata metadata={content.recipe_metadata} />;
        default:
            return null;
    }
}

function ExerciseMetadata({metadata}: {metadata: any}) {
    if (!metadata) return null;

    const details = [];

    if (metadata.muscle_groups?.length > 0) {
        const muscleText = metadata.muscle_groups
            .slice(0, 3)
            .map((m: string) => toTitleCase(m))
            .join(', ');
        const moreText = metadata.muscle_groups.length > 2 ? ` +${metadata.muscle_groups.length - 2} more` : '';

        details.push(
            <CaptionBadge
                key="muscles"
                text={
                    <>
                        {muscleText}
                        <small>{moreText}</small>
                    </>
                }
            />,
        );
    }

    return <>{details}</>;
}

// Render food-specific metadata
function FoodMetadata({metadata}: {metadata: any}) {
    if (!metadata) return null;

    const details = [];

    if (metadata.calories_per_100g) {
        details.push(
            <CaptionBadge
                icon={IconFlame}
                key="calories"
                text={`${metadata.calories_per_100g} cal/100g`}
            />,
        );
    }

    if (metadata.macros_per_100g?.protein_g) {
        details.push(
            <CaptionBadge
                icon={IconChefHat}
                key="protein"
                text={`${metadata.macros_per_100g.protein_g}g protein`}
            />,
        );
    }

    if (metadata.dietary_flags?.length > 0) {
        const flagText = metadata.dietary_flags
            .slice(0, 2)
            .map((f: string) => f.replace(/_/g, ' '))
            .join(', ');
        const moreText = metadata.dietary_flags.length > 2 ? ` +${metadata.dietary_flags.length - 2}` : '';

        details.push(
            <CaptionBadge
                icon={IconChefHat}
                key="flags"
                text={`${flagText}${moreText}`}
            />,
        );
    }

    return <>{details}</>;
}

// Render recipe-specific metadata
function RecipeMetadata({metadata}: {metadata: any}) {
    if (!metadata) return null;

    const details = [];

    if (metadata.servings_yield) {
        details.push(
            <CaptionBadge
                icon={IconUsers}
                key="servings"
                text={`${metadata.servings_yield} servings`}
            />,
        );
    }

    const totalTime = (metadata.prep_time_minutes || 0) + (metadata.cook_time_minutes || 0);
    if (totalTime > 0) {
        details.push(
            <CaptionBadge
                icon={IconClock}
                key="time"
                text={`${totalTime} min`}
            />,
        );
    }

    if (metadata.nutrition_per_serving?.calories) {
        details.push(
            <CaptionBadge
                icon={IconFlame}
                key="calories"
                text={`${metadata.nutrition_per_serving.calories} cal/serving`}
            />,
        );
    }

    if (metadata.difficulty) {
        details.push(
            <CaptionBadge
                icon={IconListDetails}
                key="difficulty"
                text={`${metadata.difficulty} difficulty`}
            />,
        );
    }

    return <>{details}</>;
}

export default ContentListItem;
