import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  CopyButton,
  Divider,
  Group,
  Loader,
  NumberInput,
  Paper,
  Stack,
  Switch,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconCheck,
  IconCopy,
  IconExternalLink,
  IconLink,
  IconRefresh,
  IconShieldCheck,
  IconUsers,
} from '@tabler/icons-react';

import {
  useDisablePublicJoinMutation,
  useEnablePublicJoinMutation,
  useGetBusinessSettingsQuery,
  useRegenerateJoinCodeMutation,
  useUpdatePublicJoinSettingsMutation,
} from '@/services/settings/settings';

import classes from './PublicJoinSettings.module.css';

export default function PublicJoinSettings() {
  const {data: settings, isLoading, error} = useGetBusinessSettingsQuery();
  const [enablePublicJoin, {isLoading: isEnabling}] = useEnablePublicJoinMutation();
  const [disablePublicJoin, {isLoading: isDisabling}] = useDisablePublicJoinMutation();
  const [regenerateCode, {isLoading: isRegenerating}] = useRegenerateJoinCodeMutation();
  const [updateSettings, {isLoading: isUpdating}] = useUpdatePublicJoinSettingsMutation();

  const handleToggleEnabled = async () => {
    if (settings?.public_join_enabled) {
      await disablePublicJoin();
    } else {
      await enablePublicJoin();
    }
  };

  const handleToggleApproval = async () => {
    await updateSettings({
      public_join_approval_required: !settings?.public_join_approval_required,
    });
  };

  const handleRegenerateCode = async () => {
    await regenerateCode();
  };

  const handleUpdateClientLimit = async (value: number | string) => {
    const numValue = typeof value === 'string' ? parseInt(value, 10) : value;
    await updateSettings({
      public_join_client_limit: isNaN(numValue) ? null : numValue,
    });
  };

  const handleClearClientLimit = async () => {
    await updateSettings({
      public_join_client_limit: null,
    });
  };

  if (isLoading) {
    return (
      <Paper
        className={classes.container}
        p="md"
        radius="md"
        withBorder
      >
        <Group
          justify="center"
          py="xl"
        >
          <Loader size="sm" />
          <Text
            c="dimmed"
            size="sm"
          >
            Loading settings...
          </Text>
        </Group>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper
        className={classes.container}
        p="md"
        radius="md"
        withBorder
      >
        <Alert
          color="red"
          icon={<IconAlertCircle size={16} />}
          title="Error loading settings"
        >
          Could not load your settings. Please try again later.
        </Alert>
      </Paper>
    );
  }

  const isToggling = isEnabling || isDisabling;
  const joinUrl = settings?.public_join_url || '';

  return (
    <Paper
      className={classes.container}
      p="md"
      radius="md"
      withBorder
    >
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between">
          <Group gap="xs">
            <IconLink size={20} />
            <Text
              fw={600}
              size="lg"
            >
              Public Join Link
            </Text>
          </Group>
          <Badge
            color={settings?.public_join_enabled ? 'green' : 'gray'}
            variant="light"
          >
            {settings?.public_join_enabled ? 'Active' : 'Inactive'}
          </Badge>
        </Group>

        <Text
          c="dimmed"
          size="sm"
        >
          Allow anyone with your link to request to join your coaching practice.
        </Text>

        <Divider />

        {/* Enable/Disable Toggle */}
        <Group justify="space-between">
          <Box>
            <Text
              fw={500}
              size="sm"
            >
              Enable Public Join
            </Text>
            <Text
              c="dimmed"
              size="xs"
            >
              When enabled, clients can sign up using your public link
            </Text>
          </Box>
          <Switch
            checked={settings?.public_join_enabled ?? false}
            disabled={isToggling}
            onChange={handleToggleEnabled}
            size="md"
          />
        </Group>

        {/* Join Link Section - Only show when enabled */}
        {settings?.public_join_enabled && (
          <>
            <Divider />

            {/* Join URL */}
            <Box>
              <Text
                fw={500}
                mb="xs"
                size="sm"
              >
                Your Join Link
              </Text>
              <Group gap="xs">
                <TextInput
                  className={classes.urlInput}
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
                    <Tooltip
                      label={copied ? 'Copied!' : 'Copy link'}
                      withArrow
                    >
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
                <Tooltip
                  label="Open in new tab"
                  withArrow
                >
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
            </Box>

            {/* Regenerate Code */}
            <Group gap="xs">
              <Button
                leftSection={<IconRefresh size={16} />}
                loading={isRegenerating}
                onClick={handleRegenerateCode}
                size="xs"
                variant="subtle"
              >
                Generate New Link
              </Button>
              <Text
                c="dimmed"
                size="xs"
              >
                This will invalidate your current link
              </Text>
            </Group>

            <Divider />

            {/* Approval Required Toggle */}
            <Group justify="space-between">
              <Group gap="xs">
                <IconShieldCheck
                  className={classes.settingIcon}
                  size={18}
                />
                <Box>
                  <Text
                    fw={500}
                    size="sm"
                  >
                    Require Approval
                  </Text>
                  <Text
                    c="dimmed"
                    size="xs"
                  >
                    Review and approve new clients before they can access your services
                  </Text>
                </Box>
              </Group>
              <Switch
                checked={settings?.public_join_approval_required ?? true}
                disabled={isUpdating}
                onChange={handleToggleApproval}
                size="md"
              />
            </Group>

            {!settings?.public_join_approval_required && (
              <Alert
                color="yellow"
                icon={<IconAlertCircle size={16} />}
                variant="light"
              >
                <Text size="xs">Anyone with your link can immediately become your client without your approval.</Text>
              </Alert>
            )}

            <Divider />

            {/* Client Limit */}
            <Group
              align="flex-start"
              justify="space-between"
            >
              <Group gap="xs">
                <IconUsers
                  className={classes.settingIcon}
                  size={18}
                />
                <Box>
                  <Text
                    fw={500}
                    size="sm"
                  >
                    Client Limit
                  </Text>
                  <Text
                    c="dimmed"
                    size="xs"
                  >
                    Maximum clients who can join via this link (leave empty for unlimited)
                  </Text>
                </Box>
              </Group>
              <Group gap="xs">
                <NumberInput
                  disabled={isUpdating}
                  min={1}
                  onBlur={(e) => handleUpdateClientLimit(e.target.value)}
                  placeholder="Unlimited"
                  size="xs"
                  style={{width: 100}}
                  value={settings?.public_join_client_limit ?? ''}
                />
                {settings?.public_join_client_limit && (
                  <Button
                    color="gray"
                    disabled={isUpdating}
                    onClick={handleClearClientLimit}
                    size="xs"
                    variant="subtle"
                  >
                    Clear
                  </Button>
                )}
              </Group>
            </Group>
          </>
        )}
      </Stack>
    </Paper>
  );
}
