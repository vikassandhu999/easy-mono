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
      <Box
        mx={'lg'}
        my={'xl'}
        pb={'xl'}
        style={{
          borderBottom: '1px solid var(--ce-stroke-weak)',
        }}
      >
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
