import {humanizeError} from '@easy/error-parser';
import {
    ActionIcon,
    Button,
    Card,
    Group,
    Modal,
    Stack,
    Text,
    TextInput,
    UnstyledButton,
    useMantineTheme,
} from '@mantine/core';
import {useDisclosure} from '@mantine/hooks';
import {IconTrash, IconX} from '@tabler/icons-react';
import {useState} from 'react';

import {useUpdateMealItem} from '@/services/meal_items';
import {notifyError, notifySuccess, notifyWarning} from '@/utils/notification';

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

const MealRecipeSettingsModal = ({
    item,
    onClose,
    opened,
    onServingSizeChange,
}: {
    item: MealRecipeItemProps['item'];
    onClose: () => void;
    opened: boolean;
    onServingSizeChange: (newSize: number) => void;
}) => {
    const [servingSize, setServingSize] = useState(() =>
        typeof item.servings === 'string' ? parseFloat(item.servings) : item.servings,
    );

    const handleSave = () => {
        if (servingSize <= 0) {
            notifyWarning('Serving size must be greater than 0');
            return;
        }
        onServingSizeChange(servingSize);
        onClose();
    };

    return (
        <Modal
            centered
            onClose={onClose}
            opened={opened}
            shadow="md"
            title={item.recipe.name}
        >
            <Stack>
                <TextInput
                    label="Serving Size"
                    onChange={(e) => setServingSize(Number(e.target.value))}
                    type="number"
                    value={servingSize}
                />
                <Group justify="end">
                    <Button
                        color="red"
                        onClick={onClose}
                        variant="light"
                    >
                        Close
                    </Button>
                    <Button onClick={handleSave}>Save</Button>
                </Group>
            </Stack>
        </Modal>
    );
};

export const MealRecipeItem = ({item, onDelete, nutritionPlanId}: MealRecipeItemProps) => {
    const theme = useMantineTheme();

    const recipeName = item.recipe?.name || 'Unknown Recipe';
    const [opened, {open, close}] = useDisclosure(false);

    const [updateMealItem] = useUpdateMealItem();

    const handleServingChange = async (value: number) => {
        try {
            await updateMealItem({
                id: item.id,
                servings: value,
                nutrition_plan_id: nutritionPlanId,
            }).unwrap();
            notifySuccess('Serving size updated successfully');
        } catch (e) {
            const errMsg = humanizeError(e);
            notifyError(errMsg);
        }
    };

    return (
        <Group pl={'sm'}>
            <MealRecipeSettingsModal
                item={item}
                onClose={close}
                onServingSizeChange={handleServingChange}
                opened={opened}
            />
            <UnstyledButton
                color={'white'}
                fw={700}
                onClick={open}
                size={'xs'}
                style={{
                    border: `1px dotted ${theme.colors.gray[4]}`,
                    padding: theme.spacing.xs,
                    borderRadius: theme.radius.sm,
                }}
                variant={'default'}
            >
                {item.servings}
            </UnstyledButton>
            <IconX size={12} />
            <Card
                bg="gray.1"
                flex={1}
                p={'sm'}
                radius="lg"
            >
                <Group
                    justify="space-between"
                    px="sm"
                    py="xs"
                    wrap="nowrap"
                >
                    <Group>
                        <Text
                            fw={700}
                            size="md"
                        >
                            {recipeName}
                        </Text>
                    </Group>

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
        </Group>
    );
};

export default MealRecipeItem;
