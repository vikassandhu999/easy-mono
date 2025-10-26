import {ActionIcon, Avatar, Burger, Group, rem} from '@mantine/core';
import {IconBell, IconSearch} from '@tabler/icons-react';

interface DesktopHeaderProps {
    onToggle: () => void;
    opened: boolean;
}

export function DesktopHeader({onToggle, opened}: DesktopHeaderProps) {
    return (
        <Group
            h="100%"
            justify="space-between"
            px="md"
        >
            <Group>
                <Burger
                    aria-label="Toggle navigation menu"
                    hiddenFrom="sm"
                    onClick={onToggle}
                    opened={opened}
                    size="md"
                    style={{
                        minHeight: rem(44),
                        minWidth: rem(44),
                    }}
                />
            </Group>

            <Group gap="sm">
                <ActionIcon
                    aria-label="Search"
                    color="gray"
                    radius="xl"
                    size="lg"
                    style={{
                        minHeight: rem(44),
                        minWidth: rem(44),
                    }}
                    variant="subtle"
                >
                    <IconSearch size={18} />
                </ActionIcon>
                <ActionIcon
                    aria-label="Notifications"
                    color="gray"
                    radius="xl"
                    size="lg"
                    style={{
                        minHeight: rem(44),
                        minWidth: rem(44),
                    }}
                    variant="subtle"
                >
                    <IconBell size={18} />
                </ActionIcon>
                <Avatar
                    alt="User"
                    radius="xl"
                    size="sm"
                />
            </Group>
        </Group>
    );
}
