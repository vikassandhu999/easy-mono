import {Avatar, Badge, Group, Text} from '@mantine/core';
import {IconBarbell, IconTreadmill} from '@tabler/icons-react';
import {FC} from 'react';

import {Content} from '@/api/contents';

type ExerciseCardProps = {
    exercise: Content;
    onClick?: () => void;
};

const LevelColors: Record<string, string> = {
    beginner: 'green',
    intermediate: 'yellow',
    expert: 'red',
};

const getLevelColor = (level: string): string => {
    const normalizedLevel = level.toLowerCase();
    return LevelColors[normalizedLevel] || 'blue';
};

export const ExerciseCard: FC<ExerciseCardProps> = ({exercise, onClick}) => {
    const exerciseMetadata = exercise.exercise_metadata;

    return (
        <Group
            align="start"
            onClick={onClick}
            onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--mantine-color-gray-0)';
                e.currentTarget.style.transform = 'translateX(4px)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.transform = 'translateX(0)';
            }}
            py="sm"
            style={{
                borderBottom: '1px dashed var(--mantine-color-gray-3)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                borderRadius: '8px',
                marginLeft: '-8px',
                marginRight: '-8px',
                paddingLeft: '8px',
                paddingRight: '8px',
            }}
            wrap="nowrap"
        >
            <Avatar
                radius="md"
                size={50}
                src={exercise.thumbnail_url}
            >
                <IconTreadmill />
            </Avatar>
            <div>
                <Text
                    fw={500}
                    fz="lg"
                >
                    {exercise.name}
                </Text>

                {exerciseMetadata?.equipment && exerciseMetadata.equipment.length > 0 && (
                    <Group
                        gap={10}
                        mt={3}
                        wrap="nowrap"
                    >
                        <IconBarbell
                            size={16}
                            stroke={1.5}
                        />
                        <Text
                            c="dimmed"
                            fz="xs"
                        >
                            Equipment: {exerciseMetadata.equipment.slice(0, 2).join(', ')}
                        </Text>
                    </Group>
                )}

                <Group
                    gap={4}
                    mt="xs"
                    w="100%"
                >
                    {exerciseMetadata?.level && (
                        <Badge
                            color={getLevelColor(exerciseMetadata.level)}
                            size="xs"
                            variant="light"
                        >
                            {exerciseMetadata.level}
                        </Badge>
                    )}
                    {exerciseMetadata?.mechanics && (
                        <Badge
                            color="gray"
                            size="xs"
                            variant="light"
                        >
                            {exerciseMetadata.mechanics}
                        </Badge>
                    )}
                </Group>
            </div>
        </Group>
    );
};
