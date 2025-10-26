import {ActionIcon, Box, Button, Grid, GridCol, Group, Stack, Text, TextInput, useMantineTheme} from '@mantine/core';
import {useClickOutside} from '@mantine/hooks';
import {modals} from '@mantine/modals';
import {IconPencil, IconTrash} from '@tabler/icons-react';
import {useEffect, useRef, useState} from 'react';

import {
    PlanSession,
    useDeletePlanSessionsByLabelMutation,
    useUpdatePlanSessionsLabelMutation,
} from '@/store/services/plan_sessions';

import {AddSlotButton} from './AddSlotButton';
import SessionSlotCard from './SessionSlotCard';

type EditableLabelSectionProps = {
    canDelete?: boolean;
    canEdit?: boolean;
    heading: string;
    onAdd: () => void;
    onAssignSession?: (planSessionId: string) => void;
    onDelete?: () => void;
    onDeleteSession: (planSessionId: string) => void;
    onEdit?: (newLabel: string) => void;
    onEditSession?: (planSessionId: string) => void;
    planId: string;
    planSessions: PlanSession[];
};

export function EditableLabelSection({
    canDelete = false,
    canEdit = false,
    heading,
    onAdd,
    onAssignSession,
    onDelete,
    onDeleteSession,
    onEdit,
    onEditSession,
    planId,
    planSessions,
}: EditableLabelSectionProps) {
    const theme = useMantineTheme();
    const hasSessions = planSessions.length > 0;
    const [isEditing, setIsEditing] = useState(false);
    const [labelValue, setLabelValue] = useState(heading);
    const [isHovered, setIsHovered] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const [deletePlanSessionsByLabel, {isLoading: isDeleting}] = useDeletePlanSessionsByLabelMutation();
    const [updatePlanSessionsLabel, {isLoading: isUpdating}] = useUpdatePlanSessionsLabelMutation();

    const handleClickOutside = () => {
        if (!isEditing) return;

        const trimmed = labelValue.trim();
        const hasChanges = trimmed && trimmed !== heading;

        if (hasChanges) {
            // Show confirmation modal for unsaved changes
            modals.openConfirmModal({
                cancelProps: {
                    fullWidth: true,
                    radius: 'md',
                    size: 'lg',
                    variant: 'default',
                },
                centered: true,
                children: <Text size="md">You have unsaved changes to the label name. Do you want to save them?</Text>,
                confirmProps: {
                    fullWidth: true,
                    radius: 'md',
                    size: 'lg',
                },
                id: 'unsaved-label-modal',
                labels: {
                    cancel: 'Discard',
                    confirm: 'Save changes',
                },
                onCancel: () => {
                    setIsEditing(false);
                    setLabelValue(heading);
                    modals.close('unsaved-label-modal');
                },
                onConfirm: async () => {
                    await handleSubmitEdit();
                    modals.close('unsaved-label-modal');
                },
                title: <Text fw={700}>Unsaved changes</Text>,
            });
        } else {
            // No changes, just cancel
            handleCancelEdit();
        }
    };

    const editContainerRef = useClickOutside(handleClickOutside);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleSubmitEdit = async () => {
        const trimmed = labelValue.trim();
        if (!trimmed) {
            handleCancelEdit();
            return;
        }

        if (trimmed === heading) {
            setIsEditing(false);
            return;
        }

        try {
            // Call the API to update the label for all sessions with the old label
            await updatePlanSessionsLabel({
                planId,
                oldLabel: heading.toLowerCase(),
                newLabel: trimmed,
            }).unwrap();

            setIsEditing(false);

            // Call the parent callback after successful update
            if (onEdit) {
                onEdit(trimmed);
            }
        } catch (error) {
            console.error('Failed to update label:', error);
            setIsEditing(false);
            setLabelValue(heading);
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setLabelValue(heading);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmitEdit();
        } else if (e.key === 'Escape') {
            handleCancelEdit();
        }
    };

    const handleDeleteClick = async () => {
        if (!canDelete) return;

        const sessionCount = planSessions.length;
        const message =
            sessionCount > 0
                ? `Delete the ${heading} label? ${sessionCount} ${sessionCount === 1 ? 'session' : 'sessions'} in this section will become unassigned.`
                : `Delete the ${heading} label?`;

        modals.openConfirmModal({
            cancelProps: {
                fullWidth: true,
                radius: 'md',
                size: 'lg',
                variant: 'default',
            },
            centered: true,
            children: <Text size="md">{message}</Text>,
            confirmProps: {
                color: 'red',
                fullWidth: true,
                loading: isDeleting,
                radius: 'md',
                size: 'lg',
            },
            id: 'delete-label-modal',
            labels: {
                cancel: 'Cancel',
                confirm: 'Delete label',
            },
            onCancel: () => modals.close('delete-label-modal'),
            onConfirm: async () => {
                try {
                    await deletePlanSessionsByLabel({
                        label: heading,
                        planId,
                    }).unwrap();

                    modals.close('delete-label-modal');

                    // Call the parent onDelete callback if provided
                    if (onDelete) {
                        onDelete();
                    }
                } catch (error) {
                    console.error('Failed to delete sessions by label:', error);
                    modals.close('delete-label-modal');
                }
            },
            title: <Text fw={700}>Delete label</Text>,
        });
    };

    return (
        <Box
            pb="lg"
            style={{
                borderBottom: `1px solid light-dark(${theme.colors.gray[3]}, ${theme.colors.dark[4]})`,
            }}
        >
            <Grid>
                <GridCol
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    span={{base: 12, md: 4, lg: 3}}
                >
                    {isEditing ? (
                        <Stack
                            gap="sm"
                            ref={editContainerRef}
                        >
                            <TextInput
                                aria-label="Edit label name"
                                disabled={isUpdating}
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
                                justify={'end'}
                                wrap="nowrap"
                            >
                                <Button
                                    aria-label="Cancel edit"
                                    disabled={isUpdating}
                                    onClick={handleCancelEdit}
                                    size="sm"
                                    variant={'default'}
                                >
                                    Close
                                </Button>
                                <Button
                                    aria-label="Save label"
                                    disabled={isUpdating || !labelValue.trim() || labelValue.trim() === heading}
                                    loading={isUpdating}
                                    onClick={handleSubmitEdit}
                                    size="sm"
                                >
                                    Save
                                </Button>
                            </Group>
                        </Stack>
                    ) : (
                        <Group
                            gap="xs"
                            style={{
                                minHeight: '48px',
                                alignItems: 'center',
                            }}
                            wrap="nowrap"
                        >
                            <Text
                                c="dark.7"
                                fw={700}
                                onClick={canEdit ? () => setIsEditing(true) : undefined}
                                size="md"
                                style={{
                                    lineHeight: 1.5,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    flex: 1,
                                    minWidth: 0,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    cursor: canEdit ? 'pointer' : 'default',
                                }}
                                title={heading}
                            >
                                {heading}
                            </Text>
                            {(canEdit || canDelete) && isHovered && (
                                <Group
                                    gap="xs"
                                    style={{
                                        flexShrink: 0,
                                    }}
                                    wrap="nowrap"
                                >
                                    {canEdit && (
                                        <ActionIcon
                                            aria-label={`Edit ${heading} label`}
                                            color="gray"
                                            disabled={isUpdating}
                                            onClick={() => setIsEditing(true)}
                                            radius="md"
                                            size="lg"
                                            variant="subtle"
                                        >
                                            <IconPencil size={18} />
                                        </ActionIcon>
                                    )}
                                    {canDelete && (
                                        <ActionIcon
                                            aria-label={`Delete ${heading} label`}
                                            color="red"
                                            disabled={isDeleting}
                                            loading={isDeleting}
                                            onClick={handleDeleteClick}
                                            radius="md"
                                            size="lg"
                                            variant="subtle"
                                        >
                                            <IconTrash size={18} />
                                        </ActionIcon>
                                    )}
                                </Group>
                            )}
                        </Group>
                    )}
                </GridCol>
                <GridCol span={{base: 12, md: 8, lg: 9}}>
                    <Stack gap="xs">
                        {hasSessions && (
                            <Stack gap="xs">
                                {planSessions.map((planSession) => (
                                    <SessionSlotCard
                                        key={planSession.id}
                                        onAssign={onAssignSession}
                                        onDelete={onDeleteSession}
                                        onEdit={onEditSession}
                                        planSession={planSession}
                                    />
                                ))}
                            </Stack>
                        )}

                        <AddSlotButton onClick={onAdd} />
                    </Stack>
                </GridCol>
            </Grid>
        </Box>
    );
}
