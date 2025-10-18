import {Box, Text, Textarea, TextareaProps} from '@mantine/core';

import classes from './CETextArea.module.css';

export interface CETextAreaProps extends TextareaProps {
    description?: React.ReactNode | string;
}

const CETextArea = ({classNames, description, ...props}: CETextAreaProps) => {
    return (
        <Box>
            <Textarea
                {...props}
                classNames={{
                    ...classes,
                    ...classNames,
                }}
            />

            {typeof description === 'string' ? (
                <Text
                    fs="italic"
                    size="xs"
                >
                    {description}
                </Text>
            ) : (
                description
            )}
        </Box>
    );
};

export default CETextArea;
