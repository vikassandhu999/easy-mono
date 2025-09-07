import {UnstyledButton, Group, Text, Menu} from '@mantine/core';
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
                    w="100%"
                    p="sm"
                    style={{
                        borderRadius: '8px',
                        transition: 'background-color 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--mantine-color-red-0)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                >
                    <Group gap="sm">
                        <IconLogout
                            size={18}
                            stroke={1.5}
                        />
                        <Text
                            size="sm"
                            fw={400}
                            c="red.6"
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
