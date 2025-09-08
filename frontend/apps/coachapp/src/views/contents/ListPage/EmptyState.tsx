import {Button} from '@mantine/core';
import {IconFileText, IconPlus} from '@tabler/icons-react';

import {EmptyState as BaseEmptyState} from '@/components/layouts/EmptyState';

interface EmptyStateProps {
    onCreateContent?: () => void;
    search?: string;
}

export function EmptyState({onCreateContent, search}: EmptyStateProps) {
    return (
        <BaseEmptyState
            action={
                <Button
                    leftSection={<IconPlus size={16} />}
                    onClick={onCreateContent}
                    radius={9999}
                    size="sm"
                    variant="filled"
                >
                    Create Your First Content
                </Button>
            }
            description={
                search
                    ? 'Try adjusting your search terms or create new content'
                    : 'Create your first piece of content to start building your content library'
            }
            icon={<IconFileText size={32} />}
            iconColor="gray.5"
            iconSize="xl"
            title="No content found"
        />
    );
}
