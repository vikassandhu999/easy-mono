import {notifications} from '@mantine/notifications';
import {useMutation, useQuery} from '@tanstack/react-query';
import {useState} from 'react';

import {CreateSessionDef, SessionDef, SessionDefsAPI} from '@/api/session_defs.ts';
import PaddingContainer from '@/components/containers/PaddingContainer';
import PagePaper from '@/components/containers/PagePaper';

import SessionCreateForm from './SessionCreateForm';
import SessionDefCard from './SessionDefCard';

interface SessionBuilderProps {
    onComplete: (id: string) => void;
    sessionType: SessionDef['session_type'];
}

export default function SessionBuilder({sessionType}: SessionBuilderProps) {
    const [sessionDefId, setSessionDefId] = useState<null | string>(null);

    const createSessionDefMutation = useMutation({
        mutationFn: async (data: CreateSessionDef) => {
            const result = await SessionDefsAPI.createSessionDef(data);
            if (result.isError) {
                throw result.getError();
            }
            return result.getValue();
        },
        onError: () => {
            notifications.show({
                color: 'red',
                message: 'Failed to create session',
                title: 'Error',
            });
        },
        onSuccess: async (result) => {
            setSessionDefId(result.id);
        },
    });

    const sessionDefQuery = useQuery({
        enabled: !!sessionDefId,
        queryFn: async () => {
            if (!sessionDefId) return null;
            const result = await SessionDefsAPI.getSessionDef(sessionDefId, {
                include_contents: true,
            });
            if (result.isError) {
                throw result.getError();
            }
            return result.getValue();
        },
        queryKey: ['sessiondef', sessionDefId],
    });

    const handleSessionCreated = async (values: CreateSessionDef) => {
        await createSessionDefMutation.mutateAsync(values);
    };

    const handleItemsUpdate = () => {
        sessionDefQuery.refetch();
    };

    return (
        <PagePaper>
            <PaddingContainer
                paddingX={'sm'}
                paddingY={'lg'}
            >
                {!sessionDefId && (
                    <CreatePhase
                        onSessionCreated={handleSessionCreated}
                        sessionType={sessionType}
                    />
                )}

                {sessionDefId && sessionDefQuery.isLoading && <LoadingState />}

                {sessionDefId && sessionDefQuery.data && (
                    <EditPhase
                        onItemsUpdate={handleItemsUpdate}
                        sessionDef={sessionDefQuery.data}
                    />
                )}
            </PaddingContainer>
        </PagePaper>
    );
}

function CreatePhase({
    onSessionCreated,
    sessionType,
}: {
    onSessionCreated: (values: CreateSessionDef) => Promise<void>;
    sessionType: SessionDef['session_type'];
}) {
    return (
        <SessionCreateForm
            onSubmit={onSessionCreated}
            sessionType={sessionType}
        />
    );
}

function EditPhase({onItemsUpdate, sessionDef}: {onItemsUpdate: () => void; sessionDef: SessionDef}) {
    const handleEdit = () => {
        console.log('Edit session definition - not yet implemented');
    };

    return (
        <SessionDefCard
            isManagementMode={true}
            onEdit={handleEdit}
            onItemsUpdate={onItemsUpdate}
            sessionDef={sessionDef}
            showEditButton={true}
        />
    );
}

function LoadingState() {
    return (
        <PaddingContainer
            paddingX={'sm'}
            paddingY={'lg'}
        >
            <div>Loading session definition...</div>
        </PaddingContainer>
    );
}
