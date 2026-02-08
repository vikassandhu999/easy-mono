import {useMediaQuery} from '@mantine/hooks';
import {ReactNode} from 'react';

import {useKeyboardVisible} from '@/hooks/useKeyboardVisible';
import TextLogo from '@/shared/TextLogo/TextLogo.tsx';

import {MobileBottomNav} from './components/MobileBottomNav';
import {NavItems} from './components/NavItems.tsx';
import {navItems} from './constants';
import {useNavigationState} from './hooks/useNavigationState.ts';

interface MainLayoutProps {
  children: ReactNode;
  disableTopMargin?: boolean;
  showNavigation: boolean;
}

export function MainLayout({children, showNavigation}: MainLayoutProps) {
  const isMobile = useMediaQuery(`(max-width: 998px)`);
  const isKeyboardVisible = useKeyboardVisible();

  const {handleNavigation} = useNavigationState();

  const showDesktopNavbar = !isMobile;
  const showMobileNavbar = isMobile && showNavigation;

  return (
    <section className={'flex-1 flex min-h-screen'}>
      {showDesktopNavbar && (
        <nav className={'h-screen bg-white shadow border-r border-gray-200 min-w-55 sticky top-0 '}>
          <div className="px-6 pt-6 pb-2 mb-4 border-b border-gray-200">
            <TextLogo size={'md'} />
          </div>
          <div className={'flex flex-col flex-1'}>
            <NavItems
              items={navItems}
              onNavigate={handleNavigation}
            />
          </div>
        </nav>
      )}

      <main className={'flex-1'}>{children}</main>

      {showMobileNavbar && (
        <MobileBottomNav
          isVisible={!isKeyboardVisible}
          navItems={navItems}
          onNavigate={handleNavigation}
        />
      )}
    </section>
  );
}
