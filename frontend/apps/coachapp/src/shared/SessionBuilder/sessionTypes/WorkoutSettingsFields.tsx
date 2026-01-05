import {NumberInput, Stack, Textarea} from '@mantine/core';
import {Control, Controller} from 'react-hook-form';

import {SessionFormValues} from '../sessionForm';

interface WorkoutSettingsFieldsProps {
  control: Control<SessionFormValues>;
}

export default function WorkoutSettingsFields({control}: WorkoutSettingsFieldsProps) {
  return <Stack gap="sm"></Stack>;
}
