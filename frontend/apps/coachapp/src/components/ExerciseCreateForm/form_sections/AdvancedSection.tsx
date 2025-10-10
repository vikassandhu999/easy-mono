import {
    Box,
    Grid,
    GridCol,
    Group,
    MultiSelect,
    NumberInput,
    Select,
    Stack,
    TagsInput,
    Text,
    TextInput,
    useMantineTheme,
} from '@mantine/core';
import {IconInfoCircle} from '@tabler/icons-react';
import {FC, useState} from 'react';

import {
    ADVANCED_SECTION_DEFAULT_VALUES,
    CATEGORY_OPTIONS,
    EQUIPMENT_OPTIONS,
    FORCE_OPTIONS,
    MECHANICS_OPTIONS,
    RANGE_OF_MOTION_OPTIONS,
    REP_RANGE_PRESETS,
} from '../constants';

export interface AdvancedSectionData {
    // Execution Details
    calories_burned_per_minute: number;
    category: string;
    common_mistakes: string[];
    common_rep_ranges: string[];

    contraindications: string[];
    // Programming Guidelines
    default_sets: number;
    // Equipment & Classification
    equipment: string[];

    force: string;
    // Safety & Technique
    form_cues: string[];
    mechanics: string;

    range_of_motion: string;
    rest_recommendation: string;
    tempo: string;
}

type AdvancedSectionProps = {
    onChange?: (data: AdvancedSectionData) => void;
    value?: AdvancedSectionData;
};

