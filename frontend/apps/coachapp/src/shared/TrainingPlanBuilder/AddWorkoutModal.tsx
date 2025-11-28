import {Button, Modal, Stack, TextInput, Textarea} from '@mantine/core';
import {useState} from 'react';

interface AddWorkoutModalProps {
    opened: boolean;
    onClose: () => void;
    onSubmit: (data: {name: string; notes?: string}) => Promise<void>;
    dayName: string;
}

const AddWorkoutModal = ({opened, onClose, onSubmit, dayName}: AddWorkoutModalProps) => {
    const [name, setName] = useState('');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<null | string>(null);

    const handleSubmit = async () => {
        if (!name.trim()) {
            setError('Workout name is required');
            return;
        }

        setError(null);
        setIsSubmitting(true);

        try {
            await onSubmit({
                name: name.trim(),
                notes: notes.trim() || undefined,
            });
            // Reset form on success
            setName('');
            setNotes('');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setName('');
        setNotes('');
        setError(null);
        onClose();
    };

    return (
        <Modal
            centered
            onClose={handleClose}
            opened={opened}
            radius="lg"
            size="sm"
            title={`Add Workout for ${dayName}`}
        >
            <Stack gap="md">
                <TextInput
                    autoFocus
                    disabled={isSubmitting}
                    error={error}
                    label="Workout Name"
                    onChange={(e) => {
                        setName(e.target.value);
                        if (error) setError(null);
                    }}
                    placeholder="e.g., Upper Body Push"
                    required
                    value={name}
                />

                <Textarea
                    disabled={isSubmitting}
                    label="Notes (optional)"
                    minRows={2}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any additional notes for this workout..."
                    value={notes}
                />

                <Button
                    color="brand"
                    disabled={!name.trim()}
                    fullWidth
                    loading={isSubmitting}
                    onClick={handleSubmit}
                    radius="lg"
                >
                    Create Workout
                </Button>
            </Stack>
        </Modal>
    );
};

export default AddWorkoutModal;
