import {Group, Burger, ActionIcon, Avatar, rem} from '@mantine/core';
import {IconSearch, IconBell} from '@tabler/icons-react';

interface DesktopHeaderProps {
    opened: boolean;
    onToggle: () => void;
}

export function DesktopHeader({opened, onToggle}: DesktopHeaderProps) {
    return (
        <Group
            h="100%"
            px="md"
            justify="space-between"
        >
            <Group>
                <Burger
                    opened={opened}
                    onClick={onToggle}
                    hiddenFrom="sm"
                    size="md"
                    style={{
                        minWidth: rem(44),
                        minHeight: rem(44),
                    }}
                    aria-label="Toggle navigation menu"
                />
            </Group>

            <Group gap="sm">
                <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="lg"
                    radius="md"
                    style={{
                        minWidth: rem(44),
                        minHeight: rem(44),
                    }}
                    aria-label="Search"
                >
                    <IconSearch size={18} />
                </ActionIcon>
                <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="lg"
                    radius="md"
                    style={{
                        minWidth: rem(44),
                        minHeight: rem(44),
                    }}
                    aria-label="Notifications"
                >
                    <IconBell size={18} />
                </ActionIcon>
                <Avatar
                    size="sm"
                    radius="xl"
                    alt="User"
                />
            </Group>
        </Group>
    );
}
