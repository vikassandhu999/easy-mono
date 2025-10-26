import {Box, Group} from '@mantine/core';
import {useLayoutEffect, useRef} from 'react';

import {NavItem} from '../types';
import {MobileNavItem} from './MobileNavItem';

interface MobileBottomNavProps {
    isVisible: boolean;
    navItems: NavItem[];
    onNavigate: (href: string) => void;
}

export function MobileBottomNav({isVisible, navItems, onNavigate}: MobileBottomNavProps) {
    const ref = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (ref.current) {
            const bottom = ref.current.getBoundingClientRect().bottom;
            document.body.style.setProperty('--ce-appbar-height', `calc(${window.innerHeight - bottom}px)`);
        }

        return () => {
            document.body.style.removeProperty('--ce-appbar-height');
        };
    }, []);

    return (
        <Box
            ref={ref}
            style={{
                backgroundColor: 'white',
                borderTop: '1px solid var(--mantine-color-gray-2)',
                bottom: 0,
                boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.1)',
                left: 0,
                padding: '8px 16px',
                paddingBottom: `calc(var(--ce-size-sm) + env(safe-area-inset-bottom))`,
                position: 'fixed',
                right: 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
                transition: 'transform 0.3s ease-in-out',
                zIndex: 99,
            }}
        >
            <Group
                align="center"
                gap={0}
                justify="space-around"
            >
                {navItems.map((item) => (
                    <MobileNavItem
                        item={item}
                        key={item.href}
                        onNavigate={onNavigate}
                    />
                ))}
            </Group>
        </Box>
    );
}
