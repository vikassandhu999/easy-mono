import {Badge, Group, Text, Avatar} from '@mantine/core';
import {IconEdit, IconTrash, IconEye, IconUsers, IconClock} from '@tabler/icons-react';
import {ListCard, type ListCardProps} from '../ListCard';
import {SimpleListItem, type SimpleListItemProps} from '../SimpleListItem';
import {EnhancedRecordsList, type ListLayout} from '../EnhancedRecordsList';

// Example data types
interface Program {
    id: string;
    name: string;
    description: string;
    status: 'active' | 'draft' | 'archived';
    clientCount: number;
    duration: number;
    createdAt: string;
}

interface Client {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    status: 'active' | 'inactive';
    lastSeen: string;
}

// Program Card Example
export function ProgramCardExample({
    program,
    onEdit,
    onView,
    onDelete,
}: {
    program: Program;
    onEdit: () => void;
    onView: () => void;
    onDelete: () => void;
}) {
    const cardProps: ListCardProps = {
        title: program.name,
        subtitle: program.description,
        badge: {
            text: program.status,
            color: program.status === 'active' ? 'green' : program.status === 'draft' ? 'yellow' : 'gray',
            variant: 'light',
        },
        badges: [
            {
                text: `${program.clientCount} clients`,
                color: 'blue',
                variant: 'outline',
                size: 'xs',
            },
            {
                text: `${program.duration} weeks`,
                color: 'gray',
                variant: 'outline',
                size: 'xs',
            },
        ],
        actions: [
            {
                label: 'View',
                icon: <IconEye size={16} />,
                onClick: onView,
            },
            {
                label: 'Edit',
                icon: <IconEdit size={16} />,
                onClick: onEdit,
            },
            {
                label: 'Delete',
                icon: <IconTrash size={16} />,
                onClick: onDelete,
                destructive: true,
            },
        ],
        metadata: [
            {
                label: 'Clients',
                value: program.clientCount.toString(),
                icon: <IconUsers size={14} />,
            },
            {
                label: 'Duration',
                value: `${program.duration} weeks`,
                icon: <IconClock size={14} />,
            },
        ],
        onClick: onView,
        testId: `program-card-${program.id}`,
    };

    return <ListCard {...cardProps} />;
}

// Client Simple List Item Example
export function ClientListItemExample({
    client,
    onEdit,
    onView,
}: {
    client: Client;
    onEdit: () => void;
    onView: () => void;
}) {
    const itemProps: SimpleListItemProps = {
        title: client.name,
        subtitle: client.email,
        leftContent: (
            <Avatar
                size="sm"
                src={client.avatar}
                name={client.name}
            >
                {client.name.charAt(0).toUpperCase()}
            </Avatar>
        ),
        rightContent: (
            <Group
                gap="xs"
                align="center"
            >
                <Badge
                    size="xs"
                    color={client.status === 'active' ? 'green' : 'gray'}
                    variant="dot"
                    radius="md"
                    style={{
                        fontWeight: 500,
                        textTransform: 'capitalize',
                    }}
                >
                    {client.status}
                </Badge>
                <Text
                    size="xs"
                    c="dimmed"
                    style={{
                        fontSize: '11px',
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                    }}
                >
                    {client.lastSeen}
                </Text>
            </Group>
        ),
        actions: [
            {
                label: 'View Profile',
                icon: <IconEye size={16} />,
                onClick: onView,
            },
            {
                label: 'Edit',
                icon: <IconEdit size={16} />,
                onClick: onEdit,
            },
        ],
        onClick: onView,
        testId: `client-item-${client.id}`,
    };

    return <SimpleListItem {...itemProps} />;
}

