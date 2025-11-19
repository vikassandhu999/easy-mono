import {
    ActionIcon,
    Badge,
    Button,
    Flex,
    Group,
    Stack,
    Switch,
    Text,
    Textarea,
    TextInput,
    Title,
    useMantineTheme,
} from '@mantine/core';
import {IconPlus, IconTrash} from '@tabler/icons-react';
import {FC, useEffect, useState} from 'react';
import {useFieldArray, UseFormReturn} from 'react-hook-form';

import {CreateRecipeForm} from '@/services/recipes';

type InstrcutionsFieldProps = {
    form: UseFormReturn<CreateRecipeForm, any, CreateRecipeForm>;
};

const textToSteps = (text: string) => {
    return text
        .split('\n')
        .map((step) => step.trim())
        .filter((step) => step.length > 0);
};

const stepsToText = (steps: string[]) => {
    return steps
        .map((step) => step.trim())
        .filter((step) => step.length > 0)
        .join('\n');
};

const InstructionsField: FC<InstrcutionsFieldProps> = ({form}) => {
    const theme = useMantineTheme();
    const {
        watch,
        setValue,
        register,
        control,
        formState: {errors},
    } = form;

    // TypeScript incorrectly infers only 'ingredients' as valid field name for useFieldArray
    const {fields, append, remove, replace} = useFieldArray({
        control,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        name: 'instructions',
    });

    const instructions = watch('instructions') || [];
    const instructionsAsText = watch('instructions_as_text') || '';

    const [stepMode, setStepMode] = useState<boolean>(() => {
        const initialInstructions = watch('instructions');
        const initialText = watch('instructions_as_text');
        return (initialInstructions && initialInstructions.length > 0) || !initialText;
    });
    const handleModeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newStepMode = event.currentTarget.checked;
        setStepMode(newStepMode);

        if (newStepMode) {
            const steps = textToSteps(instructionsAsText);
            // @ts-expect-error - Type inference issue with replace accepting string[]
            replace(steps.length > 0 ? steps : ['']);
            setValue('instructions_as_text', '');
        } else {
            const newText = stepsToText(instructions);
            setValue('instructions_as_text', newText);
            replace([]);
        }
    };

    useEffect(() => {
        if (stepMode && fields.length === 0) {
            // @ts-expect-error - Type inference issue with append accepting string
            append('');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <Stack
            p="xs"
            style={{
                borderRadius: theme.radius.md,
            }}
        >
            <Group justify="space-between">
                <Stack gap="xs">
                    <Title
                        fw="bold"
                        order={6}
                    >
                        Instructions
                    </Title>

                    <Switch
                        checked={stepMode}
                        color="orange"
                        label={
                            <Text
                                fs="italic"
                                size="sm"
                            >
                                Step by Step Instructions
                            </Text>
                        }
                        labelPosition="right"
                        onChange={handleModeChange}
                        withThumbIndicator={false}
                    />
                </Stack>
            </Group>

            {stepMode ? (
                <>
                    {fields.map((field, idx) => (
                        <Group
                            key={field.id}
                            wrap="nowrap"
                        >
                            <Badge variant="light">{idx + 1}</Badge>
                            <TextInput
                                {...register(`instructions.${idx}`)}
                                placeholder={`write instruction`}
                                size="xs"
                                style={{flex: 1}}
                            />
                            <ActionIcon
                                aria-label="Remove Instruction"
                                color="red"
                                onClick={() => remove(idx)}
                                size="xs"
                                variant="light"
                            >
                                <IconTrash />
                            </ActionIcon>
                        </Group>
                    ))}
                    <Flex justify="end">
                        <Button
                            color="orange"
                            // @ts-expect-error - Type inference issue with append accepting string
                            onClick={() => append('')}
                            radius="lg"
                            rightSection={<IconPlus size={18} />}
                            size="compact-xs"
                            variant="light"
                            w="max-content"
                        >
                            Add Step
                        </Button>
                    </Flex>
                    {errors.instructions?.message && (
                        <Text
                            c="red"
                            size="sm"
                        >
                            {errors.instructions.message as string}
                        </Text>
                    )}
                </>
            ) : (
                <>
                    <Textarea
                        {...register('instructions_as_text')}
                        minRows={4}
                        placeholder="Write your instructions here."
                    />
                    {errors.instructions_as_text?.message && (
                        <Text
                            c="red"
                            size="sm"
                        >
                            {errors.instructions_as_text.message as string}
                        </Text>
                    )}
                </>
            )}
        </Stack>
    );
};

export default InstructionsField;
