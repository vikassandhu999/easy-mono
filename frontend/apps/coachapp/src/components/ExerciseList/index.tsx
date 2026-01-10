import {capitalizeWords} from '@easy/error-parser';
import {Button, Checkbox, Chip, Label, Modal, Surface} from '@heroui/react';
import {Group, SimpleGrid, Stack, Text} from '@mantine/core';
import {useDisclosure} from '@mantine/hooks';
import {IconChevronDown} from '@tabler/icons-react';
import {useMemo, useState} from 'react';

import {Exercise, useListExercises} from '@/services/exercises';
import {useListMuscles} from '@/services/muscles';

import ExerciseCard from '../ExerciseCard';
import ListView from '../ListView';

export interface ExerciseListProps {
  onExerciseClick?: (id: string) => void;
  search?: string;
}

const ExerciseList = ({onExerciseClick, search}: ExerciseListProps) => {
  const [selectedMuscleIds, setSelectedMuscleIds] = useState<string[]>([]);
  const [tempSelectedMuscleIds, setTempSelectedMuscleIds] = useState<string[]>([]);
  const [modalOpened, {open: openModal, close: closeModal}] = useDisclosure(false);

  const {data: musclesData} = useListMuscles({});
  const muscles = useMemo(() => musclesData?.data ?? [], [musclesData?.data]);

  const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = useListExercises({
    search: search || undefined,
    muscle_ids: selectedMuscleIds.length > 0 ? selectedMuscleIds : undefined,
  });

  const exercises = useMemo(() => data?.pages?.flatMap((page) => page.records) ?? [], [data?.pages]);

  const handleToggleMuscle = (muscleId: string) => {
    setTempSelectedMuscleIds((prev) =>
      prev.includes(muscleId) ? prev.filter((id) => id !== muscleId) : [...prev, muscleId],
    );
  };

  const handleClearMuscleFilters = () => {
    setSelectedMuscleIds([]);
    setTempSelectedMuscleIds([]);
  };

  const handleOpenModal = () => {
    setTempSelectedMuscleIds(selectedMuscleIds);
    openModal();
  };

  const handleApplyFilters = () => {
    setSelectedMuscleIds(tempSelectedMuscleIds);
    closeModal();
  };

  const handleRemoveMuscle = (muscleId: string) => {
    setSelectedMuscleIds((prev) => prev.filter((id) => id !== muscleId));
  };

  return (
    <Stack>
      <Modal>
        <Button
          onClick={handleOpenModal}
          size={'sm'}
          variant={selectedMuscleIds.length > 0 ? 'primary' : 'secondary'}
        >
          Muscles
          {selectedMuscleIds.length > 0 && <Chip size="sm">{selectedMuscleIds.length}</Chip>}
          <IconChevronDown size={24} />
        </Button>
        <Modal.Backdrop
          isOpen={modalOpened}
          onOpenChange={closeModal}
        >
          <Modal.Container
            placement={'top'}
            scroll={'outside'}
            size={'lg'}
          >
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading className={'text-xl font-semibold'}>Filter by Muscles</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <Surface variant={'default'}>
                  <div className={'grid grid-cols-2 gap-4 mt-4'}>
                    {muscles.map((muscle) => (
                      <div
                        className={'flex items-center gap-2'}
                        key={muscle.id}
                      >
                        <Checkbox
                          id={'muscle-' + muscle.id}
                          isSelected={tempSelectedMuscleIds.includes(muscle.id)}
                          onChange={() => handleToggleMuscle(muscle.id)}
                        >
                          <Checkbox.Control className={'size-6'}>
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                        </Checkbox>
                        <Label
                          className={'capitalize'}
                          htmlFor={'muscle-' + muscle.id}
                        >
                          {muscle.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </Surface>
              </Modal.Body>
              <Modal.Footer>
                {tempSelectedMuscleIds.length > 0 && (
                  <Button
                    onClick={() => setTempSelectedMuscleIds([])}
                    size="sm"
                  >
                    Clear
                  </Button>
                )}
                <Button
                  onClick={() => handleApplyFilters()}
                  size="sm"
                >
                  Apply filters
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <ListView<Exercise>
        emptyState={<Text>No Exercise Found</Text>}
        getKey={(exercise) => exercise.id}
        hasMore={hasNextPage}
        items={exercises}
        loadingMore={isFetchingNextPage}
        onLoadMore={fetchNextPage}
        querying={isLoading}
        render={(exercise) => (
          <ExerciseCard
            exercise={exercise}
            onClick={onExerciseClick}
          />
        )}
      />
    </Stack>
  );
};

export default ExerciseList;