const AdvancedSection: FC<AdvancedSectionProps> = ({onChange, value}) => {
    const theme = useMantineTheme();
    // Initialize form data with default values from constants
    const [formData, setFormData] = useState<AdvancedSectionData>(value || ADVANCED_SECTION_DEFAULT_VALUES);

    const handleChange = (field: keyof AdvancedSectionData, newValue: any) => {
        const updated = {...formData, [field]: newValue};
        setFormData(updated);
        onChange?.(updated);
    };

    return (
        <Stack gap="xl">
            {/* Equipment & Classification Section */}
            <Box>
                <Group
                    gap="xs"
                    mb="sm"
                >
                    <Text
                        fw={600}
                        size="lg"
                    >
                        Equipment & Classification
                    </Text>
                    <IconInfoCircle
                        color={theme.colors.blue[6]}
                        size={18}
                    />
                </Group>
                <Text
                    c="dimmed"
                    mb="md"
                    size="sm"
                >
                    Define what equipment is needed and how the exercise is classified.
                </Text>

                <Stack gap="md">
                    <MultiSelect
                        clearable
                        data={EQUIPMENT_OPTIONS}
                        description="What equipment is required for this exercise?"
                        label="Equipment"
                        onChange={(val) => handleChange('equipment', val)}
                        placeholder="Select equipment"
                        radius="lg"
                        searchable
                        value={formData.equipment}
                    />

                    <Grid>
                        <GridCol span={{base: 12, sm: 6}}>
                            <Select
                                clearable
                                data={CATEGORY_OPTIONS}
                                description="Primary training category"
                                label="Category"
                                onChange={(val) => handleChange('category', val || '')}
                                placeholder="Select category"
                                radius="lg"
                                searchable
                                value={formData.category}
                            />
                        </GridCol>
                        <GridCol span={{base: 12, sm: 6}}>
                            <Select
                                clearable
                                data={FORCE_OPTIONS}
                                description="Force type or movement pattern"
                                label="Force"
                                onChange={(val) => handleChange('force', val || '')}
                                placeholder="Select force type"
                                radius="lg"
                                value={formData.force}
                            />
                        </GridCol>
                    </Grid>

                    <Select
                        clearable
                        data={MECHANICS_OPTIONS}
                        description="Movement complexity"
                        label="Mechanics"
                        onChange={(val) => handleChange('mechanics', val || '')}
                        placeholder="Select mechanics type"
                        radius="lg"
                        value={formData.mechanics}
                    />
                </Stack>
            </Box>

            {/* Programming Guidelines Section */}
            <Box>
                <Group
                    gap="xs"
                    mb="sm"
                >
                    <Text
                        fw={600}
                        size="lg"
                    >
                        Programming Guidelines
                    </Text>
                    <IconInfoCircle
                        color={theme.colors.blue[6]}
                        size={18}
                    />
                </Group>
                <Text
                    c="dimmed"
                    mb="md"
                    size="sm"
                >
                    Recommended programming parameters for clients and coaches.
                </Text>

                <Stack gap="md">
                    <NumberInput
                        clampBehavior="blur"
                        description="Typical number of sets to program"
                        label="Default Sets"
                        max={10}
                        min={1}
                        onChange={(val) => handleChange('default_sets', typeof val === 'number' ? val : 3)}
                        placeholder="e.g., 3"
                        radius="lg"
                        value={formData.default_sets}
                    />

                    <TagsInput
                        clearable
                        data={REP_RANGE_PRESETS}
                        description="Common rep ranges for this exercise (e.g., 6-8, 10-12)"
                        label="Common Rep Ranges"
                        onChange={(val) => handleChange('common_rep_ranges', val)}
                        placeholder="Add rep ranges"
                        radius="lg"
                        value={formData.common_rep_ranges}
                    />

                    <TextInput
                        description="Recommended rest time between sets"
                        label="Rest Recommendation"
                        onChange={(e) => handleChange('rest_recommendation', e.target.value)}
                        placeholder="e.g., 60-90 seconds, 2-3 minutes"
                        radius="lg"
                        value={formData.rest_recommendation}
                    />
                </Stack>
            </Box>

            {/* Execution Details Section */}
            <Box>
                <Group
                    gap="xs"
                    mb="sm"
                >
                    <Text
                        fw={600}
                        size="lg"
                    >
                        Execution Details
                    </Text>
                    <IconInfoCircle
                        color={theme.colors.blue[6]}
                        size={18}
                    />
                </Group>
                <Text
                    c="dimmed"
                    mb="md"
                    size="sm"
                >
                    Technical execution characteristics and energy expenditure.
                </Text>

                <Stack gap="md">
                    <NumberInput
                        clampBehavior="blur"
                        decimalScale={1}
                        description="Approximate calorie burn rate during active performance"
                        label="Calories Burned Per Minute"
                        min={0}
                        onChange={(val) =>
                            handleChange('calories_burned_per_minute', typeof val === 'number' ? val : 0)
                        }
                        placeholder="e.g., 5.5"
                        radius="lg"
                        step={0.5}
                        value={formData.calories_burned_per_minute}
                    />

                    <Grid>
                        <GridCol span={{base: 12, sm: 6}}>
                            <Select
                                clearable
                                data={RANGE_OF_MOTION_OPTIONS}
                                description="Expected range of motion"
                                label="Range of Motion"
                                onChange={(val) => handleChange('range_of_motion', val || '')}
                                placeholder="Select ROM"
                                radius="lg"
                                value={formData.range_of_motion}
                            />
                        </GridCol>
                        <GridCol span={{base: 12, sm: 6}}>
                            <TextInput
                                description="Tempo notation (e.g., 3-1-1-1)"
                                label="Tempo"
                                onChange={(e) => handleChange('tempo', e.target.value)}
                                placeholder="e.g., 3-0-1-0"
                                radius="lg"
                                value={formData.tempo}
                            />
                        </GridCol>
                    </Grid>
                </Stack>
            </Box>

            {/* Safety & Technique Section */}
            <Box>
                <Group
                    gap="xs"
                    mb="sm"
                >
                    <Text
                        fw={600}
                        size="lg"
                    >
                        Safety & Technique
                    </Text>
                    <IconInfoCircle
                        color={theme.colors.red[6]}
                        size={18}
                    />
                </Group>
                <Text
                    c="dimmed"
                    mb="md"
                    size="sm"
                >
                    Coaching cues, common errors, and safety considerations.
                </Text>

                <Stack gap="md">
                    <TagsInput
                        clearable
                        description="Key coaching points to help clients perform the exercise correctly"
                        label="Form Cues"
                        onChange={(val) => handleChange('form_cues', val)}
                        placeholder="Add form cues (e.g., 'Keep chest up', 'Drive through heels')"
                        radius="lg"
                        value={formData.form_cues}
                    />

                    <TagsInput
                        clearable
                        description="Common execution errors to watch for and correct"
                        label="Common Mistakes"
                        onChange={(val) => handleChange('common_mistakes', val)}
                        placeholder="Add common mistakes (e.g., 'Knee cave', 'Forward lean')"
                        radius="lg"
                        value={formData.common_mistakes}
                    />

                    <TagsInput
                        clearable
                        description="Medical conditions or situations where this exercise should be avoided"
                        label="Contraindications"
                        onChange={(val) => handleChange('contraindications', val)}
                        placeholder="Add contraindications (e.g., 'lower_back_injury', 'shoulder_impingement')"
                        radius="lg"
                        value={formData.contraindications}
                    />
                </Stack>
            </Box>
        </Stack>
    );
};

export default AdvancedSection;
