import {Box, Center, Container, Grid, Image, Loader, Stack, Text, Title} from '@mantine/core';
import {useMediaQuery} from '@mantine/hooks';
import {PropsWithChildren} from 'react';

import TextLogo from '@/shared/TextLogo/TextLogo';

// eslint-disable-next-line prettier/prettier, import/no-absolute-path
import AuthIllustration from '/auth-background.png';

interface AuthLayoutProps extends PropsWithChildren {
    error?: boolean;
    illustrationAlt?: string;
    loading?: boolean;
    subtitle?: string;
    title?: string;
}

export default function AuthLayout({
    children,
    error = false,
    illustrationAlt = 'Authentication background illustration',
    loading = false,
    subtitle,
    title,
}: AuthLayoutProps) {
    const isSmallScreen = useMediaQuery('(max-width: 767px)');

    return (
        <Grid
            gutter={0}
            style={{
                minHeight: '100dvh',
            }}
        >
            {/* Content Section */}
            <Grid.Col
                span={{md: 6, xs: 12}}
                style={{
                    alignItems: 'center',
                    display: 'flex',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    padding: 0,
                }}
            >
                <Container
                    p={{base: 'md', sm: 'lg'}}
                    size="sm"
                    style={{
                        maxWidth: '480px',
                        width: '100%',
                    }}
                >
                    <Stack
                        gap="xl"
                        style={{
                            width: '100%',
                        }}
                    >
                        {/* Brand Section */}
                        <Box ta="center">
                            <TextLogo
                                aria-label="Coach Easy Logo"
                                as="div"
                                size="lg"
                            />
                        </Box>

                        {/* Form Header */}
                        {(title || subtitle) && (
                            <Stack
                                gap="xs"
                                ta="center"
                            >
                                {title && (
                                    <Title
                                        c={error ? 'red' : 'dark'}
                                        fw={700}
                                        order={2}
                                        size="h4"
                                    >
                                        {title}
                                    </Title>
                                )}
                                {subtitle && (
                                    <Text
                                        c="dimmed"
                                        size="sm"
                                    >
                                        {subtitle}
                                    </Text>
                                )}
                            </Stack>
                        )}

                        {/* Loading State */}
                        {loading && (
                            <Center>
                                <Loader size="md" />
                            </Center>
                        )}

                        {/* Form Content */}
                        {!loading && <Box w="100%">{children}</Box>}
                    </Stack>
                </Container>
            </Grid.Col>

            {/* Illustration Section - Hidden on mobile */}
            {!isSmallScreen && (
                <Grid.Col
                    span={6}
                    style={{
                        alignItems: 'center',
                        background:
                            'linear-gradient(135deg, var(--mantine-color-primary-0) 0%, var(--mantine-color-primary-1) 100%)',
                        display: 'flex',
                        justifyContent: 'center',
                        minHeight: '100vh',
                        overflow: 'hidden',
                    }}
                >
                    <Image
                        alt={illustrationAlt}
                        loading="lazy"
                        src={AuthIllustration}
                        style={{
                            height: '100%',
                            objectFit: 'cover',
                            width: '100%',
                        }}
                    />
                </Grid.Col>
            )}
        </Grid>
    );
}
