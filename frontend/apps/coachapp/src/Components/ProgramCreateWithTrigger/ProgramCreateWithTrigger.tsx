import {Drawer, useDrawersStack} from '@mantine/core';
import React from 'react';
import {ProgramForm} from '../ProgramForm/Form';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {CreateProgramProps, Program, ProgramsAPI} from '@/Api/Programs';
import {notifications} from '@mantine/notifications';
import {ScheduleForm} from '../ScheduleForm/ScheduleForm';
import {ScheduleChoice} from './ScheduleChoice';
import {useNavigate} from 'react-router';
import {CreateScheduleProps, SchedulesAPI} from '@/Api/Schedules';
import {SCHEDULES_QUERY_KEYS} from '@/Hooks/useScheduleQueries';

type RenderProps = {
    onClick: () => void;
};

type ProgramCreateWithTriggerProps = {
    children: (props: RenderProps) => React.ReactNode;
};

export function ProgramCreateWithTrigger({children}: ProgramCreateWithTriggerProps) {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [program, setProgram] = React.useState<Program | null>(null);
    const stack = useDrawersStack(['create-program', 'choose-schedule', 'build-schedule']);

    const createProgram = useMutation({
        mutationFn: async (data: CreateProgramProps) => {
            const result = await ProgramsAPI.createProgram(data);
            if (result.isError) {
                throw result.getError();
            }
            return result.getValue();
        },
        onSuccess: (data) => {
            setProgram(data);
            stack.open('choose-schedule');
            queryClient.invalidateQueries({queryKey: ['programs']});
        },
        onError: () => {
            notifications.show({
                title: 'Error',
                message: 'Failed to create program',
                color: 'red',
                autoClose: 1000,
            });
        },
    });

    const createSchedule = useMutation({
        mutationFn: (data: CreateScheduleProps) => SchedulesAPI.createSchedule(data),
        onSuccess: (result) => {
            if (!result.isError) {
                // Invalidate schedules list
                queryClient.invalidateQueries({
                    queryKey: SCHEDULES_QUERY_KEYS.lists(),
                });
            } else {
                notifications.show({
                    title: 'Failed to create schedule',
                    message: result.error?.message || 'Something went wrong',
                    color: 'red',
                });
            }
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

    const onClick = () => {
        stack.open('create-program');
    };

    return (
        <>
            {children({onClick})}
            <Drawer
                {...stack.register('create-program')}
                withCloseButton={false}
            >
                <ProgramForm
                    title={'Create program'}
                    submitText={'Create'}
                    onSubmit={async (values) => {
                        await createProgram.mutateAsync(values);
                        stack.close('create-program');
                    }}
                    onCancel={() => stack.close('create-program')}
                />
            </Drawer>
            <Drawer
                {...stack.register('choose-schedule')}
                withCloseButton={false}
            >
                <ScheduleChoice
                    onSelect={async (value) => {
                        if (value === 'later') {
                            goToProgram();
                        } else {
                            stack.open('build-schedule');
                        }
                    }}
                />
            </Drawer>
            <Drawer
                {...stack.register('build-schedule')}
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
