import {AppError} from '@easy/utils';
import {Alert, Button} from '@mantine/core';
import {IconAlertCircle} from '@tabler/icons-react';

interface DisplayErrorProps {
    codesMap: Map<string, string>;
    error?: AppError | Error;
    onRetry?: () => void;
}

export function DisplayError({codesMap, error, onRetry}: DisplayErrorProps) {
    if (!error) return null;

    const errorCode = (error as AppError)?.code;
    const errorMessage = codesMap.get(errorCode || '') || (error as AppError)?.message || 'Unknown error';

    return (
        <Alert
            color="red"
            icon={<IconAlertCircle size={16} />}
            title="Error"
        >
            {errorMessage}

            {onRetry && <Button onClick={onRetry}>Retry</Button>}
        </Alert>
    );
}
