import {Button, Group} from '@mantine/core';
import {ReactNode} from 'react';

import AutoDrawer from '@/shared/AutoDrawer/AutoDrawer';
import APIErrorParser from '@/utils/error_parser';
import {notifyError, notifySuccess} from '@/utils/notification';

export interface FormHandle {
    submit: () => Promise<void>;
}

type DrawerFormWrapperProps<T extends FormHandle> = {
    title: string;
    onClose: () => void;
    formComponent: ReactNode;
    formRef: React.RefObject<T>;
    onSubmit: (values: any) => Promise<void>;
    isLoading?: boolean;
    successMessage?: string;
    saveButtonText?: string;
    showSaveAndClose?: boolean;
    fullScreen?: boolean;
    actions?: ReactNode;
};

export function DrawerFormWrapper<T extends FormHandle>({
    title,
    onClose,
    formComponent,
    formRef,
    isLoading = false,
    successMessage = 'Saved successfully',
    saveButtonText = 'Save',
    showSaveAndClose = false,
    fullScreen = false,
    actions,
}: DrawerFormWrapperProps<T>) {
    const handleSubmit = async (shouldClose = false) => {
        try {
            await formRef.current?.submit();
            notifySuccess(successMessage);
            if (shouldClose) {
                onClose();
            }
        } catch (error) {
            const err_message = new APIErrorParser(error).humanize();
            notifyError(err_message);
        }
    };

    const defaultActions = (
        <Group
            justify={showSaveAndClose ? 'space-between' : 'flex-end'}
            w="100%"
        >
            <Button
                color="green"
                fullWidth={!showSaveAndClose}
                loading={isLoading}
                onClick={() => handleSubmit(false)}
                radius="xl"
                size="sm"
                variant="light"
            >
                {saveButtonText}
            </Button>
            {showSaveAndClose && (
                <Button
                    color="cyan"
                    loading={isLoading}
                    onClick={() => handleSubmit(true)}
                    radius="xl"
                    size="sm"
                    variant="light"
                >
                    Save and Close
                </Button>
            )}
        </Group>
    );

    return (
        <AutoDrawer
            actions={actions || defaultActions}
            content={formComponent}
            fullScreen={fullScreen}
            onClose={onClose}
            title={title}
        />
    );
}

export default DrawerFormWrapper;
