import {Drawer, useDrawersStack} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import React from 'react';
import {useNavigate} from 'react-router';

import {CreateProgramProps, Program, ProgramsAPI} from '@/api/programs.ts';
import {CreateScheduleProps, SchedulesAPI} from '@/api/schedules.ts';
import {SCHEDULES_QUERY_KEYS} from '@/views/Schedules/hooks/useSchedules';

import {PlanForm} from '../PlanForm/PlanForm';
import {ProgramForm} from '../ProgramForm/Form';
import {ScheduleChoice} from './ScheduleChoice';

type RenderProps = {
    onClick: () => void;
};

type ScheduleEntryAddWithTriggerProps = {
    children: (props: RenderProps) => React.ReactNode;
};

export function ScheduleEntryAddWithTrigger({children}: ScheduleEntryAddWithTriggerProps) {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [program, setProgram] = React.useState<null | Program>(null);
    const stack = useDrawersStack(['create-program', 'choose-schedule', 'build-schedule']);

    const createProgram = useMutation({
        mutationFn: async (data: CreateProgramProps) => {
            const result = await ProgramsAPI.createProgram(data);
            if (result.isError) {
                throw result.getError();
            }
            return result.getValue();
        },
        onError: () => {
            notifications.show({
                autoClose: 1000,
                color: 'red',
                message: 'Failed to create program',
                title: 'Error',
            });
        },
        onSuccess: (data) => {
            setProgram(data);
            stack.open('choose-schedule');
            queryClient.invalidateQueries({queryKey: ['programs']});
        },
    });

    const createSchedule = useMutation({
        mutationFn: (data: CreateScheduleProps) => SchedulesAPI.createSchedule(data),
        onError: (error) => {
            notifications.show({
                color: 'red',
                message: error.message || 'Something went wrong',
                title: 'Failed to create schedule',
            });
        },
        onSuccess: (result) => {
            if (!result.isError) {
                // Invalidate schedules list
                queryClient.invalidateQueries({
                    queryKey: SCHEDULES_QUERY_KEYS.lists(),
                });
            } else {
                notifications.show({
                    color: 'red',
                    message: result.error?.message || 'Something went wrong',
                    title: 'Failed to create schedule',
                });
            }
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
                    onCancel={() => stack.close('create-program')}
                    onSubmit={async (values) => {
                        await createProgram.mutateAsync(values);
                        stack.close('create-program');
                    }}
                    submitText={'Create'}
                    title={'Create program'}
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
                <PlanForm
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
