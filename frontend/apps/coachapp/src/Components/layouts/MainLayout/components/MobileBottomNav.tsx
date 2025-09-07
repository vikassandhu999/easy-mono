import {Box, Group} from '@mantine/core';
import {NavItem} from '../types';
import {MobileNavItem} from './MobileNavItem';
import {useLayoutEffect, useRef} from 'react';

interface MobileBottomNavProps {
    navItems: NavItem[];
    onNavigate: (href: string) => void;
    isVisible: boolean;
}

export function MobileBottomNav({navItems, onNavigate, isVisible}: MobileBottomNavProps) {
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
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: 'white',
                borderTop: '1px solid var(--mantine-color-gray-2)',
                padding: '8px 16px',
                paddingBottom: `calc(var(--ce-size-sm) + env(safe-area-inset-bottom))`,
                transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
                transition: 'transform 0.3s ease-in-out',
                zIndex: 99,
                boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.1)',
            }}
        >
            <Group
                justify="space-around"
                align="center"
                gap={0}
            >
                {navItems.map((item) => (
                    <MobileNavItem
                        key={item.href}
                        item={item}
                        onNavigate={onNavigate}
                    />
                ))}
            </Group>
        </Box>
    );
}
