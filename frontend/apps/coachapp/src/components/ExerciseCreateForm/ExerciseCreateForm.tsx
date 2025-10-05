import {Box, Grid, GridCol, MultiSelect, SegmentedControl, Textarea, TextInput, useMantineTheme} from '@mantine/core';
import {FC} from 'react';

import {Content} from '@/api/contents';

import {ChipSelect} from '../ChipSelect';

type ExerciseCreateFormProps = {
    autoResetOnSuccess?: boolean;
    onCancel?: () => void;
    onCreated?: (newId: string, content?: Content) => void;
    submitLabel?: string;
};

// Common muscle group options
const MUSCLE_OPTIONS: string[] = [
    'Chest',
    'Back',
    'Lats',
    'Quadriceps',
    'Hamstrings',
    'Glutes',
    'Calves',
    'Shoulders',
    'Deltoids',
    'Triceps',
    'Biceps',
    'Core',
    'Abs',
    'Forearms',
    'Neck',
    'Traps',
    'Adductors',
    'Abductors',
];

const FormSections = [
    {
        id: 'ce-media-section',
        name: 'Media',
    },
    {
        id: 'ce-instruction-section',
        name: 'Instructions',
    },
    {
        id: 'ce-metrices-section',
        name: 'Metrices',
    },
    {
        id: 'ce-advance-section',
        name: 'Advance',
    },
];

const FormDataForSegementation = () => {
    return FormSections.map((section) => ({
        label: section.name,
        value: section.id,
    }));
};

const ExerciseCreateForm: FC<ExerciseCreateFormProps> = () => {
    const theme = useMantineTheme();

    return (
        <form style={{position: 'relative'}}>
            <TextInput
                description="Enter a clear, specific exercise name (e.g., 'Two-arm kettlebell row')."
                label="Exercise Name"
                placeholder="Two arm kettlebell row"
            />
            <Textarea label="Description" />
            <Grid>
                <GridCol span={{sm: 12, md: 6, lg: 4}}>
                    <TextInput
                        label="Duration"
                        radius="lg"
                        rightSection="Min"
                        type="number"
                    />
                </GridCol>
                <GridCol span={{sm: 12, md: 6, lg: 8}}>
                    <ChipSelect
                        data={['Easy', 'Intermediate', 'Expert']}
                        label="Level"
                        radius="lg"
                    />
                </GridCol>
            </Grid>
            <Grid>
                <GridCol span={{sm: 12, md: 6, lg: 6}}>
                    <Box
                        p="sm"
                        style={{
                            border: `1px dotted ${theme.colors.gray[5]}`,
                            borderRadius: theme.radius.lg,
                        }}
                    >
                        <MultiSelect
                            clearable
                            data={MUSCLE_OPTIONS}
                            description="Select one or more primary muscles targeted by this exercise."
                            label="Primary Muscles"
                            placeholder="Select primary muscles"
                            radius="lg"
                            searchable
                            withAsterisk
                        />
                    </Box>
                </GridCol>
                <GridCol span={{sm: 12, md: 6, lg: 6}}>
                    <Box
                        p="sm"
                        style={{
                            border: `1px dotted ${theme.colors.gray[5]}`,
                            borderRadius: theme.radius.lg,
                        }}
                    >
                        <MultiSelect
                            clearable
                            data={MUSCLE_OPTIONS}
                            description="Optionally select supporting/assisting muscles."
                            label="Secondary Muscles"
                            placeholder="Select secondary muscles"
                            radius="lg"
                            searchable
                        />
                    </Box>
                </GridCol>
            </Grid>
            <Box my="lg">
                <SegmentedControl
                    color="blue"
                    data={FormDataForSegementation()}
                    defaultValue={FormDataForSegementation()[0].value}
                    fullWidth
                    radius="lg"
                />
            </Box>
        </form>
    );
};

export default ExerciseCreateForm;
