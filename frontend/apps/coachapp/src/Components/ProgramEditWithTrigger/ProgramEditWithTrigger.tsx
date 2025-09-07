import {Drawer, LoadingOverlay} from '@mantine/core';
import React, {useState} from 'react';
import {ProgramForm} from '../ProgramForm/Form';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useProgram} from '@/Hooks/useProgramQueries';
import {UpdateProgramProps, ProgramsAPI} from '@/Api/Programs';
import {notifications} from '@mantine/notifications';

type RenderProps = {
    onClick: (id: string) => void;
};

type ProgramEditWithTriggerProps = {
    children: (props: RenderProps) => React.ReactNode;
};

export function ProgramEditWithTrigger({children}: ProgramEditWithTriggerProps) {
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [id, setId] = useState<string | null>(null);

    const {data: program, isLoading, error} = useProgram(id);

    const updateProgram = useMutation({
        mutationFn: async (data: UpdateProgramProps) => {
            const result = await ProgramsAPI.updateProgram(id, data);
            if (result.isError) {
                throw result.getError();
            }
            return result.getValue();
        },
        onSuccess: (data, variables) => {
            queryClient.setQueryData(['program', id], data);
            queryClient.invalidateQueries({queryKey: ['programs']});
            notifications.show({
                title: 'Success',
                message: `"${variables.name || 'Program'}" updated successfully`,
                color: 'green',
                autoClose: 1000,
            });
        },
        onError: () => {
            notifications.show({
                title: 'Error',
                message: 'Failed to update program',
                color: 'red',
                autoClose: 1000,
            });
        },
    });

    const onClick = (id: string) => {
        setId(id);
        setOpen(true);
    };

    return (
        <>
            {children({onClick})}
            <Drawer
                opened={open}
                onClose={() => setOpen(false)}
                withCloseButton={false}
            >
                {isLoading && <LoadingOverlay />}
                {error && <div>{error.message}</div>}
                {program && (
                    <ProgramForm
                        initialData={program}
                        title={'Updating ' + (program?.name || 'Program')}
                        submitText={'Update program'}
                        onSubmit={async (values) => {
                            await updateProgram.mutateAsync(values);
                            setOpen(false);
                        }}
                        onCancel={() => setOpen(false)}
                    />
                )}
            </Drawer>
        </>
    );
}
