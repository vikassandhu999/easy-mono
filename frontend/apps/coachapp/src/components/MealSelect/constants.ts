import {IconBarbell, IconCoffee, IconGrillFork, IconMoon, IconTreadmill} from '@tabler/icons-react';
import React from 'react';

import {Session} from '@/api/sessions';

export const getMealIcon = (session: Session): React.ComponentType<any> => {
    const text = `${session.name} ${session.description || ''}`.toLowerCase();

    if (text.includes('breakfast')) return IconCoffee;
    if (text.includes('lunch')) return IconGrillFork;
    if (text.includes('dinner')) return IconMoon;
    if (text.includes('snack')) return IconCoffee;
    if (text.includes('preworkout') || text.includes('pre-workout')) return IconTreadmill;
    if (text.includes('postworkout') || text.includes('post-workout')) return IconBarbell;

    return IconGrillFork; // default
};

export const getSessionColor = (sessionId: string): string => {
    const colors = [
        'red',
        'pink',
        'grape',
        'violet',
        'indigo',
        'blue',
        'cyan',
        'teal',
        'green',
        'lime',
        'yellow',
        'orange',
    ];

    let hash = 0;
    for (let i = 0; i < sessionId.length; i++) {
        hash = sessionId.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
};
