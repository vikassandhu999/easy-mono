import type {ReactNode} from 'react';

import {Box} from '@mantine/core';

import Header from '@/shared/layouts/Header';
import MealSelect from '@/shared/MealSelect/MealSelect';
import SessionSelect from '@/shared/SessionSelect/SessionSelect';

import type {SessionTypeFilter} from '../PlanBuilder.types';

import {SESSION_TYPE_CONFIG} from '../sessionTypes';

interface SelectSessionViewProps {
    contextSummary: ReactNode;
    onClose: () => void;
    onCreateNew: () => void;
    onSelect: (ids: string | string[]) => void;
    sessionTypeFilter: SessionTypeFilter;
}

function getSessionTypeLabel(sessionType?: 'meal' | 'workout' | null): string {
    if (!sessionType) return 'Session';
    return SESSION_TYPE_CONFIG[sessionType]?.label ?? 'Session';
}

export function SelectSessionView({
    contextSummary,
    onClose,
    onCreateNew,
    onSelect,
    sessionTypeFilter,
}: SelectSessionViewProps) {
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
                    onBack={onClose}
                    title={`Select ${getSessionTypeLabel(sessionTypeFilter).toLowerCase()}`}
                />
            </Box>

            <Box
                p="lg"
                style={{
                    flex: 1,
                    overflow: 'auto',
                }}
            >
                {contextSummary}

                {sessionTypeFilter === 'meal' ? (
                    <MealSelect
                        multiple={false}
                        onCreateNew={onCreateNew}
                        onSelect={onSelect}
                    />
                ) : (
                    <SessionSelect
                        multiple={false}
                        onCreateNew={onCreateNew}
                        onSelect={onSelect}
                        sessionType={sessionTypeFilter}
                    />
                )}
            </Box>
        </>
    );
}
