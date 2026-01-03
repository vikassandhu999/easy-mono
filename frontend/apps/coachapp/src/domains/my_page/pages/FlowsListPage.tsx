import {
    ActionIcon,
    Alert,
    Badge,
    Box,
    Button,
    ColorSwatch,
    CopyButton,
    Divider,
    Group,
    Loader,
    Modal,
    Paper,
    SimpleGrid,
    Stack,
    Switch,
    Text,
    Textarea,
    TextInput,
    Tooltip,
    UnstyledButton,
} from '@mantine/core';
import {useForm} from '@mantine/form';
import {useDebouncedCallback, useDisclosure} from '@mantine/hooks';
import {
    IconAlertCircle,
    IconBrandFacebook,
    IconBrandInstagram,
    IconBrandLinkedin,
    IconBrandYoutube,
    IconCheck,
    IconCopy,
    IconExternalLink,
    IconEye,
    IconLink,
    IconMail,
    IconPhone,
    IconPlus,
    IconRefresh,
    IconTrash,
} from '@tabler/icons-react';
import {useEffect, useState} from 'react';

import {
    useDisablePublicJoinMutation,
    useEnablePublicJoinMutation,
    useGetBusinessSettingsQuery,
    useRegenerateJoinCodeMutation,
    useUpdateBrandingSettingsMutation,
} from '@/services/settings/settings';
import PageWrapper from '@/containers/PageWrapper';
import {notifyError, notifyInfo, notifySuccess} from '@/utils/notification';

import classes from './styles.module.css';

// Color templates based on the design
const COLOR_TEMPLATES = [
    {id: 'violet', name: 'Violet', color: '#7C3AED'},
    {id: 'blue', name: 'Blue', color: '#2563EB'},
    {id: 'green', name: 'Green', color: '#059669'},
    {id: 'orange', name: 'Orange', color: '#EA580C'},
    {id: 'pink', name: 'Pink', color: '#DB2777'},
    {id: 'red', name: 'Red', color: '#DC2626'},
    {id: 'teal', name: 'Teal', color: '#0D9488'},
    {id: 'indigo', name: 'Indigo', color: '#4F46E5'},
];

interface ServiceItem {
    id: string;
    name: string;
    description: string;
    price: string;
    duration: string;
}

