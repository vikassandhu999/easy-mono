import {Badge, Group, Stack, Text} from '@mantine/core';
import {IconChevronRight} from '@tabler/icons-react';

import styles from './styles.module.css';

type ActionableListItemProps = {
    title: string;
    icon: React.ReactNode;
    counter?: number;
    onClick?: () => void;
    disabled?: boolean;
};

export const ActionableListItem = ({
    title,
    icon,
    counter: badgeCount = 0,
    onClick,
    disabled = false,
}: ActionableListItemProps) => {
    return (
        <button
            className={styles.menuItem}
            disabled={disabled}
            onClick={onClick}
        >
            <Group
                gap="md"
                style={{flex: 1}}
            >
                <div className={styles.menuIcon}>{icon}</div>
                <Text className={styles.menuItemText}>{title}</Text>
                {badgeCount > 0 && (
                    <Badge
                        className={styles.storeBadge}
                        radius="xl"
                        size="sm"
                    >
                        {badgeCount}
                    </Badge>
                )}
            </Group>
            <IconChevronRight
                className={styles.chevron}
                size={16}
            />
        </button>
    );
};

type ActionableListGroupProps = {
    title: string;
    children?: React.ReactNode;
};

export const ActionableListGroup = ({title, children}: ActionableListGroupProps) => {
    return (
        <Stack gap="xs">
            <Text className={styles.sectionTitle}>{title}</Text>
            <div className={styles.menuSection}>{children}</div>
        </Stack>
    );
};
export default ActionableListGroup;
