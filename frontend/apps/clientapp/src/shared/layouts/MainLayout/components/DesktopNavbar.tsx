import {Box, Stack} from '@mantine/core';

import TextLogo from '@/shared/TextLogo/TextLogo';

import {NavItem} from '../types';
import {NavItems} from './NavItems';

interface DesktopNavbarProps {
    navItems: NavItem[];
    onLogout: () => void;
    onNavigate: (href: string) => void;
}

export function DesktopNavbar({navItems, onNavigate}: DesktopNavbarProps) {
    return (
        <>
            <Box mb={'lg'}>
                <TextLogo size={'md'} />
            </Box>

            <Stack
                flex={1}
                gap={0}
            >
                <NavItems
                    items={navItems}
                    onNavigate={onNavigate}
                />
            </Stack>
        </>
    );
}
