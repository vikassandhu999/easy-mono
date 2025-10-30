import {Box, Drawer, LoadingOverlay, TextInput} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {IconCalendar} from '@tabler/icons-react';
import {useCallback, useEffect, useMemo, useState} from 'react';

import type {AddSessionContext} from '@/shared/PlanSessionsView';
import type {PlanSession} from '@/store/services/plan_sessions';

import {DAY_NAMES} from '@/shared/PlanSessionsView/constants';

import type {DrawerView, SessionTypeFilter} from '../PlanBuilder.types';

import {ContextSummary, CreateSessionView, EditSessionView, SelectSessionView} from '.';
import {formatMealDaytimeLabel} from '../planBuilderUtils';
import {SESSION_TYPE_CONFIG} from '../sessionTypes';

interface PlanBuilderModalProps {
    calendarDateInput: string;
    drawerView: DrawerView;
    editingPlanSession: null | PlanSession;
    isCreatingSession: boolean;
    isOpen: boolean;
    onCalendarDateChange: (value: string) => void;
    onClose: () => void;
    onCreatePlanSession: (sessionId: string, sessionType?: 'meal' | 'workout') => Promise<boolean>;
    onNavigateToSelect: () => void;
    onRefetchSessions: () => void;
    selectedContext: AddSessionContext | null;
    sessionTypeFilter: SessionTypeFilter;
}

function getSessionTypeLabel(sessionType?: 'meal' | 'workout' | null): string {
    if (!sessionType) return 'Session';
    return SESSION_TYPE_CONFIG[sessionType]?.label ?? 'Session';
}

export function PlanBuilderDrawers({
    drawerView,
    editingPlanSession,
    isCreatingSession,
    isOpen,
    onClose,
    onCreatePlanSession,
    onNavigateToSelect,
    onRefetchSessions,
    selectedContext,
    sessionTypeFilter,
}: PlanBuilderModalProps) {
    const weeklyContextLabel = useMemo(() => {
        if (selectedContext?.kind !== 'weekly') return null;
        const weeklyLabel = formatMealDaytimeLabel(selectedContext.label);
        return weeklyLabel
            ? `${DAY_NAMES[selectedContext.dayOfWeek]} · ${weeklyLabel}`
            : DAY_NAMES[selectedContext.dayOfWeek];
    }, [selectedContext]);

    const handleSessionCreated = useCallback(
        async (session: {id: string}) => {
            if (!selectedContext) {
                notifications.show({
                    color: 'red',
                    message: 'Please select a day or date first.',
                    title: 'Missing context',
                });
                return;
            }

            const success = await onCreatePlanSession(session.id, sessionTypeFilter);

            if (success) {
                onClose();
            }
        },
        [onClose, onCreatePlanSession, selectedContext, sessionTypeFilter],
    );

    const handleSelectSession = useCallback(
        async (ids: string | string[]) => {
            const sessionIds = Array.isArray(ids) ? ids : [ids];

            if (!sessionIds.length || !selectedContext) {
                notifications.show({
                    color: 'red',
                    message: 'Please select a session first.',
                    title: 'No selection',
                });
                return;
            }

            const success = await onCreatePlanSession(sessionIds[0], sessionTypeFilter);

            if (success) {
                onClose();
            }
        },
        [onClose, onCreatePlanSession, selectedContext, sessionTypeFilter],
    );

    const handleSessionUpdated = useCallback(
        (_session: {id: string}, action?: 'close' | 'continue') => {
            onRefetchSessions();

            const sessionType = editingPlanSession?.session?.session_type as 'meal' | 'workout' | undefined;
            notifications.show({
                color: 'green',
                message: 'Changes saved',
                title: `${getSessionTypeLabel(sessionType)} updated`,
            });

            if (action === 'close') {
                onClose();
            }
        },
        [editingPlanSession?.session?.session_type, onClose, onRefetchSessions],
    );

    return (
        <Drawer
            onClose={onClose}
            opened={isOpen}
            size="md"
            withCloseButton={false}
        >
            {drawerView === 'select-session' && (
                <SelectSessionView
                    contextSummary={
                        <>
                            <ContextSummary
                                icon={<IconCalendar size={20} />}
                                label={weeklyContextLabel ?? DAY_NAMES[selectedContext.dayOfWeek]}
                            />
                        </>
                    }
                    onClose={onClose}
                    onCreateNew={onNavigateToSelect}
                    onSelect={handleSelectSession}
                    sessionTypeFilter={sessionTypeFilter}
                />
            )}

            {drawerView === 'create-session' && (
                <CreateSessionView
                    onBack={onNavigateToSelect}
                    onComplete={handleSessionCreated}
                    sessionTypeFilter={sessionTypeFilter}
                />
            )}

            {drawerView === 'edit-session' && (
                <EditSessionView
                    editingPlanSession={editingPlanSession}
                    onBack={onNavigateToSelect}
                    onComplete={handleSessionUpdated}
                />
            )}

            {isCreatingSession && <LoadingOverlay visible />}
        </Drawer>
    );
}