const MyPagePage = () => {
    const {data: settings, isLoading, error} = useGetBusinessSettingsQuery();
    const [enablePublicJoin, {isLoading: isEnabling}] = useEnablePublicJoinMutation();
    const [disablePublicJoin, {isLoading: isDisabling}] = useDisablePublicJoinMutation();
    const [regenerateCode, {isLoading: isRegenerating}] = useRegenerateJoinCodeMutation();
    const [updateBranding, {isLoading: isUpdating}] = useUpdateBrandingSettingsMutation();

    const [selectedColor, setSelectedColor] = useState<string>('#7C3AED');
    const [services, setServices] = useState<ServiceItem[]>([]);
    const [previewOpened, {open: openPreview, close: closePreview}] = useDisclosure(false);

    const form = useForm({
        initialValues: {
            headline: '',
            subtitle: '',
            description: '',
            aboutText: '',
            email: '',
            phone: '',
            instagram: '',
            facebook: '',
            linkedin: '',
            youtube: '',
        },
    });

    // Initialize form with settings data
    useEffect(() => {
        if (settings) {
            setSelectedColor(settings.accent_color || '#7C3AED');
            form.setValues({
                headline: settings.tagline || '',
                subtitle: '',
                description: '',
                aboutText: '',
                email: '',
                phone: '',
                instagram: '',
                facebook: '',
                linkedin: '',
                youtube: '',
            });
        }
    }, [settings]);

    const handleToggleEnabled = async () => {
        try {
            if (settings?.public_join_enabled) {
                await disablePublicJoin().unwrap();
                notifySuccess('Public page disabled');
            } else {
                await enablePublicJoin().unwrap();
                notifySuccess('Public page enabled');
            }
        } catch {
            notifyError('Failed to update page status');
        }
    };

    const handleColorSelect = async (color: string) => {
        setSelectedColor(color);
        try {
            await updateBranding({accent_color: color}).unwrap();
            notifySuccess('Color updated');
        } catch {
            notifyError('Failed to update color');
        }
    };

    const debouncedSaveHeadline = useDebouncedCallback(async (value: string) => {
        try {
            await updateBranding({tagline: value}).unwrap();
        } catch {
            notifyError('Failed to save headline');
        }
    }, 500);

    const handleRegenerateCode = async () => {
        try {
            await regenerateCode().unwrap();
            notifySuccess('New link generated');
        } catch {
            notifyError('Failed to generate new link');
        }
    };

    const handlePreview = () => {
        openPreview();
    };

    const handleOpenLive = () => {
        if (settings?.public_join_url) {
            window.open(settings.public_join_url, '_blank');
        } else {
            notifyInfo('Enable your public page first to view live page');
        }
    };

    const addService = () => {
        setServices([
            ...services,
            {
                id: Date.now().toString(),
                name: '',
                description: '',
                price: '',
                duration: '',
            },
        ]);
    };

    const removeService = (id: string) => {
        setServices(services.filter((s) => s.id !== id));
    };

    const updateService = (id: string, field: keyof ServiceItem, value: string) => {
        setServices(services.map((s) => (s.id === id ? {...s, [field]: value} : s)));
    };

    const isToggling = isEnabling || isDisabling;
    const joinUrl = settings?.public_join_url || '';
    const isEnabled = settings?.public_join_enabled ?? false;

    if (isLoading) {
        return (
            <PageWrapper bottomGutter>
                <div className={classes.pageContainer}>
                    <Group
                        justify="center"
                        py="xl"
                    >
                        <Loader size="md" />
                        <Text c="dimmed">Loading settings...</Text>
                    </Group>
                </div>
            </PageWrapper>
        );
    }

    if (error) {
        return (
            <PageWrapper bottomGutter>
                <div className={classes.pageContainer}>
                    <div className={classes.contentSection}>
                        <Alert
                            color="red"
                            icon={<IconAlertCircle size={16} />}
                            title="Error loading settings"
                        >
                            Could not load your page settings. Please try again later.
                        </Alert>
                    </div>
                </div>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper bottomGutter>
            <div className={classes.pageContainer}>
                {/* Header */}
                <div className={classes.headerSection}>
                    <div className={classes.headerRow}>
                        <div className={classes.headerContent}>
                            <h1 className={classes.pageTitle}>My Page</h1>
                            <p className={classes.pageDescription}>
                                Configure and customize your public page to attract more clients.
                            </p>
                        </div>
                        <Button
                            leftSection={<IconEye size={16} />}
                            onClick={handlePreview}
                            radius="xl"
                            size="sm"
                            variant="light"
                        >
                            Preview
                        </Button>
                    </div>
                </div>

                {/* Content */}
                <div className={classes.contentSection}>
                    <Stack gap="lg">
                        {/* Enable/Disable Switch */}
                        <Paper
                            p="md"
                            radius="md"
                            withBorder
                        >
                            <Group justify="space-between">
                                <Group gap="xs">
                                    <IconLink size={20} />
                                    <Box>
                                        <Text
                                            fw={600}
                                            size="sm"
                                        >
                                            Enable Public Page
                                        </Text>
                                        <Text
                                            c="dimmed"
                                            size="xs"
                                        >
                                            Allow clients to discover and join through your public page
                                        </Text>
                                    </Box>
                                </Group>
                                <Group gap="md">
                                    <Badge
                                        color={isEnabled ? 'green' : 'gray'}
                                        variant="light"
                                    >
                                        {isEnabled ? 'Active' : 'Inactive'}
                                    </Badge>
                                    <Switch
                                        checked={isEnabled}
                                        disabled={isToggling}
                                        onChange={handleToggleEnabled}
                                        size="md"
                                    />
                                </Group>
                            </Group>

                            {isEnabled && joinUrl && (
                                <>
                                    <Divider my="md" />
                                    <Box>
                                        <Text
                                            fw={500}
                                            mb="xs"
                                            size="sm"
                                        >
                                            Your Page Link
                                        </Text>
                                        <Group gap="xs">
                                            <TextInput
                                                readOnly
                                                size="sm"
                                                style={{flex: 1}}
                                                value={joinUrl}
                                            />
                                            <CopyButton
                                                timeout={2000}
                                                value={joinUrl}
                                            >
                                                {({copied, copy}) => (
                                                    <Tooltip label={copied ? 'Copied!' : 'Copy link'}>
                                                        <ActionIcon
                                                            color={copied ? 'teal' : 'blue'}
                                                            onClick={copy}
                                                            size="lg"
                                                            variant="light"
                                                        >
                                                            {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                                                        </ActionIcon>
                                                    </Tooltip>
                                                )}
                                            </CopyButton>
                                            <Tooltip label="Open page">
                                                <ActionIcon
                                                    component="a"
                                                    href={joinUrl}
                                                    rel="noopener noreferrer"
                                                    size="lg"
                                                    target="_blank"
                                                    variant="light"
                                                >
                                                    <IconExternalLink size={16} />
                                                </ActionIcon>
                                            </Tooltip>
                                        </Group>
                                        <Button
                                            leftSection={<IconRefresh size={14} />}
                                            loading={isRegenerating}
                                            mt="xs"
                                            onClick={handleRegenerateCode}
                                            size="xs"
                                            variant="subtle"
                                        >
                                            Generate New Link
                                        </Button>
                                    </Box>
                                </>
                            )}
                        </Paper>

                        {/* Only show configuration options if enabled */}
                        {isEnabled && (
                            <>
                                {/* Color Template */}
                                <Paper
                                    p="md"
                                    radius="md"
                                    withBorder
                                >
                                    <Text
                                        fw={600}
                                        mb="xs"
                                        size="sm"
                                    >
                                        Color Theme
                                    </Text>
                                    <Text
                                        c="dimmed"
                                        mb="md"
                                        size="xs"
                                    >
                                        Choose an accent color for your public page
                                    </Text>
                                    <Group gap="sm">
                                        {COLOR_TEMPLATES.map((template) => (
                                            <Tooltip
                                                key={template.id}
                                                label={template.name}
                                            >
                                                <UnstyledButton
                                                    onClick={() => handleColorSelect(template.color)}
                                                    style={{
                                                        padding: 2,
                                                        borderRadius: 'var(--mantine-radius-md)',
                                                        border:
                                                            selectedColor === template.color
                                                                ? `2px solid ${template.color}`
                                                                : '2px solid transparent',
                                                    }}
                                                >
                                                    <ColorSwatch
                                                        color={template.color}
                                                        size={32}
                                                        style={{cursor: 'pointer'}}
                                                    >
                                                        {selectedColor === template.color && (
                                                            <IconCheck
                                                                color="white"
                                                                size={14}
                                                            />
                                                        )}
                                                    </ColorSwatch>
                                                </UnstyledButton>
                                            </Tooltip>
                                        ))}
                                    </Group>
                                </Paper>

                                {/* Hero Section */}
                                <Paper
                                    p="md"
                                    radius="md"
                                    withBorder
                                >
                                    <Text
                                        fw={600}
                                        mb="xs"
                                        size="sm"
                                    >
                                        Hero Section
                                    </Text>
                                    <Text
                                        c="dimmed"
                                        mb="md"
                                        size="xs"
                                    >
                                        The main headline and introduction visitors see first
                                    </Text>
                                    <Stack gap="sm">
                                        <TextInput
                                            description="e.g., TRAIN HARD. LIVE BETTER"
                                            label="Headline"
                                            onChange={(e) => {
                                                form.setFieldValue('headline', e.target.value);
                                                debouncedSaveHeadline(e.target.value);
                                            }}
                                            placeholder="Your main headline"
                                            value={form.values.headline}
                                        />
                                        <TextInput
                                            description="e.g., FOR THE COMMITTED"
                                            label="Subtitle"
                                            onChange={(e) => form.setFieldValue('subtitle', e.target.value)}
                                            placeholder="A short subtitle"
                                            value={form.values.subtitle}
                                        />
                                        <Textarea
                                            description="Describe what you offer and why clients should choose you"
                                            label="Description"
                                            minRows={3}
                                            onChange={(e) => form.setFieldValue('description', e.target.value)}
                                            placeholder="Train like an athlete with top-tier equipment and expert programming..."
                                            value={form.values.description}
                                        />
                                    </Stack>
                                </Paper>

                                {/* Services/Products Section */}
                                <Paper
                                    p="md"
                                    radius="md"
                                    withBorder
                                >
                                    <Group
                                        justify="space-between"
                                        mb="xs"
                                    >
                                        <Box>
                                            <Text
                                                fw={600}
                                                size="sm"
                                            >
                                                Services / Products
                                            </Text>
                                            <Text
                                                c="dimmed"
                                                size="xs"
                                            >
                                                Add the programs or services you offer
                                            </Text>
                                        </Box>
                                        <Button
                                            leftSection={<IconPlus size={14} />}
                                            onClick={addService}
                                            size="xs"
                                            variant="light"
                                        >
                                            Add Service
                                        </Button>
                                    </Group>

                                    {services.length === 0 ? (
                                        <Box
                                            py="xl"
                                            style={{textAlign: 'center'}}
                                        >
                                            <Text
                                                c="dimmed"
                                                size="sm"
                                            >
                                                No services added yet. Click "Add Service" to get started.
                                            </Text>
                                        </Box>
                                    ) : (
                                        <Stack gap="md">
                                            {services.map((service, index) => (
                                                <Paper
                                                    key={service.id}
                                                    p="sm"
                                                    radius="sm"
                                                    withBorder
                                                >
                                                    <Group
                                                        justify="space-between"
                                                        mb="sm"
                                                    >
                                                        <Text
                                                            c="dimmed"
                                                            size="xs"
                                                        >
                                                            Service {index + 1}
                                                        </Text>
                                                        <ActionIcon
                                                            color="red"
                                                            onClick={() => removeService(service.id)}
                                                            size="sm"
                                                            variant="subtle"
                                                        >
                                                            <IconTrash size={14} />
                                                        </ActionIcon>
                                                    </Group>
                                                    <SimpleGrid cols={2}>
                                                        <TextInput
                                                            label="Name"
                                                            onChange={(e) =>
                                                                updateService(service.id, 'name', e.target.value)
                                                            }
                                                            placeholder="e.g., 30 Days Fat Loss"
                                                            size="xs"
                                                            value={service.name}
                                                        />
                                                        <TextInput
                                                            label="Price"
                                                            onChange={(e) =>
                                                                updateService(service.id, 'price', e.target.value)
                                                            }
                                                            placeholder="e.g., ₹2,999"
                                                            size="xs"
                                                            value={service.price}
                                                        />
                                                    </SimpleGrid>
                                                    <TextInput
                                                        label="Duration"
                                                        mt="xs"
                                                        onChange={(e) =>
                                                            updateService(service.id, 'duration', e.target.value)
                                                        }
                                                        placeholder="e.g., 4 weeks"
                                                        size="xs"
                                                        value={service.duration}
                                                    />
                                                    <Textarea
                                                        label="Description"
                                                        minRows={2}
                                                        mt="xs"
                                                        onChange={(e) =>
                                                            updateService(service.id, 'description', e.target.value)
                                                        }
                                                        placeholder="Describe what's included..."
                                                        size="xs"
                                                        value={service.description}
                                                    />
                                                </Paper>
                                            ))}
                                        </Stack>
                                    )}
                                </Paper>

                                {/* About Section */}
                                <Paper
                                    p="md"
                                    radius="md"
                                    withBorder
                                >
                                    <Text
                                        fw={600}
                                        mb="xs"
                                        size="sm"
                                    >
                                        About You / Business
                                    </Text>
                                    <Text
                                        c="dimmed"
                                        mb="md"
                                        size="xs"
                                    >
                                        Tell visitors about yourself or your business
                                    </Text>
                                    <Textarea
                                        minRows={4}
                                        onChange={(e) => form.setFieldValue('aboutText', e.target.value)}
                                        placeholder="Share your story, experience, and what makes you unique..."
                                        value={form.values.aboutText}
                                    />
                                </Paper>

                                {/* Contact & Social */}
                                <Paper
                                    p="md"
                                    radius="md"
                                    withBorder
                                >
                                    <Text
                                        fw={600}
                                        mb="xs"
                                        size="sm"
                                    >
                                        Contact & Social
                                    </Text>
                                    <Text
                                        c="dimmed"
                                        mb="md"
                                        size="xs"
                                    >
                                        How clients can reach you
                                    </Text>
                                    <Stack gap="sm">
                                        <SimpleGrid cols={2}>
                                            <TextInput
                                                label="Email"
                                                rightSection={<IconMail size={18} />}
                                                onChange={(e) => form.setFieldValue('email', e.target.value)}
                                                placeholder="your@email.com"
                                                value={form.values.email}
                                            />
                                            <TextInput
                                                label="Phone"
                                                rightSection={<IconPhone size={18} />}
                                                onChange={(e) => form.setFieldValue('phone', e.target.value)}
                                                placeholder="+91 98765 43210"
                                                value={form.values.phone}
                                            />
                                        </SimpleGrid>
                                        <Divider
                                            label="Social Profiles"
                                            labelPosition="center"
                                        />
                                        <SimpleGrid cols={2}>
                                            <TextInput
                                                label="Instagram"
                                                rightSection={<IconBrandInstagram size={18} />}
                                                onChange={(e) => form.setFieldValue('instagram', e.target.value)}
                                                placeholder="@username"
                                                value={form.values.instagram}
                                            />
                                            <TextInput
                                                label="Facebook"
                                                rightSection={<IconBrandFacebook size={18} />}
                                                onChange={(e) => form.setFieldValue('facebook', e.target.value)}
                                                placeholder="facebook.com/page"
                                                value={form.values.facebook}
                                            />
                                            <TextInput
                                                label="LinkedIn"
                                                rightSection={<IconBrandLinkedin size={18} />}
                                                onChange={(e) => form.setFieldValue('linkedin', e.target.value)}
                                                placeholder="linkedin.com/in/username"
                                                value={form.values.linkedin}
                                            />
                                            <TextInput
                                                label="YouTube"
                                                rightSection={<IconBrandYoutube size={18} />}
                                                onChange={(e) => form.setFieldValue('youtube', e.target.value)}
                                                placeholder="youtube.com/@channel"
                                                value={form.values.youtube}
                                            />
                                        </SimpleGrid>
                                    </Stack>
                                </Paper>
                            </>
                        )}
                    </Stack>
                </div>
            </div>

            {/* Preview Modal */}
            <Modal
                fullScreen
                onClose={closePreview}
                opened={previewOpened}
                padding={0}
                title={null}
                withCloseButton={false}
            >
                <LandingPagePreview
                    accentColor={selectedColor}
                    aboutText={form.values.aboutText}
                    description={form.values.description}
                    email={form.values.email}
                    facebook={form.values.facebook}
                    headline={form.values.headline}
                    instagram={form.values.instagram}
                    linkedin={form.values.linkedin}
                    onClose={closePreview}
                    onOpenLive={handleOpenLive}
                    phone={form.values.phone}
                    services={services}
                    subtitle={form.values.subtitle}
                    youtube={form.values.youtube}
                />
            </Modal>
        </PageWrapper>
    );
};

/* ============================================
   LANDING PAGE PREVIEW COMPONENT
   ============================================ */

interface LandingPagePreviewProps {
    accentColor: string;
    aboutText: string;
    description: string;
    email: string;
    facebook: string;
    headline: string;
    instagram: string;
    linkedin: string;
    onClose: () => void;
    onOpenLive: () => void;
    phone: string;
    services: ServiceItem[];
    subtitle: string;
    youtube: string;
}

const LandingPagePreview = ({
    accentColor,
    aboutText,
    description,
    email,
    facebook,
    headline,
    instagram,
    linkedin,
    onClose,
    onOpenLive,
    phone,
    services,
    subtitle,
    youtube,
}: LandingPagePreviewProps) => {
    const previewStyles = {
        container: {
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            background: '#fff',
            minHeight: '100vh',
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 24px',
            borderBottom: '1px solid #eee',
            background: '#fff',
            position: 'sticky' as const,
            top: 0,
            zIndex: 100,
        },
        logo: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 700,
            fontSize: '14px',
        },
        logoDot: {
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: accentColor,
        },
        heroSection: {
            padding: '40px 24px',
            background: '#fafafa',
        },
        heroHeadline: {
            fontSize: '32px',
            fontWeight: 900,
            lineHeight: 1.1,
            margin: 0,
            textTransform: 'uppercase' as const,
        },
        heroAccent: {
            color: accentColor,
        },
        heroContent: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '24px',
            marginTop: '24px',
        },
        heroImage: {
            width: '100%',
            height: '200px',
            background: `linear-gradient(135deg, ${accentColor}20, ${accentColor}40)`,
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: accentColor,
            fontSize: '14px',
        },
        heroRight: {
            display: 'flex',
            flexDirection: 'column' as const,
            justifyContent: 'center',
        },
        heroSubtitle: {
            fontSize: '18px',
            fontWeight: 700,
            marginBottom: '16px',
            textTransform: 'uppercase' as const,
        },
        heroDesc: {
            fontSize: '13px',
            color: '#666',
            lineHeight: 1.6,
            marginBottom: '20px',
        },
        ctaButton: {
            display: 'inline-block',
            padding: '10px 20px',
            background: accentColor,
            color: '#fff',
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase' as const,
            letterSpacing: '1px',
            border: 'none',
            cursor: 'pointer',
        },
        servicesSection: {
            padding: '40px 24px',
        },
        sectionTitle: {
            fontSize: '28px',
            fontWeight: 900,
            marginBottom: '24px',
            textTransform: 'uppercase' as const,
        },
        servicesGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
        },
        serviceCard: {
            padding: '20px',
            border: `2px solid ${accentColor}`,
            background: '#fff',
        },
        serviceTitle: {
            fontSize: '14px',
            fontWeight: 700,
            marginBottom: '12px',
            textTransform: 'uppercase' as const,
        },
        serviceDesc: {
            fontSize: '12px',
            color: '#666',
            lineHeight: 1.5,
            marginBottom: '16px',
        },
        servicePrice: {
            fontSize: '13px',
            fontWeight: 600,
            color: accentColor,
            marginBottom: '16px',
        },
        aboutSection: {
            padding: '40px 24px',
            background: '#fafafa',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '24px',
        },
        aboutTitle: {
            fontSize: '28px',
            fontWeight: 900,
            marginBottom: '16px',
            textTransform: 'uppercase' as const,
        },
        aboutText: {
            fontSize: '13px',
            color: '#666',
            lineHeight: 1.6,
        },
        aboutImage: {
            width: '100%',
            height: '250px',
            background: `linear-gradient(135deg, #333, #555)`,
            borderRadius: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '14px',
        },
        footer: {
            padding: '40px 24px',
            background: '#fff',
            borderTop: '1px solid #eee',
        },
        footerLogo: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '24px',
        },
        footerLogoIcon: {
            width: '48px',
            height: '48px',
            background: '#000',
            borderRadius: '8px',
        },
        footerBrand: {
            fontSize: '18px',
            fontWeight: 700,
        },
        footerGrid: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '24px',
            marginTop: '24px',
        },
        footerLabel: {
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase' as const,
            letterSpacing: '1px',
            marginBottom: '8px',
            color: '#999',
        },
        footerText: {
            fontSize: '12px',
            color: '#666',
        },
        footerLink: {
            fontSize: '12px',
            color: '#666',
            display: 'block',
            marginBottom: '4px',
        },
        previewBanner: {
            position: 'fixed' as const,
            bottom: 0,
            left: 0,
            right: 0,
            background: '#000',
            color: '#fff',
            padding: '12px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 200,
        },
    };

    return (
        <Box style={previewStyles.container}>
            {/* Preview Header */}
            <div style={previewStyles.header}>
                <div style={previewStyles.logo}>
                    <div style={previewStyles.logoDot} />
                    <span>YourBrand</span>
                </div>
            </div>

            <ScrollArea
                h="calc(100vh - 60px)"
                pb={80}
            >
                {/* Hero Section */}
                <div style={previewStyles.heroSection}>
                    <h1 style={previewStyles.heroHeadline}>
                        {headline ? (
                            <>
                                {headline.split(' ').slice(0, 2).join(' ')}.{' '}
                                <span style={previewStyles.heroAccent}>
                                    {headline.split(' ').slice(2).join(' ') || 'LIVE BETTER'}
                                </span>
                            </>
                        ) : (
                            <>
                                TRAIN HARD. <span style={previewStyles.heroAccent}>LIVE BETTER</span>
                            </>
                        )}
                    </h1>

                    <div style={previewStyles.heroContent}>
                        <div style={previewStyles.heroImage}>Hero Image</div>
                        <div style={previewStyles.heroRight}>
                            <div style={previewStyles.heroSubtitle}>{subtitle || 'FOR THE COMMITTED'}</div>
                            <p style={previewStyles.heroDesc}>
                                {description ||
                                    'Train like an athlete with top-tier equipment and expert programming. Whether you\'re building muscle or breaking PRs, we help you push past limits.'}
                            </p>
                            <button style={previewStyles.ctaButton}>RESERVE YOUR SPOT</button>
                        </div>
                    </div>
                </div>

                {/* Services Section */}
                <div style={previewStyles.servicesSection}>
                    <h2 style={previewStyles.sectionTitle}>WHAT DO WE OFFER ?</h2>
                    <div style={previewStyles.servicesGrid}>
                        {services.length > 0 ? (
                            services.map((service) => (
                                <div
                                    key={service.id}
                                    style={previewStyles.serviceCard}
                                >
                                    <div style={previewStyles.serviceTitle}>{service.name || 'SERVICE NAME'}</div>
                                    <p style={previewStyles.serviceDesc}>
                                        {service.description ||
                                            'Our facility is the optimal environment for strength training and performance.'}
                                    </p>
                                    {service.price && <div style={previewStyles.servicePrice}>{service.price}</div>}
                                    <button style={previewStyles.ctaButton}>RESERVE YOUR SPOT</button>
                                </div>
                            ))
                        ) : (
                            <>
                                <div style={previewStyles.serviceCard}>
                                    <div style={previewStyles.serviceTitle}>30 DAYS FAT LOSS</div>
                                    <p style={previewStyles.serviceDesc}>
                                        We believe in creating a positive environment where you can thrive.
                                    </p>
                                    <button style={previewStyles.ctaButton}>RESERVE YOUR SPOT</button>
                                </div>
                                <div style={previewStyles.serviceCard}>
                                    <div style={previewStyles.serviceTitle}>MUSCLE GAINING</div>
                                    <p style={previewStyles.serviceDesc}>
                                        Our facility is the optimal environment for strength training.
                                    </p>
                                    <button style={previewStyles.ctaButton}>RESERVE YOUR SPOT</button>
                                </div>
                                <div style={previewStyles.serviceCard}>
                                    <div style={previewStyles.serviceTitle}>STRENGTH TRAINING</div>
                                    <p style={previewStyles.serviceDesc}>
                                        Fully equipped with top-of-the-line tools and training areas.
                                    </p>
                                    <button style={previewStyles.ctaButton}>RESERVE YOUR SPOT</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* About Section */}
                <div style={previewStyles.aboutSection}>
                    <div>
                        <h2 style={previewStyles.aboutTitle}>ABOUT US/ME</h2>
                        <p style={previewStyles.aboutText}>
                            {aboutText ||
                                'We are passionate about helping you achieve your fitness goals. With years of experience and dedication, we provide personalized training programs tailored to your needs.'}
                        </p>
                    </div>
                    <div style={previewStyles.aboutImage}>Coach Image</div>
                </div>

                {/* Footer */}
                <div style={previewStyles.footer}>
                    <div style={previewStyles.footerLogo}>
                        <div style={previewStyles.footerLogoIcon} />
                        <span style={previewStyles.footerBrand}>PrimalTraining</span>
                    </div>

                    <div style={previewStyles.footerGrid}>
                        <div>
                            <div style={previewStyles.footerLabel}>CONTACT</div>
                            {email && <div style={previewStyles.footerText}>Email: {email}</div>}
                            {phone && <div style={previewStyles.footerText}>Phone: {phone}</div>}
                            {!email && !phone && (
                                <>
                                    <div style={previewStyles.footerText}>Email: hello@gym.com</div>
                                    <div style={previewStyles.footerText}>Phone: (555) 555-5555</div>
                                </>
                            )}
                        </div>
                        <div>
                            <div style={previewStyles.footerLabel}>SOCIAL</div>
                            {instagram && <div style={previewStyles.footerLink}>Instagram: {instagram}</div>}
                            {facebook && <div style={previewStyles.footerLink}>Facebook: {facebook}</div>}
                            {linkedin && <div style={previewStyles.footerLink}>LinkedIn: {linkedin}</div>}
                            {youtube && <div style={previewStyles.footerLink}>YouTube: {youtube}</div>}
                            {!instagram && !facebook && !linkedin && !youtube && (
                                <>
                                    <div style={previewStyles.footerLink}>Instagram</div>
                                    <div style={previewStyles.footerLink}>X</div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </ScrollArea>

            {/* Preview Banner */}
            <div style={previewStyles.previewBanner}>
                <Group gap="sm">
                    <IconEye size={18} />
                    <Text
                        fw={500}
                        size="sm"
                    >
                        Preview Mode
                    </Text>
                    <Text
                        c="dimmed"
                        size="xs"
                    >
                        This is how your page will look to visitors
                    </Text>
                </Group>
                <Group gap="sm">
                    <Button
                        color="gray"
                        onClick={onOpenLive}
                        size="xs"
                        variant="outline"
                    >
                        <IconExternalLink size={14} />
                        <Text
                            ml={6}
                            size="xs"
                        >
                            Open Live
                        </Text>
                    </Button>
                    <Button
                        onClick={onClose}
                        size="xs"
                        variant="white"
                    >
                        Close Preview
                    </Button>
                </Group>
            </div>
        </Box>
    );
};

export default MyPagePage;
