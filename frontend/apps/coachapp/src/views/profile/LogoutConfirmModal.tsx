import {Button, Group, Modal, Stack, Text, Title} from '@mantine/core';
import {FC} from 'react';

type LogoutConfirmModalProps = {
    onClose: () => void;
    opened: boolean;
    loading: boolean;
    onLogout: () => void;
};

export const LogoutConfirmModal: FC<LogoutConfirmModalProps> = ({onClose, opened, loading, onLogout}) => {
    return (
        <Modal
            centered
            onClose={onClose}
            opened={opened}
            title={
                <Title
                    order={4}
                    size="h5"
                >
                    Confirm logout
                </Title>
            }
        >
            <Stack gap="lg">
                <Text size="sm">Are you sure you want to log out of your account?</Text>
                <Group justify="flex-end">
                    <Button
                        onClick={onClose}
                        variant="subtle"
                    >
                        Cancel
                    </Button>
                    <Button
                        color="red"
                        loading={loading}
                        onClick={onLogout}
                    >
                        Log out
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
};
