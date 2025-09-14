import {Alert, Box, Stack, Text, ThemeIcon} from '@mantine/core';
import {IconAlertCircle, IconMail} from '@tabler/icons-react';

import HeadingContainer from '@/components/container/HeaderContainer';
import PaddingContainer from '@/components/container/PaddingContainer';
import PagePaper from '@/components/container/PagePaper';
import TextLogo from '@/components/TextLogo/TextLogo';
import {useVerifyToken} from '@/hooks/useVerifyToken';

const VeficationLoader = () => (
    <Stack
        align="center"
        justify="center"
        mih={200}
    >
        <ThemeIcon
            color="yellow"
            radius={80}
            size={80}
            variant="light"
        >
            <IconMail size={64} />
        </ThemeIcon>
        <Text size="lg">Verifying your invitation, please wait...</Text>
    </Stack>
);

const VerifyInvitationLinkPage = () => {
    const {error, loading} = useVerifyToken();

    return (
        <PagePaper>
            <HeadingContainer withBorder={false}>
                <Box
                    py="md"
                    ta="center"
                >
                    <TextLogo
                        aria-label="Coach Easy Logo"
                        as="div"
                        size={'lg'}
                    />
                </Box>
            </HeadingContainer>

            <PaddingContainer>
                <Stack
                    align="center"
                    justify="center"
                    mih={200}
                >
                    {loading && <VeficationLoader />}
                    {error && (
                        <Alert
                            color="red"
                            icon={<IconAlertCircle size={16} />}
                            radius="md"
                            title="Verification Failed"
                            w={'100%'}
                        >
                            <Text size="sm">{error}</Text>
                        </Alert>
                    )}
                </Stack>
            </PaddingContainer>
        </PagePaper>
    );
};
export default VerifyInvitationLinkPage;
