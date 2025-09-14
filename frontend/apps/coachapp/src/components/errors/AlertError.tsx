import {Notification} from '@mantine/core';

type AlertErrorProps = {
    description?: string;
    message: string;
};

const AlertError = ({message, description}: AlertErrorProps) => {
    return (
        <Notification
            color="red"
            title={message}
            withCloseButton={false}
        >
            {description && <p>{description}</p>}
        </Notification>
    );
};

export default AlertError;
