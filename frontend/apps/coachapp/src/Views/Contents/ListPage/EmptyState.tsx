import {Button} from '@mantine/core';
import {IconPlus, IconFileText} from '@tabler/icons-react';
import {EmptyState as BaseEmptyState} from '@/Components/layouts/EmptyState';

interface EmptyStateProps {
    search?: string;
    onCreateContent?: () => void;
}

export function EmptyState({search, onCreateContent}: EmptyStateProps) {
    return (
        <BaseEmptyState
            icon={<IconFileText size={32} />}
            title="No content found"
            description={
                search
                    ? 'Try adjusting your search terms or create new content'
                    : 'Create your first piece of content to start building your content library'
            }
            action={
                <Button
                    leftSection={<IconPlus size={16} />}
                    onClick={onCreateContent}
                    size="sm"
                    variant="filled"
                    radius={9999}
                >
                    Create Your First Content
                </Button>
            }
            iconColor="gray.5"
            iconSize="xl"
        />
    );
}
