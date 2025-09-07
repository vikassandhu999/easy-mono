import {PropsWithChildren} from 'react';
import {Grid, Container, Stack, Title, Text, Image, Center, Box, Loader} from '@mantine/core';
import {useMediaQuery} from '@mantine/hooks';
// eslint-disable-next-line prettier/prettier, import/no-absolute-path
import AuthIllustration from '/auth-background.png';
import TextLogo from '@/Components/TextLogo/TextLogo';

interface AuthLayoutProps extends PropsWithChildren {
    title?: string;
    subtitle?: string;
    loading?: boolean;
    error?: boolean;
    illustrationAlt?: string;
}

export function AuthLayout({
    children,
    title,
    subtitle,
    loading = false,
    error = false,
    illustrationAlt = 'Authentication background illustration',
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
                span={{xs: 12, md: 6}}
                style={{
                    display: 'flex',
                    alignItems: 'start',
                    justifyContent: 'start',
                    minHeight: '100vh',
                    padding: 0,
                }}
            >
                <Container
                    size="sm"
                    style={{
                        width: '100%',
                        maxWidth: '420px',
                        display: 'block',
                    }}
                    p={{base: 'md', sm: 'lg'}}
                >
                    <Stack
                        gap="md"
                        align="center"
                        style={{
                            minHeight: isSmallScreen ? 'auto' : '60vh',
                            justifyContent: 'center',
                        }}
                    >
                        {/* Brand Section */}
                        <Box ta="center">
                            <TextLogo
                                size={'lg'}
                                as="div"
                                aria-label="Coach Easy Logo"
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
                                        order={6}
                                        fw={600}
                                        c={error ? 'red' : 'dark'}
                                    >
                                        {title}
                                    </Title>
                                )}
                                {subtitle && (
                                    <Text
                                        size={'sm'}
                                        c="dimmed"
                                        fw={400}
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
                            w="100%"
                            mt={'lg'}
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
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '100vh',
                        background:
                            'linear-gradient(135deg, var(--mantine-color-primary-0) 0%, var(--mantine-color-primary-1) 100%)',
                        overflow: 'hidden',
                    }}
                >
                    <Image
                        src={AuthIllustration}
                        alt={illustrationAlt}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                        }}
                        loading="lazy"
                    />
                </Grid.Col>
            )}
        </Grid>
    );
}
