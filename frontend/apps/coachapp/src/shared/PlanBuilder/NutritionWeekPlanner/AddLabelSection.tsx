import {Box, Button, Grid, GridCol, Group, Stack, TextInput, useMantineTheme} from '@mantine/core';
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

    const handleCancel = () => {
        setLabelValue('');
        setIsAdding(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
        } else if (e.key === 'Escape') {
            handleCancel();
        }
    };

    const isValidLabel = labelValue.trim().length > 0;

    return (
        <Box
            pb="lg"
            style={{
                borderBottom: `1px solid light-dark(${theme.colors.gray[3]}, ${theme.colors.dark[4]})`,
            }}
        >
            <Grid>
                <GridCol span={{base: 12, md: 4, lg: 3}}>
                    {isAdding ? (
                        <Stack gap="sm">
                            <TextInput
                                aria-label="New label name"
                                onChange={(e) => setLabelValue(e.currentTarget.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Enter label name"
                                ref={inputRef}
                                size="sm"
                                styles={{
                                    input: {
                                        fontSize: '16px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                    },
                                }}
                                value={labelValue}
                            />
                            <Group
                                gap="sm"
                                justify="end"
                                wrap="nowrap"
                            >
                                <Button
                                    aria-label="Cancel adding label"
                                    onClick={handleCancel}
                                    size="sm"
                                    variant="default"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    aria-label="Add new label"
                                    disabled={!isValidLabel}
                                    onClick={handleSubmit}
                                    size="sm"
                                >
                                    Add
                                </Button>
                            </Group>
                        </Stack>
                    ) : (
                        <Button
                            leftSection={<IconPlus size={18} />}
                            onClick={() => setIsAdding(true)}
                            size="sm"
                            variant="subtle"
                        >
                            Add Label
                        </Button>
                    )}
                </GridCol>
                <GridCol span={{base: 12, md: 8, lg: 9}} />
            </Grid>
        </Box>
    );
}
