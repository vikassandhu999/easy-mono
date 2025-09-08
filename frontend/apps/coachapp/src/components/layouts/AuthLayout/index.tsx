import {Box, Center, Container, Grid, Image, Loader, Stack, Text, Title} from '@mantine/core';
import {useMediaQuery} from '@mantine/hooks';
import {PropsWithChildren} from 'react';

import TextLogo from '@/components/TextLogo/TextLogo';

// eslint-disable-next-line prettier/prettier, import/no-absolute-path
import AuthIllustration from '/auth-background.png';

interface AuthLayoutProps extends PropsWithChildren {
    error?: boolean;
    illustrationAlt?: string;
    loading?: boolean;
    subtitle?: string;
    title?: string;
}

export default function Index({
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
                    alignItems: 'start',
                    display: 'flex',
                    justifyContent: 'start',
                    minHeight: '100vh',
                    padding: 0,
                }}
            >
                <Container
                    p={{base: 'md', sm: 'lg'}}
                    size="sm"
                    style={{
                        display: 'block',
                        maxWidth: '420px',
                        width: '100%',
                    }}
                >
                    <Stack
                        align="center"
                        gap="md"
                        style={{
                            justifyContent: 'center',
                            minHeight: isSmallScreen ? 'auto' : '60vh',
                        }}
                    >
                        {/* Brand Section */}
                        <Box ta="center">
                            <TextLogo
                                aria-label="Coach Easy Logo"
                                as="div"
                                size={'lg'}
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
                                        fw={600}
                                        order={6}
                                    >
                                        {title}
                                    </Title>
                                )}
                                {subtitle && (
                                    <Text
                                        c="dimmed"
                                        fw={400}
                                        size={'sm'}
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
                        <Box
                            mt={'lg'}
                            w="100%"
                        >
                            <Stack gap="lg">{children}</Stack>
                        </Box>
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
