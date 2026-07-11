import type {FormQuestionType} from '@/api/checkins';

export const QUESTION_PRESET_CATEGORIES = ['Body', 'Training', 'Nutrition', 'Recovery', 'Mindset'] as const;

export type QuestionPresetCategory = (typeof QUESTION_PRESET_CATEGORIES)[number];

export type QuestionPreset = {
  category: QuestionPresetCategory;
  key: string;
  label: string;
  required: boolean;
  type: FormQuestionType;
};

export const QUESTION_PRESETS: QuestionPreset[] = [
  {category: 'Body', key: 'weight', label: 'Weight', required: false, type: 'weight'},
  {category: 'Body', key: 'waist', label: 'Waist measurement', required: false, type: 'number'},
  {category: 'Body', key: 'hip', label: 'Hip measurement', required: false, type: 'number'},
  {category: 'Body', key: 'chest', label: 'Chest measurement', required: false, type: 'number'},
  {
    category: 'Body',
    key: 'progress-photos',
    label: 'Progress photos (front/side/back)',
    required: false,
    type: 'photo',
  },
  {
    category: 'Training',
    key: 'workouts-completed',
    label: 'Workouts completed this week',
    required: false,
    type: 'number',
  },
  {category: 'Training', key: 'training-adherence', label: 'Training adherence', required: false, type: 'rating'},
  {
    category: 'Training',
    key: 'workout-difficulty',
    label: 'Average workout difficulty',
    required: false,
    type: 'rating',
  },
  {category: 'Training', key: 'muscle-soreness', label: 'Muscle soreness', required: false, type: 'rating'},
  {category: 'Training', key: 'pain-injuries', label: 'Any pain or injuries?', required: false, type: 'text'},
  {
    category: 'Nutrition',
    key: 'nutrition-adherence',
    label: 'Nutrition adherence',
    required: false,
    type: 'rating',
  },
  {category: 'Nutrition', key: 'hunger', label: 'Hunger levels', required: false, type: 'rating'},
  {category: 'Nutrition', key: 'cravings', label: 'Cravings', required: false, type: 'rating'},
  {category: 'Nutrition', key: 'meals-off-plan', label: 'Meals off plan this week', required: false, type: 'number'},
  {category: 'Nutrition', key: 'alcohol', label: 'Alcoholic drinks this week', required: false, type: 'number'},
  {
    category: 'Nutrition',
    key: 'water-intake',
    label: 'Daily water intake (liters)',
    required: false,
    type: 'number',
  },
  {category: 'Recovery', key: 'sleep-quality', label: 'Sleep quality', required: false, type: 'rating'},
  {category: 'Recovery', key: 'sleep-hours', label: 'Average hours of sleep', required: false, type: 'number'},
  {category: 'Recovery', key: 'energy', label: 'Energy levels', required: false, type: 'rating'},
  {category: 'Recovery', key: 'stress', label: 'Stress levels', required: false, type: 'rating'},
  {category: 'Recovery', key: 'steps', label: 'Average daily steps', required: false, type: 'number'},
  {category: 'Mindset', key: 'motivation', label: 'Motivation', required: false, type: 'rating'},
  {category: 'Mindset', key: 'overall-week', label: 'Rate your week overall', required: false, type: 'rating'},
  {category: 'Mindset', key: 'biggest-win', label: 'Biggest win this week', required: false, type: 'text'},
  {
    category: 'Mindset',
    key: 'biggest-challenge',
    label: 'Biggest challenge this week',
    required: false,
    type: 'text',
  },
  {
    category: 'Mindset',
    key: 'next-week-improvement',
    label: 'What will you improve next week?',
    required: false,
    type: 'text',
  },
  {category: 'Mindset', key: 'coach-questions', label: 'Questions for your coach', required: false, type: 'text'},
];
