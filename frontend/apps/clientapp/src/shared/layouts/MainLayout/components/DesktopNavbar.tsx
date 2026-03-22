import {Avatar, Box, Group, Stack, Text} from '@mantine/core';

import {useGetBusinessQuery} from '@/services/business';

import {NavItem} from '../types';
import {NavItems} from './NavItems';

interface DesktopNavbarProps {
  navItems: NavItem[];
  onLogout: () => void;
  onNavigate: (href: string) => void;
}

export function DesktopNavbar({navItems, onNavigate}: DesktopNavbarProps) {
  const {data, isLoading} = useGetBusinessQuery();
  const business = data?.data;

  return (
    <>
      <Box mb={'lg'}>
        <Group
          align="center"
          gap="sm"
          wrap="nowrap"
        >
          {business?.logo_url && (
            <Avatar
              alt={business?.name || 'Business'}
              radius="sm"
              size="md"
              src={business.logo_url}
            />
          )}

          <Stack
            gap={0}
            style={{minWidth: 0}}
          >
            <Text
              fw={700}
              size="xl"
              truncate
            >
              {isLoading ? 'Loading…' : business?.name || '—'}
            </Text>
          </Stack>
        </Group>
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
