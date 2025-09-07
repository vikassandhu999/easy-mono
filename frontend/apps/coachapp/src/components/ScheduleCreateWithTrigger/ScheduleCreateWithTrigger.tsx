import {Drawer, useDrawersStack} from '@mantine/core';
import React from 'react';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {Program} from '@/api/programs.ts';
import {notifications} from '@mantine/notifications';
import {ScheduleForm} from '../ScheduleForm/ScheduleForm';
import {useNavigate} from 'react-router';
import {CreateScheduleProps, SchedulesAPI} from '@/api/schedules.ts';
import {SCHEDULES_QUERY_KEYS} from '@/hooks/useScheduleQueries';

type RenderProps = {
    onClick: (program: Program) => void;
};

type ScheduleCreateWithTriggerProps = {
    children: (props: RenderProps) => React.ReactNode;
};

export function ScheduleCreateWithTrigger({children}: ScheduleCreateWithTriggerProps) {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [program, setProgram] = React.useState<Program | null>(null);
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
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: SCHEDULES_QUERY_KEYS.lists(),
            });
            queryClient.invalidateQueries({
                queryKey: SCHEDULES_QUERY_KEYS.program(program?.id),
            });
        },
        onError: (error) => {
            notifications.show({
                title: 'Failed to create schedule',
                message: error.message || 'Something went wrong',
                color: 'red',
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
                    title={program ? `${program?.name} schedule` : 'Create schedule'}
                    submitText={'Create'}
                    schedule={{
                        name: program?.name,
                    }}
                    onSubmit={async (values) => {
                        await createSchedule.mutateAsync(values);
                        goToProgram();
                    }}
                    onCancel={() => goToProgram()}
                />
            </Drawer>
        </>
    );
}
