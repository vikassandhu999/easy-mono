import { IconSelector } from '@tabler/icons-react';
import { Avatar, Group, Text, UnstyledButton, Button } from '@mantine/core';
import classes from './styles.module.css';

type SpaceButtonProps = {
    businessName?: string;
    businessAvatar?: string;
    coachName?: string;
    onSwitchClick?: () => void;
}

export default function SpaceButton({ 
    businessName, 
    businessAvatar, 
    coachName,
    onSwitchClick 
}: SpaceButtonProps) {
    return (
        <UnstyledButton className={classes.user}>
            <Group>
                <Avatar
                    src={businessAvatar}
                    radius="xl"
                >
                    {businessName?.substring(0, 2).toUpperCase()}
                </Avatar>
                <div style={{ flex: 1 }}>
                    <Text size="sm" fw={500}>
                        {businessName || 'Select a Space'}
                    </Text>

                    <Text c="dimmed" size="xs">
                        {coachName ? `Coach: ${coachName}` : 'No coach selected'}
                    </Text>
                </div>

                <Button 
                    variant="light" 
                    rightSection={<IconSelector size={12} />} 
                    radius="lg" 
                    color="red" 
                    size={"compact-sm"}
                    onClick={onSwitchClick}
                >
                    Switch Space
                </Button>
            </Group>
        </UnstyledButton>
    );
}