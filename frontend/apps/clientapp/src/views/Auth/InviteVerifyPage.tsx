 
import {AuthLayout} from '@/Components/Layouts/AuthLayout';
import {Loader, Alert, Stack, Text, Box, ThemeIcon } from '@mantine/core';
import {IconAlertCircle, IconMail} from '@tabler/icons-react';
import { useVerifyToken } from "@/hooks/useVerifyToken";
import PagePaper from '@/Components/Containers/PagePaper';
import PaddingContainer from '@/Components/Containers/PaddingContainer';
import HeadingContainer from "@/components/Containers/HeaderContainer";
import TextLogo from '@/Components/TextLogo/TextLogo';
import VerifyingLoader from "../../../../public/verifying-loader.svg"

const VeficationLoader = () => (
    <Stack
        align="center"
        justify="center"
        mih={200}
    >
        <ThemeIcon 
            variant='light' 
            color="yellow" 
            size={80} 
            radius={80}
          
        >
          <IconMail size={64} />
            </ThemeIcon>

        <Text text="lg">Verifying your invitation, please wait...</Text>
    </Stack>
)

const InviteVerifyPage = () => { 

    const {loading, error, email} = useVerifyToken();

    return (
        <PagePaper>
            <HeadingContainer withBorder={false}>
                   <Box ta="center" py="md">
                            <TextLogo
                                size={'lg'}
                                as="div"
                                aria-label="Coach Easy Logo"
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
                            icon={<IconAlertCircle size={16} />}
                            title="Verification Failed"
                            color="red"
                            radius="md"
                            w={'100%'}
                        >
                            <Text size="sm">{error}</Text>
                        </Alert>
                    )}
                </Stack>
            </PaddingContainer>
        </PagePaper>
        )   
};
export default InviteVerifyPage;