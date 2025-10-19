import {Box, Text, TextInput, TextInputProps} from '@mantine/core';
import {forwardRef} from 'react';

import classes from './CETextInput.module.css';

export interface CETextInputProps extends TextInputProps {
    description?: React.ReactNode | string;
}

const CETextInput = forwardRef<HTMLInputElement, CETextInputProps>(
    ({classNames, description, label, leftSection, rightSection, ...props}, ref) => {
        return (
            <Box className={classes.wrapper}>
                <TextInput
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

CETextInput.displayName = 'CETextInput';

export default CETextInput;
