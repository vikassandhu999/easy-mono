import {ActionIcon, Card, Group, Text} from '@mantine/core';
import {IconTrash} from '@tabler/icons-react';

type MealRecipeItemProps = {
    item: {
        id: string;
        recipe_id: string;
        recipe?: {
            id: string;
            name: string;
        };
    };
    onDelete: () => void;
};

export const MealRecipeItem = ({item, onDelete}: MealRecipeItemProps) => {
    const recipeName = item.recipe?.name || 'Unknown Recipe';

    return (
        <Card
            bg="gray.1"
            radius="md"
        >
            <Group
                justify="space-between"
                px="sm"
                py="xs"
            >
                <Text
                    fw={500}
                    size="sm"
                >
                    {recipeName}
                </Text>
                <ActionIcon
                    color="red"
                    onClick={onDelete}
                    size="xs"
                    variant="subtle"
                >
                    <IconTrash size={16} />
                </ActionIcon>
            </Group>
        </Card>
    );
};

export default MealRecipeItem;
