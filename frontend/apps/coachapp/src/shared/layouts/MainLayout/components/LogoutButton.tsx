import {Group, Menu, Text, UnstyledButton} from '@mantine/core';
import {IconLogout} from '@tabler/icons-react';

interface LogoutButtonProps {
  onLogout: () => void;
}

export function LogoutButton({onLogout}: LogoutButtonProps) {
  return (
    <Menu>
      <Menu.Target>
        <UnstyledButton
          onClick={onLogout}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--mantine-color-red-0)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          p="sm"
          style={{
            borderRadius: '8px',
            transition: 'background-color 0.2s ease',
          }}
          w="100%"
        >
          <Group gap="sm">
            <IconLogout
              size={18}
              stroke={1.5}
            />
            <Text
              c="red.6"
              fw={400}
              size="sm"
            >
              Logout
            </Text>
          </Group>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item>Logout</Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
