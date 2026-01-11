import {Button, Checkbox, Chip, Label, Modal, Surface} from '@heroui/react';
import {IconChevronDown} from '@tabler/icons-react';
import {useMemo, useState} from 'react';

import {useListMuscles} from '@/services/muscles';

export interface MuscleFilterProps {
  muscleIds: string[];
  onMuscleIdsChange: (muscleIds: string[]) => void;
}

const MuscleFilter = ({muscleIds, onMuscleIdsChange}: MuscleFilterProps) => {
  const [tempMuscleIds, setTempMuscleIds] = useState<string[]>(muscleIds || []);
  const [isOpen, setIsOpen] = useState(false);

  const {data: musclesData} = useListMuscles({}, {skip: !isOpen});
  const muscles = useMemo(() => musclesData?.data ?? [], [musclesData?.data]);

  const toggleMuscle = (muscleId: string) => {
    setTempMuscleIds((prev) => (prev.includes(muscleId) ? prev.filter((id) => id !== muscleId) : [...prev, muscleId]));
  };

  const open = () => {
    setIsOpen(true);
  };

  const close = () => {
    onMuscleIdsChange(tempMuscleIds);
    setIsOpen(false);
  };

  const hasSelectedMuscles = muscleIds.length > 0;

  return (
    <Modal>
      <Button
        onClick={open}
        size={'sm'}
        variant={hasSelectedMuscles ? 'primary' : 'secondary'}
      >
        Muscles
        {hasSelectedMuscles && <Chip size="sm">{tempMuscleIds.length}</Chip>}
        <IconChevronDown size={24} />
      </Button>
      <Modal.Backdrop
        isOpen={isOpen}
        onOpenChange={close}
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
                        isSelected={tempMuscleIds.includes(muscle.id)}
                        onChange={() => toggleMuscle(muscle.id)}
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
              {tempMuscleIds.length > 0 && (
                <Button
                  onClick={() => setTempMuscleIds([])}
                  size="sm"
                >
                  Clear
                </Button>
              )}
              <Button
                onClick={() => close()}
                size="sm"
              >
                Apply filters
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default MuscleFilter;
