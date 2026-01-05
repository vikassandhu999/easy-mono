import {ActionIcon, Badge, Collapse, Group, Paper, Stack, Text, Tooltip} from '@mantine/core';
import {modals} from '@mantine/modals';
import {CaretDownIcon, CaretRightIcon, PencilSimpleIcon, TrashIcon} from '@phosphor-icons/react';
import {UseFormReturn} from 'react-hook-form';

import {Content} from '@/services/contents';

import ContentSelect from '../../ContentSelect';
import {SessionFormValues} from '../sessionForm';
import SetsTable from './SetsTable';

interface WorkoutExerciseProps {
  contentsMap: Record<string, Content>;
  control: UseFormReturn<SessionFormValues>['control'];
  exerciseIndex: number;
  isExpanded: boolean;
  onExpand: () => void;
  onRemove: () => void;
  sectionIndex: number;
  setContentsMap: React.Dispatch<React.SetStateAction<Record<string, Content>>>;
}

/**
 * WorkoutExercise - Individual exercise within a workout section
 *
 * Features:
 * - Collapsible with summary view
 * - Exercise name and details from content
 * - Change/Remove actions
 * - Sets table (reps, weight, rest)
 * - Exercise options (each side, tempo)
 */
export default function WorkoutExercise({
  control,
  sectionIndex,
  exerciseIndex,
  onRemove,
  isExpanded,
  onExpand,
  contentsMap,
  setContentsMap,
}: WorkoutExerciseProps) {
  // Get the content_id from the form
  const contentId = control._formValues.definition?.sections?.[sectionIndex]?.exercises?.[exerciseIndex]?.content_id;
  const contentDetail = contentId ? contentsMap[contentId] : null;
  const sets = control._formValues.definition?.sections?.[sectionIndex]?.exercises?.[exerciseIndex]?.sets || [];
  const eachSide =
    control._formValues.definition?.sections?.[sectionIndex]?.exercises?.[exerciseIndex]?.each_side || false;

  return (
    <Paper
      p={0}
      radius="lg"
      style={{
        border: '1px solid light-dark(var(--mantine-color-gray-3), var(--mantine-color-dark-4))',
        overflow: 'hidden',
      }}
    >
      {/* Exercise Header - Always Visible */}
      <Group
        align="center"
        gap="md"
        justify="space-between"
        onClick={(e) => {
          // Prevent collapse if clicking on change/remove buttons
          if (!(e.target as HTMLElement).closest('[data-prevent-collapse]')) {
            onExpand();
          }
        }}
        p="md"
        style={{
          cursor: 'pointer',
          backgroundColor: isExpanded
            ? 'light-dark(var(--mantine-color-blue-0), var(--mantine-color-dark-6))'
            : 'light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))',
          borderBottom: isExpanded
            ? '1px solid light-dark(var(--mantine-color-blue-2), var(--mantine-color-dark-4))'
            : 'none',
        }}
        wrap="nowrap"
      >
        <Group
          gap="md"
          style={{flex: 1, minWidth: 0}}
        >
          {/* Expand/Collapse Icon */}
          <ActionIcon
            color={isExpanded ? 'blue' : 'gray'}
            radius="lg"
            size="lg"
            variant="subtle"
          >
            {isExpanded ? <CaretDownIcon size={18} /> : <CaretRightIcon size={18} />}
          </ActionIcon>

          {/* Exercise Info */}
          <div style={{flex: 1, minWidth: 0}}>
            <Text
              fw={600}
              lineClamp={1}
              size="md"
            >
              {contentDetail?.name || `Exercise ${exerciseIndex + 1}`}
            </Text>
            <Group
              gap="xs"
              mt={4}
            >
              <Badge
                color="gray"
                size="sm"
                variant="dot"
              >
                {sets.length} {sets.length === 1 ? 'set' : 'sets'}
              </Badge>
              {eachSide && (
                <Badge
                  color="blue"
                  size="sm"
                  variant="dot"
                >
                  Each Side
                </Badge>
              )}
            </Group>
          </div>
        </Group>

        {/* Action Buttons */}
        <Group
          gap="sm"
          onClick={(e) => e.stopPropagation()}
        >
          <Tooltip label="Change">
            <ActionIcon
              color="blue"
              onClick={() => {
                modals.open({
                  children: (
                    <ContentSelect
                      onComplete={(ids, selectedContents) => {
                        if (ids.length && selectedContents) {
                          // Update the content map
                          const newContentsMap = {...contentsMap};
                          selectedContents.forEach((content) => {
                            newContentsMap[content.id] = content;
                          });
                          setContentsMap(newContentsMap);

                          // Update the form field
                          control._formValues.definition.sections[sectionIndex].exercises[exerciseIndex].content_id =
                            ids[0];
                        }
                        modals.close('change-exercise');
                      }}
                    />
                  ),
                  fullScreen: true,
                  id: 'change-exercise',
                  lockScroll: true,
                  title: 'Select Exercise',
                });
              }}
              radius="lg"
              size="lg"
              variant="light"
            >
              <PencilSimpleIcon size={18} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Remove">
            <ActionIcon
              color="red"
              onClick={onRemove}
              radius="lg"
              size="lg"
              variant="light"
            >
              <TrashIcon size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      {/* Exercise Details - Collapsible */}
      <Collapse in={isExpanded}>
        <Stack
          gap="sm"
          p="sm"
          style={{
            backgroundColor: 'var(--mantine-color-gray-0)',
          }}
        >
          {/* Content ID (hidden field for form state) */}
          <input
            {...control.register(`definition.sections.${sectionIndex}.exercises.${exerciseIndex}.content_id`)}
            type="hidden"
          />

          {/* Sets Section */}
          <SetsTable
            control={control}
            exerciseIndex={exerciseIndex}
            sectionIndex={sectionIndex}
          />

          {/* Exercise Options Section */}
          {/* <Stack gap="xs">
                        <Text
                            c="dimmed"
                            fw={600}
                            mb={4}
                            size="xs"
                            tt="uppercase"
                        >
                            Options
                        </Text>
                        <SimpleGrid
                            cols={{base: 1, sm: 2}}
                            spacing="md"
                        >
                            <Controller
                                control={control}
                                name={`definition.sections.${sectionIndex}.exercises.${exerciseIndex}.each_side`}
                                render={({field}) => (
                                    <Checkbox
                                        checked={field.value}
                                        label="Each Side"
                                        onChange={field.onChange}
                                        size="sm"
                                    />
                                )}
                            />
                            <Controller
                                control={control}
                                name={`definition.sections.${sectionIndex}.exercises.${exerciseIndex}.tempo`}
                                render={({field}) => (
                                    <TextInput
                                        {...field}
                                        label="Tempo"
                                        placeholder="3-1-1-0"
                                        size="sm"
                                        value={field.value ?? ''}
                                    />
                                )}
                            />
                        </SimpleGrid>
                    </Stack> */}
        </Stack>
      </Collapse>
    </Paper>
  );
}
