import {ActionIcon, Badge, Button, Group, Loader, Stack, Text, TextInput, Title, useMantineTheme} from '@mantine/core';
import {useDebouncedValue} from '@mantine/hooks';
import {IconPlus, IconTrash} from '@tabler/icons-react';
import {FC, useCallback, useMemo, useState} from 'react';
import {UseFormReturn, useWatch} from 'react-hook-form';

import {useCreateIngredient, useListIngredients} from '@/services/ingredients';
import {CreateRecipeForm} from '@/services/recipes';
import APIErrorParser from '@/utils/error_parser';
import {notifyError, notifySuccess, notifyWarning} from '@/utils/notification';

type IngredientsFieldProps = {
    form: UseFormReturn<CreateRecipeForm, any, CreateRecipeForm>;
};

const IngredientsField: FC<IngredientsFieldProps> = ({form}) => {
    const theme = useMantineTheme();

    const {watch, setValue} = form;

    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm] = useDebouncedValue(searchTerm, 300);

    const {data, isLoading} = useListIngredients(
        {
            search: debouncedSearchTerm,
        },
        {
            skip: !debouncedSearchTerm,
        },
    );

    const [createIngredientMutation] = useCreateIngredient();

    const fetchedIngredients = useMemo(() => data?.pages?.flatMap((page) => page.records) ?? [], [data]);

    const handleSearchTerm: React.ChangeEventHandler<HTMLInputElement> = (e) => {
        setSearchTerm(e.currentTarget.value);
    };

    const createIngredient = async () => {
        try {
            const {
                data: {name, id},
            } = await createIngredientMutation({name: searchTerm});

            addIngredient(id, name);
            notifySuccess(`Ingredient ${name} created.`);
        } catch (err) {
            const err_msg = new APIErrorParser(err).humanize();
            notifyError(err_msg);
        }
    };

    const addIngredient = useCallback(
        (id: string, name: string) => {
            const prev = watch('recipe_ingredients') || [];
            console.log(prev);

            const isDuplicate = prev.some((ig) => ig.ingredient_id === id);

            if (isDuplicate) {
                notifyWarning('Same ingredient already exists');
                return;
            }

            const newValue = [
                ...prev,
                {
                    ingredient_id: id,
                    order: prev.length,
                    name,
                    quantity_as_text: '',
                },
            ];

            setValue('recipe_ingredients', newValue, {
                shouldValidate: true,
                shouldDirty: true,
            });

            setSearchTerm('');
        },
        [watch, setValue],
    );

    const removeIngredient = useCallback(
        (id: string) => {
            const prev = watch('recipe_ingredients') || [];

            const newValue = prev.filter((ig) => ig.ingredient_id !== id);

            setValue('recipe_ingredients', newValue, {
                shouldValidate: true,
                shouldDirty: true,
            });

            setSearchTerm('');
        },
        [watch, setValue],
    );

    const updateIngredientQuntity = useCallback(
        (id: string, value: string) => {
            const prev = watch('recipe_ingredients') || [];
            const idx = prev.findIndex((ig) => ig.ingredient_id === id);

            if (idx === -1) return;

            const newValue = [...prev];
            newValue[idx] = {...prev[idx], quantity_as_text: value};

            setValue('recipe_ingredients', newValue, {
                shouldValidate: true,
                shouldDirty: true,
            });
        },
        [watch, setValue],
    );

    const currentIngredients = useWatch({
        control: form.control,
        name: 'recipe_ingredients',
        defaultValue: [],
    });

    return (
        <Stack gap="md">
            {/* Header */}
            <Group justify="space-between">
                <Title
                    fw="bold"
                    order={6}
                >
                    Ingredients
                </Title>

                <Text
                    c="dimmed"
                    size="xs"
                >
                    {currentIngredients.length} Selected
                </Text>
            </Group>

            <Stack gap="xs">
                {currentIngredients.map((ingredient, idx) => (
                    <Group
                        gap="xs"
                        key={ingredient.ingredient_id}
                        wrap="nowrap"
                    >
                        <Badge
                            color="orange"
                            variant="light"
                        >
                            {idx + 1}
                        </Badge>
                        <Text
                            size="sm"
                            style={{minWidth: '120px'}}
                        >
                            {/* @ts-expect-error -- types mistmatch */}
                            {ingredient?.ingredient?.name || ingredient?.name}
                        </Text>
                        <TextInput
                            onChange={(e) => {
                                updateIngredientQuntity(ingredient.ingredient_id, e.currentTarget.value);
                            }}
                            placeholder="e.g. 200g, 1 cup"
                            size="xs"
                            style={{flex: 1}}
                            value={ingredient.quantity_as_text || ''}
                        />
                        <ActionIcon
                            aria-label={`Remove ${ingredient.name}`}
                            color="red"
                            onClick={() => {
                                removeIngredient(ingredient.ingredient_id);
                            }}
                            size="sm"
                            variant="light"
                        >
                            <IconTrash size={16} />
                        </ActionIcon>
                    </Group>
                ))}
            </Stack>

            {/* Search Input */}
            <TextInput
                onChange={handleSearchTerm}
                placeholder="Search ingredients (e.g. Chicken, Butter, Garlic)"
                value={searchTerm}
            />

            {searchTerm && (
                <Stack gap="xs">
                    {isLoading && (
                        <Group justify="center">
                            <Loader
                                color="orange"
                                size="sm"
                            />
                            <Text
                                c="dimmed"
                                size="sm"
                            >
                                Searching...
                            </Text>
                        </Group>
                    )}

                    {!isLoading && fetchedIngredients.length === 0 && (
                        <Stack>
                            <Text
                                c="dimmed"
                                fs="italic"
                                size="sm"
                                ta="left"
                            >
                                Nothing found for {searchTerm}.
                            </Text>
                            <Button
                                onClick={createIngredient}
                                radius="md"
                                rightSection={<IconPlus size={14} />}
                                size="compact-sm"
                                variant="light"
                                w="max-content"
                            >
                                Create {searchTerm}
                            </Button>
                        </Stack>
                    )}

                    {!isLoading && fetchedIngredients.length > 0 && (
                        <Group gap="xs">
                            {fetchedIngredients.map((ingredient) => {
                                return (
                                    <Group
                                        gap="xs"
                                        key={ingredient.id}
                                        onClick={() => {
                                            addIngredient(ingredient.id, ingredient.name);
                                        }}
                                        style={{
                                            border: `1px dashed ${theme.colors.gray[2]}`,
                                            borderRadius: '8px',
                                            padding: '4px 8px',
                                            cursor: 'pointer',
                                            opacity: 1,
                                        }}
                                    >
                                        <Text size="sm">{ingredient?.name}</Text>
                                        <ActionIcon
                                            color="orange"
                                            size="xs"
                                            variant="light"
                                        >
                                            <IconPlus size={14} />
                                        </ActionIcon>
                                    </Group>
                                );
                            })}
                        </Group>
                    )}
                </Stack>
            )}
        </Stack>
    );
};

export default IngredientsField;
