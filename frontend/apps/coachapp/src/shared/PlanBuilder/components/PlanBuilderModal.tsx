import {Box, LoadingOverlay, Modal, TextInput} from '@mantine/core';
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

export function PlanBuilderModal({
    calendarDateInput,
    drawerView,
    editingPlanSession,
    isCreatingSession,
    isOpen,
    onCalendarDateChange,
    onClose,
    onCreatePlanSession,
    onNavigateToSelect,
    onRefetchSessions,
    selectedContext,
    sessionTypeFilter,
}: PlanBuilderModalProps) {
    const [localCalendarDate, setLocalCalendarDate] = useState(calendarDateInput);

    useEffect(() => {
        setLocalCalendarDate(calendarDateInput);
    }, [calendarDateInput]);

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

            if (selectedContext.kind === 'calendar' && !localCalendarDate) {
                notifications.show({
                    color: 'red',
                    message: 'Choose a calendar date for this session.',
                    title: 'Date required',
                });
                return;
            }

            const success = await onCreatePlanSession(session.id, sessionTypeFilter);

            if (success) {
                onClose();
            }
        },
        [localCalendarDate, onClose, onCreatePlanSession, selectedContext, sessionTypeFilter],
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

            if (selectedContext.kind === 'calendar' && !localCalendarDate) {
                notifications.show({
                    color: 'red',
                    message: 'Choose a calendar date for this session.',
                    title: 'Date required',
                });
                return;
            }

            const success = await onCreatePlanSession(sessionIds[0], sessionTypeFilter);

            if (success) {
                onClose();
            }
        },
        [localCalendarDate, onClose, onCreatePlanSession, selectedContext, sessionTypeFilter],
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

    const handleCalendarDateChange = useCallback(
        (value: string) => {
            setLocalCalendarDate(value);
            onCalendarDateChange(value);
        },
        [onCalendarDateChange],
    );

    return (
        <Modal
            fullScreen
            onClose={onClose}
            opened={isOpen}
            size="xl"
            styles={{
                body: {
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    padding: 0,
                },
                content: {
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    padding: 0,
                },
            }}
            transitionProps={{duration: 200}}
            withCloseButton={false}
        >
            {drawerView === 'select-session' && (
                <SelectSessionView
                    contextSummary={
                        <>
                            {selectedContext?.kind === 'weekly' && (
                                <ContextSummary
                                    icon={<IconCalendar size={20} />}
                                    label={weeklyContextLabel ?? DAY_NAMES[selectedContext.dayOfWeek]}
                                />
                            )}
                            {selectedContext?.kind === 'daily' && (
                                <ContextSummary
                                    icon={<IconCalendar size={20} />}
                                    label={`Day ${selectedContext.dayOrder + 1}`}
                                />
                            )}
                            {selectedContext?.kind === 'calendar' && (
                                <Box mb="lg">
                                    <TextInput
                                        label="Session date"
                                        onChange={(event) => handleCalendarDateChange(event.currentTarget.value)}
                                        size="md"
                                        type="date"
                                        value={localCalendarDate}
                                    />
                                </Box>
                            )}
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
        </Modal>
    );
}
