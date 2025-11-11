import {AppShell} from '@mantine/core';
import {useDisclosure, useMediaQuery} from '@mantine/hooks';
import {ReactNode, useMemo} from 'react';
import {useKeyboardVisible} from '@/hooks/useKeyboardVisible';
import {DesktopNavbar} from './components/DesktopNavbar';
import {MobileBottomNav} from './components/MobileBottomNav';
import {navItems} from './constants';
import {useNavigationState} from './hooks/useNavigationState';
import { useHandleLogout } from '@/hooks/useLogout';

interface MainLayoutProps {
    children: ReactNode;
    showNavigation: boolean;
    disableTopMargin?: boolean;
}

export function MainLayout({children, showNavigation, disableTopMargin}: MainLayoutProps) {
    const [opened, {close}] = useDisclosure();
    const isMobile = useMediaQuery(`(max-width: 768px)`);
    const isKeyboardVisible = useKeyboardVisible();

    const {handleNavigation} = useNavigationState(isMobile ? close : undefined);

    const logout = useHandleLogout();

    const navbarStyles = isMobile
        ? undefined
        : {
              width: {base: '100%', md: 280},
              breakpoint: 'sm',
              collapsed: {mobile: !opened, desktop: false},
          };
    const showDesktopNavbar = !isMobile;
    const showMobileNavbar = isMobile && showNavigation;

    const desktopNavItems = useMemo(
        () =>
            navItems.filter(
                (item) =>
                    !item.screens ||
                    item.screens.includes('lg') ||item.screens.includes('all')
            ),
        []
    );

    const mobileNavItems = useMemo(
        () =>
            navItems.filter(
                (item) =>
                    !item.screens ||
                    item.screens.includes('sm') || item.screens.includes('all')
            ),
        []
    );

    return (
        <AppShell
            navbar={navbarStyles}
            padding={0}
        >
            {showDesktopNavbar && (
                <AppShell.Navbar
                    p="md"
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%',
                    }}
                >
                    <DesktopNavbar
                        navItems={desktopNavItems}
                        onNavigate={handleNavigation}
                        onLogout={logout}
                    />
                </AppShell.Navbar>
            )}

            <AppShell.Main
                style={{
                    marginTop: isMobile || disableTopMargin ? 0 : 'var(--ce-size-xl)',
                    background: 'transparent',
                }}
            >
                {children}
            </AppShell.Main>

            {showMobileNavbar && (
                <MobileBottomNav
                    navItems={mobileNavItems}
                    onNavigate={handleNavigation}
                    isVisible={!isKeyboardVisible}
                />
            )}
        </AppShell>
    );
}
