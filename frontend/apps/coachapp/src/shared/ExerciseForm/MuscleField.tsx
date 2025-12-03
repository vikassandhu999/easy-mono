import {MultiSelect, Title} from '@mantine/core';
import {FC, useMemo, useState} from 'react';
import {Controller, UseFormReturn} from 'react-hook-form';

import {CreateExercise} from '@/services/exercises';
import {useListMuscles} from '@/services/muscles';
import { capitalizeWords } from '@/utils/text';

type MuscleFieldProps = {
    form: UseFormReturn<CreateExercise, any, CreateExercise>;
};

const MuscleField: FC<MuscleFieldProps> = ({form}) => {
    const {control, formState} = form;
    const [search, setSearch] = useState('');

    const {data} = useListMuscles({search});

    const muscles = useMemo(() => data?.data || [], [data]);

    const selectData = useMemo(() => {
        return muscles.map((muscle) => ({
            value: muscle.id,
            label: capitalizeWords(muscle.name),
        }));
    }, [muscles]);

    return (
        <Controller
            control={control}
            name="muscle_ids"
            render={({field}) => (
                <MultiSelect
                    {...field}
                    data={selectData}
                    error={formState.errors.muscle_ids?.message}
                    label={
                        <Title
                            fw="bold"
                            order={5}
                        >
                            Target Muscles
                        </Title>
                    }
                    limit={20}
                    onSearchChange={setSearch}
                    placeholder="Select muscles"
                    searchable
                    value={field.value || []}
                />
            )}
        />
    );
};

export default MuscleField;
