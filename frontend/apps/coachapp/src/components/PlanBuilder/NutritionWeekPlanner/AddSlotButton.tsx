import {Button} from '@mantine/core';
import {IconPlus} from '@tabler/icons-react';

export function AddSlotButton({onClick}: {onClick: () => void}) {
    return (
        <Button
            color="blue"
            fullWidth
            leftSection={<IconPlus size={14} />}
            onClick={onClick}
            radius="xl"
            size="xs"
            styles={{
                root: {
                    backgroundColor: 'transparent',
                    border: '1.5px dashed var(--mantine-color-gray-3)',
                    color: 'var(--mantine-color-gray-6)',
                    minHeight: '32px',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                        backgroundColor: 'var(--mantine-color-blue-0)',
                        borderColor: 'var(--mantine-color-blue-4)',
                        color: 'var(--mantine-color-blue-6)',
                    },
                },
                label: {
                    fontSize: '12px',
                    fontWeight: 500,
                },
            }}
            variant="default"
        >
            Add
        </Button>
    );
}
