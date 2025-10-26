import {ActionIcon, Group, Title} from '@mantine/core';
import {ArrowLeftIcon} from '@phosphor-icons/react';

type Props = {
    actions?: React.ReactNode;
    onBack?: () => void;
    showTitle?: boolean;
    title: string;
};

export default function Header({actions, onBack, showTitle = true, title}: Props) {
    return (
        <Group
            align="center"
            gap="sm"
            justify="space-between"
            w="100%"
            wrap="nowrap"
        >
            <Group
                gap="sm"
                style={{flex: 1, minWidth: 0}}
                wrap="nowrap"
            >
                {onBack && (
                    <ActionIcon
                        c="dark"
                        onClick={onBack}
                        radius="xl"
                        size="xl"
                        variant="subtle"
                    >
                        <ArrowLeftIcon size={22} />
                    </ActionIcon>
                )}
                {showTitle && (
                    <Title
                        order={6}
                        style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                        title={title}
                    >
                        {title}
                    </Title>
                )}
            </Group>
            {actions && (
                <Group
                    gap="xs"
                    style={{flexShrink: 0}}
                >
                    {actions}
                </Group>
            )}
        </Group>
    );
}
