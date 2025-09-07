import React from 'react';
import {TextInput, Textarea, Button, Box} from '@mantine/core';
import {useForm} from '@mantine/form';
import {CreateProgramProps, Program, UpdateProgramProps} from '@/Api/Programs';
import PagePaper from '@/Components/Containers/PagePaper';
import HeadingContainer from '@/Components/Containers/HeaderContainer';
import PaddingContainer from '@/Components/Containers/PaddingContainer';
import {notifications} from '@mantine/notifications';
import {FormSection} from '../Containers/FormSection';
import Header from '../layouts/Header';
import {ArrowRightIcon} from '@phosphor-icons/react';

interface ProgramFormProps {
    title: string;
    submitText: string;
    initialData?: Program;
    onSubmit: (data: CreateProgramProps | UpdateProgramProps) => Promise<void>;
    onCancel?: () => void;
}

export const ProgramForm: React.FC<ProgramFormProps> = ({title, submitText, initialData, onSubmit, onCancel}) => {
    const form = useForm({
        initialValues: {
            name: initialData?.name || '',
            description: initialData?.description || '',
        },
        validate: {
            name: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Name is required';
                }
                if (value.trim().length < 3) {
                    return 'Name must be at least 3 characters';
                }
                if (value.trim().length > 100) {
                    return 'Name cannot exceed 100 characters';
                }
                return null;
            },
            description: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Description is required';
                }
                if (value.trim().length < 10) {
                    return 'Description should be at least 10 characters';
                }
                if (value.trim().length > 1000) {
                    return 'Description cannot exceed 1000 characters';
                }
                return null;
            },
        },
    });

    const handleFormSubmit = async (values: typeof form.values) => {
        if (form.validate().hasErrors) {
            notifications.show({
                title: 'Validation Error',
                message: 'Please fix the errors in the form',
                color: 'red',
                position: 'top-center',
                autoClose: 1000,
            });
            return;
        }

        const payload = {
            name: values.name,
            description: values.description || undefined,
        };
        await onSubmit(payload);
    };

    return (
        <PagePaper>
            <HeadingContainer
                withBorder={false}
                style={{paddingInline: 'var(--ce-size-xs)', paddingBlock: 'var(--ce-size-sm)'}}
            >
                <Header
                    onBack={onCancel}
                    title={title}
                />

                {/* <Group
                    justify={'start'}
                    align="center"
                    wrap="nowrap"
                    w="100%"
                >
                    <ActionIcon
                        variant={'subtle'}
                        color={'dark'}
                        size={'lg'}
                        p={0}
                        onClick={onCancel}
                    >
                        <ArrowLeftIcon size={32} />
                    </ActionIcon>
                    <Title order={5}>{title}</Title>
                </Group> */}
            </HeadingContainer>

            <PaddingContainer>
                <form onSubmit={form.onSubmit(handleFormSubmit)}>
                    <FormSection>
                        <TextInput
                            label="Name"
                            placeholder="e.g., Complete MMA Fundamentals"
                            description="Choose a clear, descriptive name for your program"
                            required
                            withAsterisk
                            size={'lg'}
                            {...form.getInputProps('name')}
                        />
                        <Textarea
                            label="Description"
                            placeholder="Describe what clients will learn and achieve..."
                            description={`${form.values.description.length}/1000 characters`}
                            minRows={4}
                            maxRows={8}
                            required
                            withAsterisk
                            size={'lg'}
                            {...form.getInputProps('description')}
                        />
                        <Box
                            style={{
                                flex: 1,
                            }}
                        ></Box>
                        <Button
                            fullWidth
                            loading={form.submitting}
                            size={'lg'}
                            radius={9999}
                            type={'submit'}
                            rightSection={<ArrowRightIcon strokeWidth={2} />}
                        >
                            {submitText}
                        </Button>
                    </FormSection>
                    {/* <FixedBottom
                        isSubmitting={form.submitting}
                        label={submitText}
                    /> */}
                </form>
            </PaddingContainer>
        </PagePaper>
    );
};