// Enhanced List Example with Layout Switching
export function ProgramListExample({
    programs,
    layout = 'card',
    onEdit,
    onView,
    onDelete,
}: {
    programs: Program[];
    layout?: ListLayout;
    onEdit: (id: string) => void;
    onView: (id: string) => void;
    onDelete: (id: string) => void;
}) {
    const renderProgram = (program: Program, _index: number, currentLayout: ListLayout) => {
        if (currentLayout === 'card') {
            return (
                <ProgramCardExample
                    key={program.id}
                    program={program}
                    onEdit={() => onEdit(program.id)}
                    onView={() => onView(program.id)}
                    onDelete={() => onDelete(program.id)}
                />
            );
        }

        // For simple and compact layouts, show a simplified version
        return (
            <SimpleListItem
                key={program.id}
                title={program.name}
                subtitle={currentLayout === 'compact' ? undefined : program.description}
                rightContent={
                    <Group
                        gap="xs"
                        align="center"
                    >
                        <Badge
                            size="xs"
                            color={program.status === 'active' ? 'green' : 'yellow'}
                            variant="light"
                            radius="md"
                            style={{
                                fontWeight: 500,
                                textTransform: 'capitalize',
                            }}
                        >
                            {program.status}
                        </Badge>
                        <Text
                            size="xs"
                            c="dimmed"
                            style={{
                                fontSize: '11px',
                                fontWeight: 500,
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {program.clientCount} clients
                        </Text>
                    </Group>
                }
                actions={[
                    {
                        label: 'View',
                        icon: <IconEye size={16} />,
                        onClick: () => onView(program.id),
                    },
                    {
                        label: 'Edit',
                        icon: <IconEdit size={16} />,
                        onClick: () => onEdit(program.id),
                    },
                    {
                        label: 'Delete',
                        icon: <IconTrash size={16} />,
                        onClick: () => onDelete(program.id),
                        destructive: true,
                    },
                ]}
                onClick={() => onView(program.id)}
                compact={currentLayout === 'compact'}
                testId={`program-${layout}-${program.id}`}
            />
        );
    };

    return (
        <EnhancedRecordsList
            records={programs}
            renderItem={renderProgram}
            itemKey={(program) => program.id}
            layout={layout}
            showDividers={layout === 'simple'}
            emptyState={
                <Text
                    ta="center"
                    c="dimmed"
                    py="xl"
                >
                    No programs found
                </Text>
            }
            hasNextPage={false}
            fetchNextPage={() => {}}
            showItemCount
            testId="programs-list"
        />
    );
}

// Usage Guidelines Component
export function ListingUsageGuidelines() {
    return (
        <div style={{padding: '20px', maxWidth: '800px'}}>
            <h2>Listing Components Usage Guidelines</h2>

            <section>
                <h3>When to use ListCard vs SimpleListItem</h3>

                <h4>Use ListCard for:</h4>
                <ul>
                    <li>Complex entities with multiple attributes (Programs, Content, Sessions)</li>
                    <li>Items that need prominent actions</li>
                    <li>Content that benefits from visual separation</li>
                    <li>Mobile-first interfaces where touch targets matter</li>
                    <li>When you need to display metadata, badges, or custom content</li>
                </ul>

                <h4>Use SimpleListItem for:</h4>
                <ul>
                    <li>Simple entities with minimal information (Contacts, Tags, Categories)</li>
                    <li>Dense lists where space is limited</li>
                    <li>Quick scanning scenarios</li>
                    <li>Settings or configuration lists</li>
                    <li>Secondary lists within cards or modals</li>
                </ul>
            </section>

            <section>
                <h3>UX Principles Applied</h3>
                <ul>
                    <li>
                        <strong>Visual Grouping:</strong> Cards create clear boundaries between related information
                    </li>
                    <li>
                        <strong>Cognitive Load Reduction:</strong> Clear separation helps users process information
                    </li>
                    <li>
                        <strong>48pt Touch Targets:</strong> All interactive elements meet mobile accessibility
                        standards
                    </li>
                    <li>
                        <strong>Consistent Patterns:</strong> Similar elements look and work the same way
                    </li>
                    <li>
                        <strong>Clear Hierarchy:</strong> Important information is more prominent
                    </li>
                    <li>
                        <strong>Generous White Space:</strong> Improves readability and reduces visual noise
                    </li>
                </ul>
            </section>
        </div>
    );
}

export default ListingUsageGuidelines;
export {ListingUsageGuidelines as ListingExamples};
