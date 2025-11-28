import {Select, Title} from '@mantine/core';
import {FC} from 'react';
import {Controller, UseFormReturn} from 'react-hook-form';

import {CreateExercise} from '@/services/exercises';

type ForceFieldProps = {
    form: UseFormReturn<CreateExercise, any, CreateExercise>;
};

const ForceField: FC<ForceFieldProps> = ({form}) => {
    const {control, formState} = form;

    return (
        <Controller
            control={control}
            name="force"
            render={({field}) => (
                <Select
                    {...field}
                    data={[
                        {
                            value: 'push',
                            label: 'Push',
                        },
                        {
                            value: 'pull',
                            label: 'Pull',
                        },
                        {
                            value: 'static',
                            label: 'Static',
                        },
                    ]}
                    error={formState.errors.force?.message}
                    label={
                        <Title
                            fw="bold"
                            order={5}
                        >
                            Force
                        </Title>
                    }
                    placeholder="Pick value"
                    value={field.value || null}
                />
            )}
        />
    );
};

export default ForceField;
