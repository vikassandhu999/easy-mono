import {Alert} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {skipToken} from '@reduxjs/toolkit/query';
import {useCallback, useState} from 'react';

import {
    Session,
    SessionType,
    useCreateSessionMutation,
    useGetSessionQuery,
    useUpdateSessionMutation,
} from '@/services/session';
import PaddingContainer from '@/shared/containers/PaddingContainer';
import PagePaper from '@/shared/containers/PagePaper';
import {logger} from '@/utils/logger';

import SessionCreateForm from './SessionCreateForm';
import {DefinitionBuildError, SessionFormValues} from './sessionForm';

interface SessionBuilderProps {
    onComplete?: (session: Session, action?: 'close' | 'continue') => void;
    sessionId?: string;
    sessionType?: SessionType;
    showSaveOptions?: boolean; // Whether to show "Save & Close" and "Save" buttons
}

export default function SessionBuilder({
    onComplete,
    sessionId: initialSessionId,
    sessionType,
    showSaveOptions = false,
}: SessionBuilderProps) {
    const [currentSessionId, setCurrentSessionId] = useState<null | string>(initialSessionId ?? null);

    const sessionQuery = useGetSessionQuery(
        currentSessionId ? {id: currentSessionId, options: {include_contents: true}} : skipToken,
    );

    const {data: session} = sessionQuery;

    const [createSession, {isLoading: isCreatingSession}] = useCreateSessionMutation();
    const [updateSession, {isLoading: isUpdatingSession}] = useUpdateSessionMutation();

    const effectiveSessionType = session?.session_type ?? sessionType;
    const fallbackSessionType: SessionType = effectiveSessionType ?? 'workout';

    const handleDetailsSubmit = useCallback(
        async (values: SessionFormValues, action: 'close' | 'continue' = 'close') => {
            try {
                logger.debug('Submitting session values', values);
                if (!currentSessionId) {
                    const created = await createSession(values).unwrap();
                    setCurrentSessionId(created.id);
                    onComplete?.(created, action);
                    return;
                }

                const payload = values;
                const updated = await updateSession({
                    id: currentSessionId,
                    data: payload,
                }).unwrap();
                onComplete?.(updated, action);
                sessionQuery.refetch();
            } catch (error) {
                const message =
                    error instanceof DefinitionBuildError
                        ? error.message
                        : error instanceof Error
                          ? error.message
                          : 'Failed to save session';
                notifications.show({
                    color: 'red',
                    message,
                    title: 'Unable to save',
                });
            }
        },
        [createSession, currentSessionId, onComplete, sessionQuery, updateSession],
    );

    if (!currentSessionId && !effectiveSessionType) {
        return (
            <PagePaper>
                <PaddingContainer
                    paddingX="sm"
                    paddingY="lg"
                >
                    <Alert
                        color="red"
                        title="Session type required"
                    >
                        Provide a session type before building a new session.
                    </Alert>
                </PaddingContainer>
            </PagePaper>
        );
    }

    return (
        <SessionCreateForm
            defaultSessionType={fallbackSessionType}
            initialSession={session}
            isSubmitting={isCreatingSession || isUpdatingSession}
            onSubmit={handleDetailsSubmit}
            showSaveOptions={showSaveOptions && !!currentSessionId} // Only show options when editing
            submitLabel={currentSessionId ? 'Update Session' : 'Create Session'}
        />
    );
}
