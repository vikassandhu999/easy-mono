import {Box, Text, Textarea, TextareaProps} from '@mantine/core';
import {forwardRef} from 'react';

import classes from './CETextArea.module.css';

export interface CETextAreaProps extends TextareaProps {
    description?: React.ReactNode | string;
}

const CETextArea = forwardRef<HTMLTextAreaElement, CETextAreaProps>(
    ({classNames, description, label, leftSection, rightSection, ...props}, ref) => {
        return (
            <Box className={classes.wrapper}>
                <Textarea
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

CETextArea.displayName = 'CETextArea';

export default CETextArea;
