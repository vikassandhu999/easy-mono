import {Box, Text} from '@mantine/core';

import type {PlanSession} from '@/store/services/plan_sessions';

import Header from '@/components/layouts/Header';
import SessionBuilder from '@/components/SessionBuilder/SessionBuilder';

import {SESSION_TYPE_CONFIG} from '../sessionTypes';

interface EditSessionViewProps {
    editingPlanSession: null | PlanSession;
    onBack: () => void;
    onComplete: (session: {id: string}, action?: 'close' | 'continue') => void;
}

function getSessionTypeLabel(sessionType?: 'meal' | 'workout' | null): string {
    if (!sessionType) return 'Session';
    return SESSION_TYPE_CONFIG[sessionType]?.label ?? 'Session';
}

export function EditSessionView({editingPlanSession, onBack, onComplete}: EditSessionViewProps) {
    const editingSessionId = editingPlanSession?.session?.id ?? null;
    const sessionType = editingPlanSession?.session?.session_type as 'meal' | 'workout' | undefined;

    return (
        <>
            <Box
                p="lg"
                style={{
                    borderBottom: '1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-4))',
                    flexShrink: 0,
                }}
            >
                <Header
                    onBack={onBack}
                    title={editingPlanSession?.session?.name || `Edit ${getSessionTypeLabel(sessionType)}`}
                />
            </Box>

            <Box
                style={{
                    flex: 1,
                    overflow: 'auto',
                }}
            >
                {editingSessionId ? (
                    <SessionBuilder
                        onComplete={onComplete}
                        sessionId={editingSessionId}
                        sessionType={(sessionType as any) ?? 'workout'}
                        showSaveOptions={true}
                    />
                ) : (
                    <Box p="md">
                        <Text c="dimmed">Session not found.</Text>
                    </Box>
                )}
            </Box>
        </>
    );
}
