import {Group, ActionIcon, Title} from '@mantine/core';
import {ArrowLeftIcon} from '@phosphor-icons/react';

type Props = {
    showTitle?: boolean;
    title: string;
    onBack?: () => void;
    actions?: React.ReactNode;
};

export default function Header({title, showTitle = true, onBack, actions}: Props) {
    return (
        <Group
            gap="sm"
            style={{width: '100%'}}
            justify={'space-between'}
            align="center"
            wrap="nowrap"
        >
            <Group
                style={{minWidth: 0, flex: 1}}
                wrap={'nowrap'}
                gap={'sm'}
            >
                {onBack && (
                    <ActionIcon
                        size={'xl'}
                        variant={'subtle'}
                        onClick={onBack}
                        c={'dark'}
                        style={{borderRadius: 9999}}
                    >
                        <ArrowLeftIcon size={24} />
                    </ActionIcon>
                )}
                {showTitle && <Title order={6}>{title}</Title>}
            </Group>
            {actions && (
                <Group
                    gap={'xs'}
                    style={{flexShrink: 0}}
                >
                    {actions}
                </Group>
            )}
        </Group>
    );
}
