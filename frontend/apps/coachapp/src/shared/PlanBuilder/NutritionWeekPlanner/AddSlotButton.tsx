import {Button} from '@mantine/core';
import {IconPlus} from '@tabler/icons-react';

export function AddSlotButton({onClick}: {onClick: () => void}) {
    return (
        <Button
            color="blue"
            fullWidth
            leftSection={<IconPlus size={18} />}
            onClick={onClick}
            radius="lg"
            size="md"
            variant="light"
        >
            Add session
        </Button>
    );
}
