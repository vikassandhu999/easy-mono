import {Button, Group} from '@mantine/core';

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
            <Group justify="flex-start">
                <Button
                    loading={isSubmitting}
                    onClick={onSaveAndClose}
                    radius="xl"
                    size="lg"
                    type="button"
                >
                    Save and close
                </Button>
                <Button
                    color="gray"
                    loading={isSubmitting}
                    onClick={onSave}
                    radius="xl"
                    size="lg"
                    type="button"
                    variant="light"
                >
                    Save
                </Button>
            </Group>
        );
    }

    return (
        <Button
            loading={isSubmitting}
            radius="xl"
            size="lg"
            type="submit"
        >
            {submitLabel}
        </Button>
    );
}
