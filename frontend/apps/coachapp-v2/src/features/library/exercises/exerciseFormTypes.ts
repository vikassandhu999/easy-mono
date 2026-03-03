import type {ExerciseForce, ExerciseMechanics} from '@/entities/exercises/api/exercises';

export type ExerciseImageField = {
  url: string;
};

export type ExerciseFormValues = {
  description: string;
  equipment_ids: string[];
  force: '' | ExerciseForce;
  images: ExerciseImageField[];
  instructions: string;
  mechanics: '' | ExerciseMechanics;
  muscle_ids: string[];
  name: string;
};
