import {Button, Group} from '@mantine/core';
import {IconArrowRight} from '@tabler/icons-react';

/**
 * FormButtons - Reusable form submission buttons
 *
 * Renders either:
 * - Single "Create/Save" button (create mode)
 * - Dual buttons: "Save & Close" + "Save" (edit mode)
 */

export interface FormButtonsProps {
    isSubmitting?: boolean;
    onSave?: () => void;
    onSaveAndClose?: () => void;
    showSaveOptions?: boolean;
    submitLabel?: string;
}

export function FormButtons({
    isSubmitting = false,
    onSave,
    onSaveAndClose,
    showSaveOptions = false,
    submitLabel = 'Create',
}: FormButtonsProps) {
    if (showSaveOptions) {
        return (
            <Group
                gap="sm"
                grow
            >
                <Button
                    loading={isSubmitting}
                    onClick={onSave}
                    radius="xl"
                    size="lg"
                    type="button"
                >
                    Save
                </Button>
                <Button
                    loading={isSubmitting}
                    onClick={onSaveAndClose}
                    radius="xl"
                    size="lg"
                    type="button"
                    variant="outline"
                >
                    Save & close
                </Button>
            </Group>
        );
    }

    return (
        <Button
            fullWidth
            loading={isSubmitting}
            radius="xl"
            rightSection={<IconArrowRight size={20} />}
            size="lg"
            type="submit"
        >
            {submitLabel}
        </Button>
    );
}
