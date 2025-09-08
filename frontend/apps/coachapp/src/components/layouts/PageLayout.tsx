import {ActionIcon, Anchor, Box, Breadcrumbs, Container, Group, rem, Stack, Text, Title} from '@mantine/core';
import {IconArrowLeft, IconRefresh} from '@tabler/icons-react';
import {ReactNode} from 'react';
import {useNavigate} from 'react-router';

interface PageHeaderProps {
    actions?: ReactNode;
    breadcrumbs?: {href?: string; label: string}[];
    loading?: boolean;
    onBack?: () => void;
    onRefresh?: () => void;
    subtitle?: string;
    title: string;
}

interface PageLayoutProps {
    children: ReactNode;
    fullWidth?: boolean;
    header?: ReactNode;
    maxWidth?: 'lg' | 'md' | 'sm' | 'xl' | 'xs' | number;
    padding?: 'lg' | 'md' | 'sm' | 'xl' | 'xs';
}

export function DetailPageLayout({
    actions,
    children,
}: {
    actions?: ReactNode;
    breadcrumbs?: {href?: string; label: string}[];
    children: ReactNode;
    onBack?: () => void;
    subtitle?: string;
    title: string;
}) {
    return <PageLayout header={actions}>{children}</PageLayout>;
}

export function FormPageLayout({
    children,
    maxWidth = 'md',
}: {
    breadcrumbs?: {href?: string; label: string}[];
    children: ReactNode;
    maxWidth?: 'lg' | 'md' | 'sm' | 'xl' | 'xs';
    onBack?: () => void;
    subtitle?: string;
    title: string;
}) {
    return (
        <PageLayout maxWidth={maxWidth}>
            <Box
                bg="var(--mantine-color-default)"
                p={{base: 'lg', sm: 'xl'}}
                style={{
                    border: '1px solid var(--mantine-color-default-border)',
                    borderRadius: rem(12),
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1)',
                }}
            >
                {children}
            </Box>
        </PageLayout>
    );
}

// Specialized layouts for common page types
export function ListPageLayout({
    actionButton,
    children,
    searchComponent,
}: {
    actionButton?: ReactNode;
    breadcrumbs?: {href?: string; label: string}[];
    children: ReactNode;
    loading?: boolean;
    onBack?: () => void;
    onRefresh?: () => void;
    searchComponent?: ReactNode;
    subtitle?: string;
    title: string;
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

export function PageHeader({actions, breadcrumbs, loading, onBack, onRefresh, subtitle, title}: PageHeaderProps) {
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
                px={{base: 'md', sm: 'xl'}}
                py={{base: 'sm', sm: 'md'}}
                size="xl"
            >
                {breadcrumbs && breadcrumbs.length > 0 && (
                    <Breadcrumbs
                        mb="xs"
                        separatorMargin="xs"
                    >
                        {breadcrumbs.map((crumb, index) => (
                            <Anchor
                                c={index === breadcrumbs.length - 1 ? 'dimmed' : 'blue.6'}
                                fw={index === breadcrumbs.length - 1 ? 400 : 500}
                                href={crumb.href}
                                key={index}
                                size="sm"
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
                        align="flex-start"
                        hiddenFrom="sm"
                        justify="space-between"
                        wrap="nowrap"
                    >
                        <Group
                            gap="sm"
                            style={{flex: 1}}
                        >
                            {onBack && (
                                <ActionIcon
                                    aria-label="Go back"
                                    color="gray"
                                    onClick={handleBack}
                                    size={44} // 44px for mobile touch target
                                    variant="subtle"
                                >
                                    <IconArrowLeft size={20} />
                                </ActionIcon>
                            )}
                            <Stack
                                gap={2}
                                style={{flex: 1}}
                            >
                                <Title
                                    c="gray.9"
                                    fw={600}
                                    lineClamp={2}
                                    order={1}
                                    size="h3"
                                >
                                    {title}
                                </Title>
                                {subtitle && (
                                    <Text
                                        c="dimmed"
                                        lineClamp={1}
                                        size="sm"
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
                                        aria-label="Refresh"
                                        color="gray"
                                        loading={loading}
                                        onClick={onRefresh}
                                        size={44}
                                        variant="subtle"
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
                        align="center"
                        justify="space-between"
                        visibleFrom="sm"
                        wrap="nowrap"
                    >
                        <Group
                            gap="md"
                            style={{flex: 1}}
                        >
                            {onBack && (
                                <ActionIcon
                                    aria-label="Go back"
                                    color="gray"
                                    onClick={handleBack}
                                    size="lg"
                                    variant="subtle"
                                >
                                    <IconArrowLeft size={20} />
                                </ActionIcon>
                            )}
                            <Stack
                                gap={4}
                                style={{flex: 1}}
                            >
                                <Title
                                    c="gray.9"
                                    fw={600}
                                    order={1}
                                    size="h2"
                                >
                                    {title}
                                </Title>
                                {subtitle && (
                                    <Text
                                        c="dimmed"
                                        size="sm"
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
                                        aria-label="Refresh"
                                        color="gray"
                                        loading={loading}
                                        onClick={onRefresh}
                                        size="lg"
                                        variant="subtle"
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

export function PageLayout({children, fullWidth = false, header, maxWidth = 'xl', padding = 'md'}: PageLayoutProps) {
    return (
        <Box
            style={{
                backgroundColor: 'var(--mantine-color-default)',
                minHeight: '100vh',
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
                        p={'sm'}
                        size="xl"
                    >
                        {header}
                    </Container>
                </Box>
            )}

            {fullWidth ? (
                <Box p={{base: 'md', sm: padding}}>{children}</Box>
            ) : (
                <Container
                    px={{base: 'md', sm: padding}}
                    py={0}
                    size={maxWidth}
                >
                    {children}
                </Container>
            )}
        </Box>
    );
}
