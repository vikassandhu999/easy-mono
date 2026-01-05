import {ActionIcon, Badge, Button, NumberInput, Paper, Stack, Table, Text} from '@mantine/core';
import {PlusIcon, TrashIcon} from '@phosphor-icons/react';
import {Controller, useFieldArray, UseFormReturn} from 'react-hook-form';

import {SessionFormValues} from '../sessionForm';

interface SetsTableProps {
  control: UseFormReturn<SessionFormValues>['control'];
  exerciseIndex: number;
  sectionIndex: number;
}

/**
 * SetsTable - Displays and manages sets for a workout exercise
 *
 * Features:
 * - Proper HTML table structure
 * - Columns: Set #, Weight, Reps, Rest, Actions
 * - Add/remove individual sets
 * - Responsive design with proper alignment
 */
export default function SetsTable({control, sectionIndex, exerciseIndex}: SetsTableProps) {
  const {
    fields: sets,
    append: addSet,
    remove: removeSet,
  } = useFieldArray({
    control,
    name: `definition.sections.${sectionIndex}.exercises.${exerciseIndex}.sets`,
  });

  return (
    <Stack gap="xs">
      {sets.length > 0 ? (
        <Table.ScrollContainer minWidth={500}>
          <Table
            highlightOnHover
            layout={'fixed'}
            verticalSpacing="sm"
            withColumnBorders={false}
            withRowBorders={false}
            withTableBorder={false}
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{textAlign: 'center', width: '60px'}}>
                  <Text
                    fw={600}
                    size="sm"
                  >
                    Set
                  </Text>
                </Table.Th>
                <Table.Th style={{textAlign: 'center'}}>
                  <Text
                    fw={600}
                    size="sm"
                  >
                    Weight
                  </Text>
                </Table.Th>
                <Table.Th style={{textAlign: 'center'}}>
                  <Text
                    fw={600}
                    size="sm"
                  >
                    Reps
                  </Text>
                </Table.Th>
                <Table.Th style={{textAlign: 'center'}}>
                  <Text
                    fw={600}
                    size="sm"
                  >
                    Rest
                  </Text>
                </Table.Th>
                <Table.Th style={{textAlign: 'center', width: '60px'}}></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {sets.map((set, setIndex) => (
                <Table.Tr key={set.id}>
                  <Table.Td style={{textAlign: 'center', verticalAlign: 'middle'}}>
                    <Badge
                      color="blue"
                      radius="xl"
                      size="md"
                      variant="light"
                    >
                      {setIndex + 1}
                    </Badge>
                  </Table.Td>
                  <Table.Td style={{textAlign: 'center', verticalAlign: 'middle', padding: '8px'}}>
                    <Controller
                      control={control}
                      name={`definition.sections.${sectionIndex}.exercises.${exerciseIndex}.sets.${setIndex}.weight.value`}
                      render={({field}) => (
                        <NumberInput
                          {...field}
                          hideControls
                          onChange={(value) => field.onChange(typeof value === 'number' ? value : undefined)}
                          placeholder="0"
                          size="md"
                          styles={{
                            input: {
                              textAlign: 'center',
                              fontWeight: 500,
                            },
                          }}
                          value={field.value ?? undefined}
                          variant="filled"
                        />
                      )}
                    />
                  </Table.Td>
                  <Table.Td style={{textAlign: 'center', verticalAlign: 'middle', padding: '8px'}}>
                    <Controller
                      control={control}
                      name={`definition.sections.${sectionIndex}.exercises.${exerciseIndex}.sets.${setIndex}.reps.value`}
                      render={({field}) => (
                        <NumberInput
                          {...field}
                          hideControls
                          min={1}
                          onChange={(value) => field.onChange(typeof value === 'number' ? value : undefined)}
                          placeholder="12"
                          size="md"
                          styles={{
                            input: {
                              textAlign: 'center',
                              fontWeight: 500,
                            },
                          }}
                          value={field.value ?? undefined}
                          variant="filled"
                        />
                      )}
                    />
                  </Table.Td>
                  <Table.Td style={{textAlign: 'center', verticalAlign: 'middle', padding: '8px'}}>
                    <Controller
                      control={control}
                      name={`definition.sections.${sectionIndex}.exercises.${exerciseIndex}.sets.${setIndex}.rest_seconds.value`}
                      render={({field}) => (
                        <NumberInput
                          {...field}
                          hideControls
                          min={0}
                          onChange={(value) => field.onChange(typeof value === 'number' ? value : undefined)}
                          placeholder="60"
                          size="md"
                          styles={{
                            input: {
                              textAlign: 'center',
                              fontWeight: 500,
                            },
                          }}
                          value={field.value ?? undefined}
                          variant="filled"
                        />
                      )}
                    />
                  </Table.Td>
                  <Table.Td style={{textAlign: 'center', verticalAlign: 'middle'}}>
                    <ActionIcon
                      color="red"
                      onClick={() => removeSet(setIndex)}
                      radius="lg"
                      size="lg"
                      variant="subtle"
                    >
                      <TrashIcon size={18} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      ) : (
        <Paper
          p="lg"
          radius="lg"
          style={{
            backgroundColor: 'light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-6))',
            border: '2px dashed light-dark(var(--mantine-color-gray-3), var(--mantine-color-dark-4))',
          }}
        >
          <Text
            c="dimmed"
            size="sm"
            ta="center"
          >
            Add sets
          </Text>
        </Paper>
      )}

      {/* Add Set Button */}
      <Button
        fullWidth
        leftSection={<PlusIcon size={18} />}
        mt="md"
        onClick={() =>
          addSet({
            reps: {value: 0},
            weight: {value: 0, unit: 'kg'},
            duration: {value: 0},
            rest_seconds: {value: 60},
          })
        }
        radius="lg"
        size="lg"
        variant={sets.length === 0 ? 'filled' : 'light'}
      >
        Add set
      </Button>
    </Stack>
  );
}
