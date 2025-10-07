import {notifications} from '@mantine/notifications';
import {skipToken} from '@reduxjs/toolkit/query';
import {useState} from 'react';

import {CreateSession, Session} from '@/api/sessions';
import PaddingContainer from '@/components/containers/PaddingContainer';
import PagePaper from '@/components/containers/PagePaper';
import {useCreateSessionMutation, useGetSessionQuery} from '@/store/services/sessionsApi';

import SessionCard from './SessionCard';
import SessionCreateForm from './SessionCreateForm';

interface SessionBuilderProps {
    onComplete: (id: string) => void;
    sessionType: Session['session_type'];
}

export default function SessionBuilder({sessionType}: SessionBuilderProps) {
    const [sessionId, setSessionId] = useState<null | string>(null);

    const [createSession, {isLoading: isCreatingSession}] = useCreateSessionMutation();

    const sessionQuery = useGetSessionQuery(sessionId ? {id: sessionId, options: {include_contents: true}} : skipToken);

    const handleSessionCreated = async (values: CreateSession) => {
        try {
            const result = await createSession(values).unwrap();
            setSessionId(result.id);
            notifications.show({
                color: 'green',
                message: 'Session created successfully',
                title: 'Session saved',
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create session';
            notifications.show({
                color: 'red',
                message,
                title: 'Error',
            });
        }
    };

    const handleItemsUpdate = () => {
        sessionQuery.refetch();
    };

    return (
        <PagePaper>
            <PaddingContainer
                paddingX={'sm'}
                paddingY={'lg'}
            >
                {!sessionId && (
                    <CreatePhase
                        isSubmitting={isCreatingSession}
                        onSessionCreated={handleSessionCreated}
                        sessionType={sessionType}
                    />
                )}

                {sessionId && sessionQuery.isLoading && <LoadingState />}

                {sessionId && sessionQuery.data && (
                    <EditPhase
                        onItemsUpdate={handleItemsUpdate}
                        session={sessionQuery.data}
                    />
                )}
            </PaddingContainer>
        </PagePaper>
    );
}

function CreatePhase({
    isSubmitting,
    onSessionCreated,
    sessionType,
}: {
    isSubmitting: boolean;
    onSessionCreated: (values: CreateSession) => Promise<void>;
    sessionType: Session['session_type'];
}) {
    return (
        <SessionCreateForm
            isSubmitting={isSubmitting}
            onSubmit={onSessionCreated}
            sessionType={sessionType}
        />
    );
}

function EditPhase({onItemsUpdate, session}: {onItemsUpdate: () => void; session: Session}) {
    const handleEdit = () => {
        console.log('Edit session definition - not yet implemented');
    };

    return (
        <SessionCard
            isManagementMode={true}
            onEdit={handleEdit}
            onItemsUpdate={onItemsUpdate}
            session={session}
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
