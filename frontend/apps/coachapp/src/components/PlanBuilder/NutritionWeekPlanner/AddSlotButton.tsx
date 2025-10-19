import {Button} from '@mantine/core';
import {IconPlus} from '@tabler/icons-react';

export function AddSlotButton({onClick}: {onClick: () => void}) {
    return (
        <Button
            color="blue"
            fullWidth
            leftSection={<IconPlus size={16} />}
            onClick={onClick}
            radius="md"
            size="md"
            styles={{
                root: {
                    backgroundColor: 'transparent',
                    border: '1.5px dashed rgba(0, 0, 0, 0.20)',
                    color: 'rgba(0, 0, 0, 0.60)',
                    minHeight: '44px',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                        backgroundColor: 'rgba(47, 158, 255, 0.08)',
                        borderColor: 'var(--mantine-color-brand-5)',
                        color: 'var(--mantine-color-brand-7)',
                    },
                },
            }}
            variant="default"
        >
            Add session
        </Button>
    );
}
