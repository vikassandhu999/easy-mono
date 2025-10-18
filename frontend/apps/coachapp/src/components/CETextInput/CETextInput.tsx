import {Box, Text, TextInput, TextInputProps} from '@mantine/core';

import classes from './CETextInput.module.css';

export interface CETextInputProps extends TextInputProps {
    description?: React.ReactNode | string;
}

const CETextInput = ({classNames, description, ...props}: CETextInputProps) => {
    return (
        <Box>
            <TextInput
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

export default CETextInput;
