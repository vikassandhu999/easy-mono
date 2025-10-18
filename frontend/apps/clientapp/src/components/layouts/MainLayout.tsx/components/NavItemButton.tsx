import {Badge, Box, Group, useMantineTheme} from '@mantine/core';
import {useLocation} from 'react-router';

import {NavItem} from '../types';

interface NavItemButtonProps {
    item: NavItem;
    onNavigate: (href: string) => void;
}

export function NavItemButton({item, onNavigate}: NavItemButtonProps) {
    const location = useLocation();
    const theme = useMantineTheme();
    const Icon = item.icon;

    const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));

    return (
        <Box
            component="button"
            onClick={() => onNavigate(item.href)}
            onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isActive ? theme.colors.blue[0] : theme.colors.gray[0];
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = isActive ? theme.colors.blue[0] : 'transparent';
            }}
            p="sm"
            style={{
                border: 'none',
                background: isActive ? theme.colors.blue[0] : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                width: '100%',
                color: isActive ? theme.colors.blue[6] : theme.colors.gray[7],
                fontWeight: isActive ? 600 : 400,
                fontSize: 'var(--callout-font-size)',
                lineHeight: 'var(--callout-line-height)',
                padding: 'var(--callout-offset)',
                paddingInline: 'var(--ce-size-md)',
                borderRadius: 'var(--callout-offset)',
                minHeight: '50px',
            }}
        >
            <Group
                align="center"
                gap="xs"
                justify="space-between"
            >
                <Group
                    align="center"
                    gap="sm"
                >
                    <Icon size={20} />
                    <span>{item.label}</span>
                </Group>
                {item.badge && (
                    <Badge
                        color={isActive ? 'green' : 'gray'}
                        size="xs"
                        variant="filled"
                    >
                        {item.badge}
                    </Badge>
                )}
            </Group>
        </Box>
    );
}
