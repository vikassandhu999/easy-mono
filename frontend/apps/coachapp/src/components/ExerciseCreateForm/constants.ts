export const FORM_SECTIONS = [
    {
        id: 'ce-media-section',
        label: 'Media',
        value: 'media',
    },
    {
        id: 'ce-instruction-section',
        label: 'Instructions',
        value: 'instructions',
    },
    {
        id: 'ce-advance-section',
        label: 'Advance',
        value: 'advance',
    },
];

export const MUSCLE_OPTIONS: string[] = [
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

export const EQUIPMENT_OPTIONS = [
    'Barbell',
    'Dumbbell',
    'Kettlebell',
    'Cable',
    'Machine',
    'Resistance Bands',
    'Suspension Trainer',
    'Medicine Ball',
    'Bodyweight',
    'Smith Machine',
    'EZ Bar',
    'Trap Bar',
    'None',
];

export const CATEGORY_OPTIONS = [
    {label: 'Strength', value: 'strength'},
    {label: 'Hypertrophy', value: 'hypertrophy'},
    {label: 'Power', value: 'power'},
    {label: 'Endurance', value: 'endurance'},
    {label: 'Cardio', value: 'cardio'},
    {label: 'Flexibility', value: 'flexibility'},
    {label: 'Mobility', value: 'mobility'},
    {label: 'Conditioning', value: 'conditioning'},
];

export const FORCE_OPTIONS = [
    {label: 'Push', value: 'push'},
    {label: 'Pull', value: 'pull'},
    {label: 'Squat', value: 'squat'},
    {label: 'Hinge', value: 'hinge'},
    {label: 'Static', value: 'static'},
    {label: 'Dynamic', value: 'dynamic'},
    {label: 'N/A', value: ''},
];

export const MECHANICS_OPTIONS = [
    {label: 'Compound', value: 'compound'},
    {label: 'Isolation', value: 'isolation'},
    {label: 'Unilateral', value: 'unilateral'},
    {label: 'Bilateral', value: 'bilateral'},
    {label: 'N/A', value: ''},
];

export const REP_RANGE_PRESETS = ['1-3', '3-5', '5-8', '6-8', '8-10', '10-12', '12-15', '15-20', '20+'];

export const RANGE_OF_MOTION_OPTIONS = [
    {label: 'Full', value: 'full'},
    {label: 'Partial', value: 'partial'},
    {label: '1.5x', value: '1.5x'},
    {label: 'Paused', value: 'paused'},
    {label: 'Variable', value: 'variable'},
];

export const ADVANCED_SECTION_DEFAULT_VALUES = {
    equipment: [],
    category: '',
    force: '',
    mechanics: '',
    default_sets: 3,
    common_rep_ranges: [],
    rest_recommendation: '',
    calories_burned_per_minute: 0,
    range_of_motion: '',
    tempo: '',
    form_cues: [],
    common_mistakes: [],
    contraindications: [],
};

export const EXERCISER_LEVELS = [
    {
        id: 'ce-exercise-easy',
        label: 'Easy',
        value: 'easy',
    },
    {
        id: 'ce-exercise-intermediate',
        label: 'Intermediate',
        value: 'intermediate',
    },
    {
        id: 'ce-exercise-expert',
        label: 'Expert',
        value: 'expert',
    },
];
