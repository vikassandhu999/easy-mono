import {Box} from '@mantine/core';

import Header from '@/shared/layouts/Header';
import SessionBuilder from '@/shared/SessionBuilder/SessionBuilder';

import type {SessionTypeFilter} from '../PlanBuilder.types';

import {SESSION_TYPE_CONFIG} from '../sessionTypes';

interface CreateSessionViewProps {
    onBack: () => void;
    onComplete: (session: {id: string}) => void;
    sessionTypeFilter: SessionTypeFilter;
}

function getSessionTypeLabel(sessionType?: 'meal' | 'workout' | null): string {
    if (!sessionType) return 'Session';
    return SESSION_TYPE_CONFIG[sessionType]?.label ?? 'Session';
}

export function CreateSessionView({onBack, onComplete, sessionTypeFilter}: CreateSessionViewProps) {
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
                    title={`Create ${getSessionTypeLabel(sessionTypeFilter).toLowerCase()}`}
                />
            </Box>

            <Box
                style={{
                    flex: 1,
                    overflow: 'auto',
                }}
            >
                <SessionBuilder
                    onComplete={onComplete}
                    sessionType={(sessionTypeFilter as any) ?? 'workout'}
                />
            </Box>
        </>
    );
}
