import React, {ReactNode} from 'react';
import {Group, ActionIcon, Stack, Text, Card, Title, Badge, Menu} from '@mantine/core';
import {IconChefHat, IconListDetails, IconClock, IconUsers, IconFlame} from '@tabler/icons-react';
import {Content} from '@/Api/Contents';
import {toTitleCase} from '@/Utils/case';
import {CONTENT_TYPE_CONFIG} from '@/Components/Configs';
import {DotsThreeVerticalIcon, CopySimpleIcon, PencilSimpleIcon, TrashIcon} from '@phosphor-icons/react';

function CaptionBadge({icon, text}: {icon?: React.ComponentType<any>; text: string | ReactNode}) {
    const IconComponent = icon;
    return (
        <Group
            style={{gap: 'var(--ce-size-xs)'}}
            align={'center'}
        >
            {IconComponent ? (
                <IconComponent
                    size={16}
                    color={'var(--mantine-color-gray-6)'}
                />
            ) : null}
            <Text
                c="gray.6"
                style={{
                    wordBreak: 'break-word',
                    fontSize: 'var(--body-font-size)',
                    lineHeight: 'var(--body-line-height)',
                    fontWeight: 400,
                }}
            >
                {typeof text === 'string' ? toTitleCase(text) : text}
            </Text>
        </Group>
    );
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
                key="calories"
                icon={IconFlame}
                text={`${metadata.calories_per_100g} cal/100g`}
            />,
        );
    }

    if (metadata.macros_per_100g?.protein_g) {
        details.push(
            <CaptionBadge
                key="protein"
                icon={IconChefHat}
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
                key="flags"
                icon={IconChefHat}
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
                key="servings"
                icon={IconUsers}
                text={`${metadata.servings_yield} servings`}
            />,
        );
    }

    const totalTime = (metadata.prep_time_minutes || 0) + (metadata.cook_time_minutes || 0);
    if (totalTime > 0) {
        details.push(
            <CaptionBadge
                key="time"
                icon={IconClock}
                text={`${totalTime} min`}
            />,
        );
    }

    if (metadata.nutrition_per_serving?.calories) {
        details.push(
            <CaptionBadge
                key="calories"
                icon={IconFlame}
                text={`${metadata.nutrition_per_serving.calories} cal/serving`}
            />,
        );
    }

    if (metadata.difficulty) {
        details.push(
            <CaptionBadge
                key="difficulty"
                icon={IconListDetails}
                text={`${metadata.difficulty} difficulty`}
            />,
        );
    }

    return <>{details}</>;
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

interface Props {
    content: Content;
    onView: (id: string) => void;
    onEdit?: (id: string) => void;
    onDelete?: (id: string) => void;
}

function ContentListItem({content, onView, onEdit}: Props) {
    const typeConfig = CONTENT_TYPE_CONFIG[content.type]!;
    return (
        <Card
            onClick={() => onView(content.id)}
            withBorder
            shadow={'xxs'}
            style={{
                cursor: 'pointer',
                paddingTop: 'var(--body-offset)',
                paddingInline: 'var(--ce-size-md)',
                paddingBottom: 'var(--ce-size-md)',
                borderRadius: 'var(--body-offset)',
            }}
        >
            <Stack
                style={{flex: 1, minWidth: 0}}
                gap={'var(--mantine-spacing-xs)'}
            >
                <Group
                    wrap={'nowrap'}
                    justify={'space-between'}
                    align={'flex-start'}
                >
                    <Stack gap={0}>
                        <Title
                            order={6}
                            style={{
                                fontSize: 'var(--h6-font-size)',
                                lineHeight: 'var(--h6-line-height)',
                                fontWeight: 600,
                                wordBreak: 'break-word',
                                flex: 1,
                                marginBottom: 'var(--ce-size-xs)',
                            }}
                        >
                            {content.name}
                        </Title>
                        <Badge
                            color={typeConfig.color}
                            variant={'light'}
                            size={'lg'}
                            tt={'capitalize'}
                            style={{flex: 1, marginBottom: 'var(--ce-size-xs)'}}
                        >
                            {typeConfig.label}
                        </Badge>
                    </Stack>

                    <Menu
                        shadow={'lg'}
                        position={'bottom-end'}
                    >
                        <Menu.Target>
                            <ActionIcon
                                variant={'subtle'}
                                color={'dark'}
                                size={'xl'}
                                radius={9999}
                                aria-label="Content actions"
                                onClick={(e) => e.stopPropagation()}
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
                                leftSection={<TrashIcon size={20} />}
                                color="red"
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

export default ContentListItem;
