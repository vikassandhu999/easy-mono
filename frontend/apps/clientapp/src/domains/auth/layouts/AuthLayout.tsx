import {Box, Center, Container, Grid, Image, Loader, Stack, Text, Title} from '@mantine/core';
import {PropsWithChildren} from 'react';

import useScreenSize from '@/hooks/useScreenSize';
import TextLogo from '@/shared/TextLogo/TextLogo';

// eslint-disable-next-line prettier/prettier, import/no-absolute-path
import AuthIllustration from '/auth-background.png';

interface AuthLayoutProps extends PropsWithChildren {
    illustrationAlt?: string;
    loading?: boolean;
    subtitle?: string;
    title?: string;
}

export default function AuthLayout({
    children,
    illustrationAlt = 'Authentication background illustration',
    loading = false,
    subtitle,
    title,
}: AuthLayoutProps) {
    const {screen, isTab} = useScreenSize();

    const titleSize = screen === 'mobile' ? 'h3' : 'h3';
    const subtitleSize = screen === 'mobile' ? 'md' : 'lg';

    return (
        <Grid
            gutter={0}
            style={{
                minHeight: '100dvh',
            }}
        >
            <Grid.Col
                span={{md: 6, xs: 12}}
                style={{
                    alignItems: 'center',
                    background:
                        'linear-gradient(135deg, var(--mantine-color-blue-0) 0%, var(--mantine-color-pink-0) 100%)',
                    display: 'flex',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    padding: 0,
                    position: 'relative',
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
                        pb="xl"
                        pt={80}
                        style={{
                            width: '100%',
                        }}
                    >
                        <Box
                            style={{
                                position: 'absolute',
                                top: 0,
                            }}
                            ta="left"
                        >
                            <TextLogo
                                aria-label="Coach Easy Logo"
                                as="div"
                                size="lg"
                            />
                        </Box>

                        {(title || subtitle) && (
                            <Stack
                                gap="sm"
                                ta="center"
                            >
                                {title && (
                                    <Title
                                        c={'dark'}
                                        fw={700}
                                        order={2}
                                        size={titleSize}
                                    >
                                        {title}
                                    </Title>
                                )}
                                {subtitle && (
                                    <Text
                                        c="dimmed"
                                        size={subtitleSize}
                                    >
                                        {subtitle}
                                    </Text>
                                )}
                            </Stack>
                        )}

                        {loading && (
                            <Center>
                                <Loader size="md" />
                            </Center>
                        )}

                        {!loading && <Box w="100%">{children}</Box>}
                    </Stack>
                </Container>
            </Grid.Col>

            {!isTab && (
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
