import {Select, Title} from '@mantine/core';
import {FC} from 'react';
import {Controller, UseFormReturn} from 'react-hook-form';

import {CreateExercise} from '@/services/exercises';

type MechanicsFieldProps = {
    form: UseFormReturn<CreateExercise, any, CreateExercise>;
};

const MechanicsField: FC<MechanicsFieldProps> = ({form}) => {
    const {control, formState} = form;

    return (
        <Controller
            control={control}
            name="mechanics"
            render={({field}) => (
                <Select
                    {...field}
                    data={[
                        {
                            value: 'compound',
                            label: 'Compound',
                        },
                        {
                            value: 'isolation',
                            label: 'Isolation',
                        },
                        {
                            value: 'isometric',
                            label: 'Isometric',
                        },
                    ]}
                    error={formState.errors.mechanics?.message}
                    label={
                        <Title
                            fw="bold"
                            order={5}
                        >
                            Mechanics
                        </Title>
                    }
                    placeholder="Pick value"
                    value={field.value || null}
                />
            )}
        />
    );
};

export default MechanicsField;
