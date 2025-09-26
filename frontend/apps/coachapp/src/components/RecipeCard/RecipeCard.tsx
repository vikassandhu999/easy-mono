import {Avatar, Badge, Group, Text} from '@mantine/core';
import {IconClock, IconUsers} from '@tabler/icons-react';
import {FC} from 'react';

type RecipeCardProps = {
    calories: string;
    cookTime: string;
    groups: string[];
    name: string;
    prepTime: string;
    servings: number;
    thumbnailUrl: string;
};

export const RecipeCard: FC<RecipeCardProps> = ({
    cookTime,
    name,
    prepTime,
    servings,
    thumbnailUrl,
    groups,
    calories,
}) => {
    return (
        <Group
            align="start"
            py="xs"
            style={{
                borderBottom: '1px dashed var(--mantine-color-gray-3)',
            }}
            wrap="nowrap"
        >
            <Avatar
                radius="md"
                size={50}
                src={thumbnailUrl}
            />
            <div>
                <Text
                    fw={500}
                    fz="lg"
                >
                    {name}
                </Text>

                <Group
                    gap={10}
                    mt={3}
                    wrap="nowrap"
                >
                    <IconClock
                        size={16}
                        stroke={1.5}
                    />
                    <Text
                        c="dimmed"
                        fz="xs"
                    >
                        Prep: {prepTime} • Cook: {cookTime}
                    </Text>
                </Group>

                <Group
                    gap={10}
                    mt={5}
                    wrap="nowrap"
                >
                    <IconUsers
                        size={16}
                        stroke={1.5}
                    />
                    <Text
                        c="dimmed"
                        fz="xs"
                    >
                        Serves {servings} • {calories} calories
                    </Text>
                </Group>

                <Group
                    gap={5}
                    mt="xs"
                >
                    {groups.slice(0, 2).map((group) => {
                        return (
                            <Badge
                                color={'green'}
                                key={group}
                                size="xs"
                                variant="outline"
                            >
                                {group}
                            </Badge>
                        );
                    })}
                </Group>
            </div>
        </Group>
    );
};
