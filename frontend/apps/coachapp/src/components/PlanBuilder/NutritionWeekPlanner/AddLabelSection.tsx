import {Box, Grid, GridCol, Group, Text, TextInput, useMantineTheme} from '@mantine/core';
import {IconPlus} from '@tabler/icons-react';
import {useEffect, useRef, useState} from 'react';

type AddLabelSectionProps = {
    onAdd: (label: string) => void;
};

export function AddLabelSection({onAdd}: AddLabelSectionProps) {
    const theme = useMantineTheme();
    const [isAdding, setIsAdding] = useState(false);
    const [labelValue, setLabelValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isAdding && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isAdding]);

    const handleSubmit = () => {
        const trimmed = labelValue.trim();
        if (trimmed) {
            onAdd(trimmed);
            setLabelValue('');
            setIsAdding(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
        } else if (e.key === 'Escape') {
            setLabelValue('');
            setIsAdding(false);
        }
    };

    const handleBlur = () => {
        if (!labelValue.trim()) {
            setIsAdding(false);
        }
    };

    return (
        <Box
            pb="md"
            style={{
                borderBottom: `1px solid ${theme.colors.gray[3]}`,
            }}
        >
            <Grid>
                <GridCol span={{base: 12, md: 4, lg: 2}}>
                    {isAdding ? (
                        <TextInput
                            onBlur={handleBlur}
                            onChange={(e) => setLabelValue(e.currentTarget.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Label name"
                            ref={inputRef}
                            size="sm"
                            styles={{
                                input: {
                                    fontSize: '14px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                },
                            }}
                            value={labelValue}
                        />
                    ) : (
                        <Group
                            gap="xs"
                            onClick={() => setIsAdding(true)}
                            style={{
                                cursor: 'pointer',
                                transition: 'opacity 0.15s ease',
                                '&:hover': {
                                    opacity: 0.7,
                                },
                            }}
                            wrap="nowrap"
                        >
                            <IconPlus
                                color={theme.colors.gray[6]}
                                size={16}
                            />
                            <Text
                                c="gray.7"
                                fw={600}
                                size="sm"
                                style={{
                                    lineHeight: 1.5,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                }}
                            >
                                Add label
                            </Text>
                        </Group>
                    )}
                </GridCol>
                <GridCol span={{base: 12, md: 8, lg: 10}} />
            </Grid>
        </Box>
    );
}
