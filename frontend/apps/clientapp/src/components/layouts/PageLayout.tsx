import {Container, Group, Title, ActionIcon, Stack, Box, Breadcrumbs, Anchor, Text, rem} from '@mantine/core';
import {IconArrowLeft, IconRefresh} from '@tabler/icons-react';
import {ReactNode} from 'react';
import {useNavigate} from 'react-router';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    breadcrumbs?: {label: string; href?: string}[];
    actions?: ReactNode;
    onBack?: () => void;
    onRefresh?: () => void;
    loading?: boolean;
}

interface PageLayoutProps {
    children: ReactNode;
    header?: ReactNode;
    maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
    fullWidth?: boolean;
    padding?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export function PageHeader({title, subtitle, breadcrumbs, actions, onBack, onRefresh, loading}: PageHeaderProps) {
    const navigate = useNavigate();

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            navigate(-1);
        }
    };

    return (
        <Box
            bg="var(--mantine-color-default)"
            style={{
                borderBottom: `1px solid var(--mantine-color-default-border)`,
                position: 'sticky',
                top: 0,
                zIndex: 100,
            }}
        >
            <Container
                size="xl"
                py={{base: 'sm', sm: 'md'}}
                px={{base: 'md', sm: 'xl'}}
            >
                {breadcrumbs && breadcrumbs.length > 0 && (
                    <Breadcrumbs
                        mb="xs"
                        separatorMargin="xs"
                    >
                        {breadcrumbs.map((crumb, index) => (
                            <Anchor
                                key={index}
                                href={crumb.href}
                                size="sm"
                                c={index === breadcrumbs.length - 1 ? 'dimmed' : 'blue.6'}
                                fw={index === breadcrumbs.length - 1 ? 400 : 500}
                                td="none"
                            >
                                {crumb.label}
                            </Anchor>
                        ))}
                    </Breadcrumbs>
                )}

                <Stack gap="sm">
                    {/* Mobile: Stack layout */}
                    <Group
                        justify="space-between"
                        align="flex-start"
                        wrap="nowrap"
                        hiddenFrom="sm"
                    >
                        <Group
                            gap="sm"
                            style={{flex: 1}}
                        >
                            {onBack && (
                                <ActionIcon
                                    variant="subtle"
                                    color="gray"
                                    size={44} // 44px for mobile touch target
                                    onClick={handleBack}
                                    aria-label="Go back"
                                >
                                    <IconArrowLeft size={20} />
                                </ActionIcon>
                            )}
                            <Stack
                                gap={2}
                                style={{flex: 1}}
                            >
                                <Title
                                    order={1}
                                    size="h3"
                                    fw={600}
                                    c="gray.9"
                                    lineClamp={2}
                                >
                                    {title}
                                </Title>
                                {subtitle && (
                                    <Text
                                        size="sm"
                                        c="dimmed"
                                        lineClamp={1}
                                    >
                                        {subtitle}
                                    </Text>
                                )}
                            </Stack>
                        </Group>

                        {(actions || onRefresh) && (
                            <Group
                                gap="xs"
                                wrap="nowrap"
                            >
                                {onRefresh && (
                                    <ActionIcon
                                        variant="subtle"
                                        color="gray"
                                        size={44}
                                        onClick={onRefresh}
                                        loading={loading}
                                        aria-label="Refresh"
                                    >
                                        <IconRefresh size={18} />
                                    </ActionIcon>
                                )}
                                {actions}
                            </Group>
                        )}
                    </Group>

                    {/* Desktop: Horizontal layout */}
                    <Group
                        justify="space-between"
                        align="center"
                        wrap="nowrap"
                        visibleFrom="sm"
                    >
                        <Group
                            gap="md"
                            style={{flex: 1}}
                        >
                            {onBack && (
                                <ActionIcon
                                    variant="subtle"
                                    color="gray"
                                    size="lg"
                                    onClick={handleBack}
                                    aria-label="Go back"
                                >
                                    <IconArrowLeft size={20} />
                                </ActionIcon>
                            )}
                            <Stack
                                gap={4}
                                style={{flex: 1}}
                            >
                                <Title
                                    order={1}
                                    size="h2"
                                    fw={600}
                                    c="gray.9"
                                >
                                    {title}
                                </Title>
                                {subtitle && (
                                    <Text
                                        size="sm"
                                        c="dimmed"
                                    >
                                        {subtitle}
                                    </Text>
                                )}
                            </Stack>
                        </Group>

                        {(actions || onRefresh) && (
                            <Group
                                gap="sm"
                                wrap="nowrap"
                            >
                                {onRefresh && (
                                    <ActionIcon
                                        variant="subtle"
                                        color="gray"
                                        size="lg"
                                        onClick={onRefresh}
                                        loading={loading}
                                        aria-label="Refresh"
                                    >
                                        <IconRefresh size={18} />
                                    </ActionIcon>
                                )}
                                {actions}
                            </Group>
                        )}
                    </Group>
                </Stack>
            </Container>
        </Box>
    );
}

