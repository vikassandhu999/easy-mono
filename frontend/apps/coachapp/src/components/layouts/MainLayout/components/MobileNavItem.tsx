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
            aria-current={isActive ? 'page' : undefined}
            aria-label={item.label}
            component="button"
            onClick={() => onNavigate(item.href)}
            p="xs"
            style={{
                background: 'transparent',
                border: 'none',
                color: isActive ? theme.colors.blue[6] : theme.colors.gray[6],
                cursor: 'pointer',
                minWidth: '60px',
                position: 'relative',
                transition: 'color 0.2s ease',
            }}
        >
            <Stack
                align="center"
                gap={2}
            >
                <Icon size={20} />
                <Text
                    fw={isActive ? 600 : 400}
                    size="xs"
                    style={{maxWidth: '60px'}}
                    truncate
                >
                    {item.label}
                </Text>
                {item.badge && (
                    <Badge
                        circle
                        color="red"
                        size="xs"
                        style={{
                            fontSize: '10px',
                            height: '16px',
                            minWidth: '16px',
                            position: 'absolute',
                            right: '8px',
                            top: '4px',
                        }}
                        variant="filled"
                    >
                        {item.badge}
                    </Badge>
                )}
            </Stack>
        </Box>
    );
}
