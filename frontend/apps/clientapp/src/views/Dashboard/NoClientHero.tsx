
import { Badge, Box, Button, Card, rem, Stack, Text, Group, ActionIcon, CopyButton, Tooltip } from "@mantine/core";
import {  IconMail, IconCopy, IconCheck } from "@tabler/icons-react";
import dayjs from "dayjs";

const getCurrentDate = () => {
  return dayjs().format("dddd, D MMM");
};

const NoClientHero = () => {
  // Mock user email for demonstration - in real app this would come from auth context
  const userEmail = "client@example.com";

  return (
    <Card
      radius="xl"
      p="md"
      style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "white",
        position: "relative",
        overflow: "hidden",
        width : "100%",
        maxWidth: 480
      }}
    >
      <Box
        style={{
          position: "absolute",
          right: -20,
          top: -20,
          fontSize: rem(120),
          opacity: 0.3,
          transform: "rotate(-15deg)",
        }}
      >
        🤝
      </Box>
      
      <Stack gap="md" style={{ position: "relative", zIndex: 2 }}>
        <Badge
          size="sm"
          radius="md"
          style={{
            background: "rgba(255,255,255,0.2)",
            color: "white",
            width: "fit-content",
          }}
        >
          {getCurrentDate()}
        </Badge>

        <Text size="xl" fw={700}>
          Welcome to Coach Easy!
        </Text>
        <Text size="xl" fw={700} mt={-10}>
          You Need an Invitation
        </Text>
        
        <Text
          size="sm"
          mt="xs"
          style={{ opacity: 0.9, maxWidth: rem(320) }}
        >
          To get started, you need to be invited by a coach. Ask your coach to send you an invitation using your email address below:
        </Text>

        <Card
          radius="md"
          p="sm"
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.2)",
            marginTop: rem(8),
          }}
        >
          <Group justify="space-between" align="center">
            <Text size="sm" c="white" fw={500} style={{ opacity: 0.9 }}>
              Email:
            </Text>
            <Group gap="xs">
              <Text size="sm" c="gray" fw={600}>
                {userEmail}
              </Text>
              <CopyButton value={userEmail}>
                {({ copied, copy }) => (
                  <Tooltip label={copied ? 'Copied!' : 'Copy email'}>
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      onClick={copy}
                      c="gray"
                    >
                      {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                    </ActionIcon>
                  </Tooltip>
                )}
              </CopyButton>
            </Group>
          </Group>
        </Card>

        <Box
          p="sm"
          style={{
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: rem(8),
            marginTop: rem(8),
          }}
        >
          <Text size="xs" style={{ opacity: 0.8, textAlign: "center" }}>
            💡 <strong>How it works:</strong> Share your email with your coach → They send an invitation → You get full access to personalized programs and schedules
          </Text>
        </Box>

        <Group gap="sm" mt="md">
   
          <Button
            variant="subtle"
            size="md"
            radius="xl"
            fw={600}
            style={{
              color: "white",
              borderColor: "rgba(255,255,255,0.3)",
              border: "1px solid rgba(255,255,255,0.3)",
              flex: 1,
            }}
            leftSection={<IconMail size={18} />}
            onClick={() => {
              // You can add logic here to open email client or show contact info
              window.location.href = `mailto:support@coacheasy.com?subject=Need Help Finding a Coach&body=Hi, I need help finding a coach. My email is: ${userEmail}`;
            }}
          >
            Ask our team for help
          </Button>
         
        </Group>
      </Stack>
    </Card>
  );
};

export default NoClientHero;