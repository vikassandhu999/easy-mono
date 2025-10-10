import {Box, Grid, GridCol, MultiSelect, SegmentedControl, Text, Textarea, TextInput} from '@mantine/core';
import {FC, useState} from 'react';

import {Content} from '@/api/contents';

import {ChipSelect} from '../ChipSelect';
import {EXERCISER_LEVELS, FORM_SECTIONS, MUSCLE_OPTIONS} from './constants';
import AdvancedSection from './form_sections/AdvancedSection';
import InstructionSection from './form_sections/InstructionSection';
import MediaSection from './form_sections/MediaSection';

type ExerciseCreateFormProps = {
    autoResetOnSuccess?: boolean;
    onCancel?: () => void;
    onCreated?: (newId: string, content?: Content) => void;
    submitLabel?: string;
};

const ExerciseCreateForm: FC<ExerciseCreateFormProps> = () => {
    const [formSection, setFormSection] = useState<string>(() => FORM_SECTIONS[0].value);

    return (
        <form style={{position: 'relative'}}>
            <TextInput
                description="Enter a clear, specific exercise name (e.g., 'Two-arm kettlebell row')."
                label="Exercise Name"
                placeholder="Two arm kettlebell row"
                size="sm"
                withAsterisk
            />
            <Textarea
                label="Description"
                size="sm"
            />
            <Grid>
                <GridCol span={{sm: 12, md: 6, lg: 4}}>
                    <TextInput
                        label="Duration"
                        radius="lg"
                        rightSection="Min"
                        size="sm"
                        type="number"
                        withAsterisk
                    />
                </GridCol>
                <GridCol span={{sm: 12, md: 6, lg: 8}}>
                    <ChipSelect
                        data={EXERCISER_LEVELS}
                        label={
                            <Text
                                fw="bold"
                                size="sm"
                            >
                                Level
                            </Text>
                        }
                        radius="lg"
                    />
                </GridCol>
            </Grid>
            <Grid>
                <GridCol span={{sm: 12, md: 6, lg: 6}}>
                    <MultiSelect
                        clearable
                        data={MUSCLE_OPTIONS}
                        description="Select one or more primary muscles targeted by this exercise."
                        label="Primary Muscles"
                        placeholder="Select primary muscles"
                        radius="lg"
                        searchable
                        size="sm"
                        withAsterisk
                    />
                </GridCol>
                <GridCol span={{sm: 12, md: 6, lg: 6}}>
                    <MultiSelect
                        clearable
                        data={MUSCLE_OPTIONS}
                        description="Optionally select supporting/assisting muscles."
                        label="Secondary Muscles"
                        placeholder="Select secondary muscles"
                        radius="lg"
                        searchable
                        size="sm"
                    />
                </GridCol>
            </Grid>
            <Box my="lg">
                <SegmentedControl
                    color="blue"
                    data={FORM_SECTIONS}
                    defaultValue={formSection}
                    fullWidth
                    onChange={(value) => setFormSection(value)}
                    radius="lg"
                    size="sm"
                />
            </Box>

            <Box my="lg">{formSection === 'media' && <MediaSection />}</Box>
            <Box my="lg">{formSection === 'instructions' && <InstructionSection />}</Box>
            <Box my="lg">{formSection === 'advance' && <AdvancedSection />}</Box>
        </form>
    );
};

export default ExerciseCreateForm;
