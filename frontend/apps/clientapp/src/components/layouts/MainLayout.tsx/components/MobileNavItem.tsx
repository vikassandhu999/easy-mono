import {Badge, Box, Stack, Text, useMantineTheme} from '@mantine/core';
import {useLocation} from 'react-router';
import {NavItem} from '../types';

interface MobileNavItemProps {
    item: NavItem;
    onNavigate: (href: string) => void;
}

export function MobileNavItem({item, onNavigate}: MobileNavItemProps) {
    const location = useLocation();
    const theme = useMantineTheme();
    const Icon = item.icon;

    const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));

    return (
        <Box
            component="button"
            onClick={() => onNavigate(item.href)}
            p="xs"
            style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                position: 'relative',
                minWidth: '60px',
                color: isActive ? theme.colors.blue[6] : theme.colors.gray[6],
                transition: 'color 0.2s ease',
            }}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
        >
            <Stack
                align="center"
                gap={2}
            >
                <Icon size={20} />
                <Text
                    size="xs"
                    fw={isActive ? 600 : 400}
                    truncate
                    style={{maxWidth: '60px'}}
                >
                    {item.label}
                </Text>
                {item.badge && (
                    <Badge
                        size="xs"
                        variant="filled"
                        color="red"
                        circle
                        style={{
                            position: 'absolute',
                            top: '4px',
                            right: '8px',
                            minWidth: '16px',
                            height: '16px',
                            fontSize: '10px',
                        }}
                    >
                        {item.badge}
                    </Badge>
                )}
            </Stack>
        </Box>
    );
}
