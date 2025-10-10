import {Alert, LoadingOverlay, Stack} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {skipToken} from '@reduxjs/toolkit/query';
import {useCallback, useEffect, useState} from 'react';

import {Session, SessionItemConfig, SessionType} from '@/api/sessions';
import PaddingContainer from '@/components/containers/PaddingContainer';
import PagePaper from '@/components/containers/PagePaper';
import {useCreateSessionMutation, useGetSessionQuery, useUpdateSessionMutation} from '@/store/services/sessionsApi';

import SessionCreateForm from './SessionCreateForm';
import {DefinitionBuildError, SessionFormValues, toCreateSessionPayload, toUpdateSessionPayload} from './sessionForm';
import SessionItemsManager from './SessionItemsManager';
import {workoutDefinitionToItems} from './utils';

interface SessionBuilderProps {
    onComplete?: (session: Session) => void;
    sessionId?: string;
    sessionType?: SessionType;
}

export default function SessionBuilder({onComplete, sessionId: initialSessionId, sessionType}: SessionBuilderProps) {
    const [currentSessionId, setCurrentSessionId] = useState<null | string>(initialSessionId ?? null);
    const [draftItems, setDraftItems] = useState<SessionItemConfig[]>([]);

    const sessionQuery = useGetSessionQuery(
        currentSessionId ? {id: currentSessionId, options: {include_contents: true}} : skipToken,
    );

    const {
        data: session,
        error: sessionError,
        isFetching: isFetchingSession,
        isLoading: isLoadingSessionState,
    } = sessionQuery;

    const [createSession, {isLoading: isCreatingSession}] = useCreateSessionMutation();
    const [updateSession, {isLoading: isUpdatingSession}] = useUpdateSessionMutation();

    const effectiveSessionType = session?.session_type ?? sessionType;
    const fallbackSessionType: SessionType = effectiveSessionType ?? 'workout';
    const isWorkoutSession = fallbackSessionType === 'workout';

    const handleItemsChange = useCallback((nextItems: SessionItemConfig[]) => {
        setDraftItems(nextItems);
    }, []);

    useEffect(() => {
        if (!session) {
            return;
        }

        if (session.session_type !== 'workout') {
            setDraftItems([]);
            return;
        }

        setDraftItems(workoutDefinitionToItems(session));
    }, [session]);

    useEffect(() => {
        if (session || isWorkoutSession) {
            return;
        }
        setDraftItems([]);
    }, [isWorkoutSession, session]);

    const handleDetailsSubmit = useCallback(
        async (values: SessionFormValues) => {
            try {
                if (!currentSessionId) {
                    const payload = toCreateSessionPayload(values, {workoutItems: draftItems});
                    const created = await createSession(payload).unwrap();
                    setCurrentSessionId(created.id);
                    onComplete?.(created);
                    return;
                }

                const payload = toUpdateSessionPayload(values, session, {workoutItems: draftItems});
                const updated = await updateSession({id: currentSessionId, data: payload}).unwrap();
                onComplete?.(updated);
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
        [createSession, currentSessionId, draftItems, onComplete, session, sessionQuery, updateSession],
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

    const isSessionPending = isFetchingSession || isLoadingSessionState;

    return (
        <PagePaper>
            <PaddingContainer
                paddingX="sm"
                paddingY="lg"
            >
                <Stack gap="xl">
                    {/* Session Details Section */}
                    <SessionCreateForm
                        defaultSessionType={fallbackSessionType}
                        initialSession={session}
                        isSubmitting={isCreatingSession || isUpdatingSession}
                        onSubmit={handleDetailsSubmit}
                        submitLabel={currentSessionId ? 'Save session details' : undefined}
                    />

                    {/* Session Items Section */}
                    <Stack gap="md">
                        <div style={{position: 'relative'}}>
                            <LoadingOverlay visible={isSessionPending && Boolean(currentSessionId)} />

                            {!isWorkoutSession && (
                                <Alert color="blue">Session items are available for workout sessions only.</Alert>
                            )}

                            {isWorkoutSession && (
                                <>
                                    {currentSessionId && sessionError && !session && (
                                        <Alert
                                            color="red"
                                            title="Unable to load session"
                                        >
                                            We couldn't load the latest session information. Please try again.
                                        </Alert>
                                    )}

                                    <SessionItemsManager
                                        isEditable
                                        items={draftItems}
                                        onItemsChange={handleItemsChange}
                                        onItemsUpdate={() => {
                                            sessionQuery.refetch();
                                        }}
                                        session={session ?? null}
                                        sessionType={fallbackSessionType}
                                    />
                                </>
                            )}
                        </div>
                    </Stack>
                </Stack>
            </PaddingContainer>
        </PagePaper>
    );
}
