import {Drawer, useDrawersStack} from '@mantine/core';
import React from 'react';

import {Program} from '@/api/programs.ts';

import SessionBuilder from './SessionBuilder';

type RenderProps = {
    onClick: (program: Program) => void;
};

type SessionBuilderWithTriggerProps = {
    children: (props: RenderProps) => React.ReactNode;
};

export function SessionBuilderWithTrigger({children}: SessionBuilderWithTriggerProps) {
    const stack = useDrawersStack(['create-schedule', 'session-form', 'content-select']);

    const onClick = () => {
        stack.open('create-schedule');
    };

    return (
        <>
            {children({onClick})}
            <Drawer
                {...stack.register('create-schedule')}
                withCloseButton={false}
            >
                <SessionBuilder
                    drawerStack={stack}
                    onComplete={() => {}}
                    sessionType={'workout'}
                />
            </Drawer>
        </>
    );
}