export function PageLayout({children, header, maxWidth = 'xl', fullWidth = false, padding = 'md'}: PageLayoutProps) {
    return (
        <Box
            style={{
                minHeight: '100vh',
                backgroundColor: 'var(--mantine-color-default)',
            }}
        >
            {header && (
                <Box
                    bg="var(--mantine-color-default)"
                    style={{
                        borderBottom: `1px solid var(--mantine-color-default-border)`,
                        position: 'sticky',
                        top: 0,
                        zIndex: 100,
                    }}
                >
                    <Container
                        size="xl"
                        p={'sm'}
                    >
                        {header}
                    </Container>
                </Box>
            )}

            {fullWidth ? (
                <Box p={{base: 'md', sm: padding}}>{children}</Box>
            ) : (
                <Container
                    size={maxWidth}
                    py={0}
                    px={{base: 'md', sm: padding}}
                >
                    {children}
                </Container>
            )}
        </Box>
    );
}

// Specialized layouts for common page types
export function ListPageLayout({
    children,
    searchComponent,
    actionButton,
}: {
    children: ReactNode;
    title: string;
    subtitle?: string;
    searchComponent?: ReactNode;
    actionButton?: ReactNode;
    onRefresh?: () => void;
    onBack?: () => void;
    loading?: boolean;
    breadcrumbs?: {label: string; href?: string}[];
}) {
    return (
        <PageLayout
            header={
                <Stack
                    gap="sm"
                    w={{base: '100%', sm: 'auto'}}
                >
                    {/* Mobile: Stack search and action */}
                    <Stack
                        gap="sm"
                        hiddenFrom="sm"
                    >
                        {searchComponent && <Box style={{width: '100%'}}>{searchComponent}</Box>}
                        {actionButton && <Box style={{width: '100%'}}>{actionButton}</Box>}
                    </Stack>

                    {/* Desktop: Horizontal layout */}
                    <Group
                        gap="sm"
                        visibleFrom="sm"
                        wrap="nowrap"
                    >
                        {searchComponent && <Box style={{minWidth: rem(240)}}>{searchComponent}</Box>}
                        {actionButton}
                    </Group>
                </Stack>
            }
        >
            {children}
        </PageLayout>
    );
}

export function DetailPageLayout({
    children,
    actions,
}: {
    children: ReactNode;
    title: string;
    subtitle?: string;
    actions?: ReactNode;
    onBack?: () => void;
    breadcrumbs?: {label: string; href?: string}[];
}) {
    return <PageLayout header={actions}>{children}</PageLayout>;
}

export function FormPageLayout({
    children,
    maxWidth = 'md',
}: {
    children: ReactNode;
    title: string;
    subtitle?: string;
    onBack?: () => void;
    breadcrumbs?: {label: string; href?: string}[];
    maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}) {
    return (
        <PageLayout maxWidth={maxWidth}>
            <Box
                bg="var(--mantine-color-default)"
                p={{base: 'lg', sm: 'xl'}}
                style={{
                    borderRadius: rem(12),
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1)',
                    border: '1px solid var(--mantine-color-default-border)',
                }}
            >
                {children}
            </Box>
        </PageLayout>
    );
}
