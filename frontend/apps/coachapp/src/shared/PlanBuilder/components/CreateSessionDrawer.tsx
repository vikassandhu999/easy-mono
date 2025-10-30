import React from 'react';

import HeadingContainer from '@/shared/containers/HeaderContainer';
import PaddingContainer from '@/shared/containers/PaddingContainer';
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
        <React.Fragment>
            <HeadingContainer>
                <Header
                    onBack={onBack}
                    title={`Create ${getSessionTypeLabel(sessionTypeFilter).toLowerCase()}`}
                />
            </HeadingContainer>

            <PaddingContainer>
                <SessionBuilder
                    onComplete={onComplete}
                    sessionType={(sessionTypeFilter as any) ?? 'workout'}
                />
            </PaddingContainer>
        </React.Fragment>
    );
}
