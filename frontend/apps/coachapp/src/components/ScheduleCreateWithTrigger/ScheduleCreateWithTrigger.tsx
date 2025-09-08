import {Drawer, useDrawersStack} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import React from 'react';
import {useNavigate} from 'react-router';

import {Program} from '@/api/programs.ts';
import {CreateScheduleProps, SchedulesAPI} from '@/api/schedules.ts';
import {SCHEDULES_QUERY_KEYS} from '@/hooks/useScheduleQueries';

import {ScheduleForm} from '../ScheduleForm/ScheduleForm';

type RenderProps = {
    onClick: (program: Program) => void;
};

type ScheduleCreateWithTriggerProps = {
    children: (props: RenderProps) => React.ReactNode;
};

export function ScheduleCreateWithTrigger({children}: ScheduleCreateWithTriggerProps) {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [program, setProgram] = React.useState<null | Program>(null);
    const stack = useDrawersStack(['create-schedule']);

    const createSchedule = useMutation({
        mutationFn: async (data: CreateScheduleProps) => {
            const res = await SchedulesAPI.createSchedule({
                ...data,
                program_id: program?.id, // Associate with the selected program
            } as CreateScheduleProps);
            if (res.isError) {
                throw res.getError();
            }
            return res.getValue();
        },
        onError: (error) => {
            notifications.show({
                color: 'red',
                message: error.message || 'Something went wrong',
                title: 'Failed to create schedule',
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: SCHEDULES_QUERY_KEYS.lists(),
            });
            queryClient.invalidateQueries({
                queryKey: SCHEDULES_QUERY_KEYS.program(program?.id),
            });
        },
    });

    const goToProgram = () => {
        navigate(`/programs/${program?.id}`, {replace: true});
        stack.closeAll();
    };

    const onClick = (program: Program) => {
        setProgram(program);
        stack.open('create-schedule');
    };

    return (
        <>
            {children({onClick})}
            <Drawer
                {...stack.register('create-schedule')}
                withCloseButton={false}
            >
                <ScheduleForm
                    onCancel={() => goToProgram()}
                    onSubmit={async (values) => {
                        await createSchedule.mutateAsync(values);
                        goToProgram();
                    }}
                    schedule={{
                        name: program?.name,
                    }}
                    submitText={'Create'}
                    title={program ? `${program?.name} schedule` : 'Create schedule'}
                />
            </Drawer>
        </>
    );
}
