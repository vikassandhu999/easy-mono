import {AppShell} from '@mantine/core';
import {useDisclosure, useMediaQuery} from '@mantine/hooks';
import {ReactNode} from 'react';

import {useKeyboardVisible} from '@/hooks/useKeyboardVisible';

import {DesktopNavbar} from './components/DesktopNavbar';
import {MobileBottomNav} from './components/MobileBottomNav';
import {navItems} from './constants';
import {useNavigationState} from './hooks/useNavigationState.ts';

interface MainLayoutProps {
    children: ReactNode;
    disableTopMargin?: boolean;
    showNavigation: boolean;
}

export function MainLayout({children, disableTopMargin, showNavigation}: MainLayoutProps) {
    const [opened, {close}] = useDisclosure();
    const isMobile = useMediaQuery(`(max-width: 998px)`);
    const isKeyboardVisible = useKeyboardVisible();

    const {handleLogout, handleNavigation} = useNavigationState(isMobile ? close : undefined);

    const navbarStyles = isMobile
        ? undefined
        : {
              breakpoint: 'sm',
              collapsed: {desktop: false, mobile: !opened},
              width: {base: '100%', md: 220},
          };
    const showDesktopNavbar = !isMobile;
    const showMobileNavbar = isMobile && showNavigation;

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
                        navItems={navItems}
                        onLogout={handleLogout}
                        onNavigate={handleNavigation}
                    />
                </AppShell.Navbar>
            )}

            <AppShell.Main
                style={{
                    background: 'transparent',
                    marginTop: isMobile || disableTopMargin ? 0 : 'var(--ce-size-xl)',
                }}
            >
                {children}
            </AppShell.Main>

            {showMobileNavbar && (
                <MobileBottomNav
                    isVisible={!isKeyboardVisible}
                    navItems={navItems}
                    onNavigate={handleNavigation}
                />
            )}
        </AppShell>
    );
}
