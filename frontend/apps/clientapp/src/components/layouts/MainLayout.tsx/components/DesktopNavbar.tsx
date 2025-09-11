import {Box, Stack} from '@mantine/core';
import {NavItem} from '../types';
import {UserInfo} from './UserInfo';
import {NavItems} from './NavItems';
import TextLogo from '@/components/TextLogo/TextLogo';

interface DesktopNavbarProps {
    navItems: NavItem[];
    onNavigate: (href: string) => void;
    onLogout? : () => void;
}

export function DesktopNavbar({navItems, onNavigate, onLogout}: DesktopNavbarProps) {

    const handleLogout = () => {
        if (onLogout) {
            onLogout();
        } else {
            console.warn("Logout function not provided");
        }
    };

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

            <Box mt="auto" pt="lg">
                <UserInfo onLogout={handleLogout} />
            </Box>
        </>
    );
}
