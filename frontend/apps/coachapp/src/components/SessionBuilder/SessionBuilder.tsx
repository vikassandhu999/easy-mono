import {useState} from 'react';
import {useMutation, useQuery} from '@tanstack/react-query';
import {notifications} from '@mantine/notifications';

import {CreateSessionDef, SessionDef, SessionDefsAPI} from '@/api/session_defs.ts';
import SessionCreateForm from './SessionCreateForm';
import SessionDefCard from './SessionDefCard';
import PaddingContainer from '@/components/containers/PaddingContainer';
import PagePaper from '@/components/containers/PagePaper';

interface SessionBuilderProps {
    sessionType: SessionDef['session_type'];
    onComplete: (id: string) => void;
}

function CreatePhase({
    sessionType,
    onSessionCreated,
}: {
    sessionType: SessionDef['session_type'];
    onSessionCreated: (values: CreateSessionDef) => Promise<void>;
}) {
    return (
        <SessionCreateForm
            sessionType={sessionType}
            onSubmit={onSessionCreated}
        />
    );
}

function EditPhase({sessionDef, onItemsUpdate}: {sessionDef: SessionDef; onItemsUpdate: () => void}) {
    const handleEdit = () => {
        console.log('Edit session definition - not yet implemented');
    };

    return (
        <SessionDefCard
            sessionDef={sessionDef}
            showEditButton={true}
            isManagementMode={true}
            onEdit={handleEdit}
            onItemsUpdate={onItemsUpdate}
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

export default function SessionBuilder({sessionType}: SessionBuilderProps) {
    const [sessionDefId, setSessionDefId] = useState<string | null>(null);

    const createSessionDefMutation = useMutation({
        mutationFn: async (data: CreateSessionDef) => {
            const result = await SessionDefsAPI.createSessionDef(data);
            if (result.isError) {
                throw result.getError();
            }
            return result.getValue();
        },
        onSuccess: async (result) => {
            setSessionDefId(result.id);
        },
        onError: () => {
            notifications.show({
                title: 'Error',
                message: 'Failed to create session',
                color: 'red',
            });
        },
    });

    const sessionDefQuery = useQuery({
        queryKey: ['sessiondef', sessionDefId],
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
        enabled: !!sessionDefId,
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
                        sessionType={sessionType}
                        onSessionCreated={handleSessionCreated}
                    />
                )}

                {sessionDefId && sessionDefQuery.isLoading && <LoadingState />}

                {sessionDefId && sessionDefQuery.data && (
                    <EditPhase
                        sessionDef={sessionDefQuery.data}
                        onItemsUpdate={handleItemsUpdate}
                    />
                )}
            </PaddingContainer>
        </PagePaper>
    );
}
