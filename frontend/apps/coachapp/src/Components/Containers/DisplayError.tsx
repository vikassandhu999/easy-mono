import {AppError} from '@easy/utils';
import {Alert, Button} from '@mantine/core';
import {IconAlertCircle} from '@tabler/icons-react';

interface DisplayErrorProps {
    codesMap: Map<string, string>;
    error?: Error | AppError;
    onRetry?: () => void;
}

export function DisplayError({error, codesMap, onRetry}: DisplayErrorProps) {
    if (!error) return null;

    const errorCode = (error as AppError)?.code;
    const errorMessage = codesMap.get(errorCode || '') || (error as AppError)?.message || 'Unknown error';

    return (
        <Alert
            icon={<IconAlertCircle size={16} />}
            title="Error"
            color="red"
        >
            {errorMessage}

            {onRetry && <Button onClick={onRetry}>Retry</Button>}
        </Alert>
    );
}
