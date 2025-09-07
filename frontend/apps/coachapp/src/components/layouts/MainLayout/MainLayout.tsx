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
    showNavigation: boolean;
    disableTopMargin?: boolean;
}

export function MainLayout({children, showNavigation, disableTopMargin}: MainLayoutProps) {
    const [opened, {close}] = useDisclosure();
    const isMobile = useMediaQuery(`(max-width: 768px)`);
    const isKeyboardVisible = useKeyboardVisible();

    const {handleNavigation, handleLogout} = useNavigationState(isMobile ? close : undefined);

    const navbarStyles = isMobile
        ? undefined
        : {
              width: {base: '100%', md: 280},
              breakpoint: 'sm',
              collapsed: {mobile: !opened, desktop: false},
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
                        onNavigate={handleNavigation}
                        onLogout={handleLogout}
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
                    navItems={navItems}
                    onNavigate={handleNavigation}
                    isVisible={!isKeyboardVisible}
                />
            )}
        </AppShell>
    );
}
