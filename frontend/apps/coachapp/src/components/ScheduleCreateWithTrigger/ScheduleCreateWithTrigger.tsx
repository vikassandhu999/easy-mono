import {Drawer, useDrawersStack} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import React from 'react';
import {useNavigate} from 'react-router';

import {Program} from '@/api/programs.ts';
import {useCreateProgramScheduleMutation} from '@/store/services/schedulesApi';

import {PlanForm} from '../ScheduleForm/PlanForm';

type RenderProps = {
    onClick: (program: Program) => void;
};

type ScheduleCreateWithTriggerProps = {
    children: (props: RenderProps) => React.ReactNode;
};

export function ScheduleCreateWithTrigger({children}: ScheduleCreateWithTriggerProps) {
    const navigate = useNavigate();
    const [program, setProgram] = React.useState<null | Program>(null);
    const stack = useDrawersStack(['create-schedule']);

    const [createSchedule] = useCreateProgramScheduleMutation();

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
                <PlanForm
                    category={'workout'}
                    onSubmit={async (values) => {
                        try {
                            if (program?.id) {
                                await createSchedule({
                                    programId: program.id,
                                    data: values,
                                });
                            }
                            goToProgram();
                        } catch (error) {
                            notifications.show({
                                color: 'red',
                                message: 'Failed to create schedule',
                                title: 'Error',
                            });
                        }
                    }}
                    schedule={{
                        name: program?.name,
                    }}
                    submitText={'Create'}
                />
            </Drawer>
        </>
    );
}
