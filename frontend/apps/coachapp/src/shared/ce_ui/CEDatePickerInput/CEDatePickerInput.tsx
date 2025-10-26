import {Box, Text} from '@mantine/core';
import {DatePickerInput, DatePickerInputProps} from '@mantine/dates';
import {forwardRef} from 'react';

import classes from './CEDatePickerInput.module.css';

export interface CEDatePickerInputProps extends DatePickerInputProps {
    description?: React.ReactNode | string;
}

const CEDatePickerInput = forwardRef<HTMLButtonElement, CEDatePickerInputProps>(
    ({classNames, description, label, leftSection, rightSection, ...props}, ref) => {
        return (
            <Box className={classes.wrapper}>
                <DatePickerInput
                    ref={ref}
                    {...props}
                    classNames={{
                        root: classes.root,
                        wrapper: classes.inputWrapper,
                        input: classes.input,
                        label: classes.label,
                        section: classes.section,
                        ...classNames,
                    }}
                    label={label}
                    leftSection={leftSection}
                    rightSection={rightSection}
                />

                {description && (
                    <Box
                        className={classes.descriptionWrapper}
                        mt="xs"
                    >
                        {typeof description === 'string' ? (
                            <Text
                                c="dimmed"
                                className={classes.description}
                                size="xs"
                            >
                                {description}
                            </Text>
                        ) : (
                            description
                        )}
                    </Box>
                )}
            </Box>
        );
    },
);

CEDatePickerInput.displayName = 'CEDatePickerInput';

export default CEDatePickerInput;
