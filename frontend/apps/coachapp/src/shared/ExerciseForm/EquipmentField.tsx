import {MultiSelect} from '@mantine/core';
import {FC, useMemo, useState} from 'react';
import {Controller, UseFormReturn} from 'react-hook-form';

import {useListEquipment} from '@/services/equipment';
import {CreateExercise} from '@/services/exercises';

type EquipmentFieldProps = {
  form: UseFormReturn<CreateExercise, any, CreateExercise>;
};

const EquipmentField: FC<EquipmentFieldProps> = ({form}) => {
  const {control, formState} = form;
  const [search, setSearch] = useState('');

  const {data} = useListEquipment({search});

  const equipment = useMemo(() => data?.data || [], [data]);

  const selectData = useMemo(() => {
    return equipment.map((item) => ({
      value: item.id,
      label: item.name,
    }));
  }, [equipment]);

  return (
    <Controller
      control={control}
      name="equipment_ids"
      render={({field}) => (
        <MultiSelect
          {...field}
          data={selectData}
          error={formState.errors.equipment_ids?.message}
          label={'Equipment'}
          limit={20}
          onSearchChange={setSearch}
          placeholder="Select equipment"
          searchable
          size={'md'}
          value={field.value || []}
        />
      )}
    />
  );
};

export default EquipmentField;
