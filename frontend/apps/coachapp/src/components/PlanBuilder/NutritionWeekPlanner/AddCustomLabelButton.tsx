import {ActionIcon, TextInput, Tooltip} from '@mantine/core';
import {IconPlus} from '@tabler/icons-react';
import {useEffect, useRef, useState} from 'react';

interface AddCustomLabelButtonProps {
    onAdd: (label: string) => void;
}

export function AddCustomLabelButton({onAdd}: AddCustomLabelButtonProps) {
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

    if (isAdding) {
        return (
            <TextInput
                onBlur={() => {
                    if (!labelValue.trim()) {
                        setIsAdding(false);
                    }
                }}
                onChange={(e) => setLabelValue(e.currentTarget.value)}
                onKeyDown={handleKeyDown}
                placeholder="Label name"
                ref={inputRef}
                size="md"
                styles={{
                    input: {
                        fontSize: '14px',
                        height: '40px',
                    },
                }}
                value={labelValue}
            />
        );
    }

    return (
        <Tooltip
            label="Add custom meal label"
            position="right"
        >
            <ActionIcon
                aria-label="Add custom meal label"
                onClick={() => setIsAdding(true)}
                radius="md"
                size="lg"
                style={{
                    minWidth: '48px',
                    minHeight: '48px',
                }}
                variant="light"
            >
                <IconPlus size={20} />
            </ActionIcon>
        </Tooltip>
    );
}
