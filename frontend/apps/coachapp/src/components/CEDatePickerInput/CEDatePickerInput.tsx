import {Box, Text} from '@mantine/core';
import {DatePickerInput, DatePickerInputProps} from '@mantine/dates';

import classes from './CEDatePickerInput.module.css';

export interface CEDatePickerInputProps extends DatePickerInputProps {
    description?: React.ReactNode | string;
}

const CEDatePickerInput = ({classNames, description, ...props}: CEDatePickerInputProps) => {
    return (
        <Box>
            <DatePickerInput
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

export default CEDatePickerInput;
