import {ActionIcon, Avatar, Badge, Box, Button, Card, Group, Stack, Text, Title} from '@mantine/core';
import {IconBell} from '@tabler/icons-react';

import nutritionPlanImg from '@/assets/images/nutrition-plan.png';
import sportImg from '@/assets/images/sport.png';
import PaddingContainer from '@/shared/containers/PaddingContainer';
import PagePaper from '@/shared/containers/PagePaper';

const user = {
  name: 'Alex',
  timezone: 'local',
};

const todayPlan = {
  workout: {
    title: 'Lower Body Strength',
    subtitle: 'Complete your workout to stay on track',
    count: 6,
  },
  nutrition: {
    title: "Today's Meals",
    subtitle: 'Follow your meal plan for best results',
    count: 4,
  },
};

const greetingByTime = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const HomePage = () => {
  return (
    <PagePaper>
      <PaddingContainer paddingY="xl">
        <Stack gap="xl">
          {/* Header */}
          <Group
            align="center"
            justify="space-between"
          >
            <Group>
              <Avatar
                color="brand"
                radius="xl"
                size="lg"
                variant="outline"
              >
                {user.name[0]}
              </Avatar>
              <Stack gap={4}>
                <Title
                  order={2}
                  size="h5"
                >
                  Hello, {user.name}
                </Title>
                <Text
                  c="dimmed"
                  size="sm"
                >
                  {greetingByTime()}
                </Text>
              </Stack>
            </Group>
            <ActionIcon
              color="brand"
              radius="xl"
              size="xl"
              variant="light"
            >
              <IconBell size={22} />
            </ActionIcon>
          </Group>

          {/* Today's Plan Section */}
          <Stack gap="md">
            <Title order={4}>Today's Plan</Title>

            {/* Workout Card */}
            <Card
              padding="lg"
              radius="lg"
              style={{
                // background: "linear-gradient(135deg, #e6f7f4 0%, #c8efea 100%)",
                border: 'none',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <Group
                align="flex-start"
                justify="space-between"
                wrap="nowrap"
              >
                <Stack
                  gap="xs"
                  style={{flex: 1}}
                >
                  <Title
                    order={3}
                    style={{color: '#145c58'}}
                  >
                    {todayPlan.workout.title}
                  </Title>
                  <Text
                    c="dimmed"
                    size="sm"
                  >
                    {todayPlan.workout.subtitle}
                  </Text>
                  <Button
                    color="green"
                    mt="sm"
                    radius="xl"
                    size="sm"
                    style={{width: 'fit-content'}}
                    variant="light"
                  >
                    Start Workout
                  </Button>
                </Stack>
                <Box
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'flex-end',
                  }}
                >
                  <Badge
                    color="dark"
                    radius="md"
                    size="lg"
                    style={{
                      position: 'absolute',
                      bottom: 60,
                      left: -10,
                      zIndex: 2,
                      padding: '8px 12px',
                    }}
                  >
                    {todayPlan.workout.count}
                  </Badge>
                  <Box
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <img
                      alt="Workout"
                      src={sportImg}
                      style={{width: 52, height: 52, objectFit: 'contain'}}
                    />
                  </Box>
                </Box>
              </Group>
            </Card>

            <Card
              padding="lg"
              radius="lg"
              style={{
                border: 'none',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <Group
                align="flex-start"
                justify="space-between"
                wrap="nowrap"
              >
                <Stack
                  gap="xs"
                  style={{flex: 1}}
                >
                  <Title
                    order={3}
                    style={{color: '#9a4a2a'}}
                  >
                    {todayPlan.nutrition.title}
                  </Title>
                  <Text
                    c="dimmed"
                    size="sm"
                  >
                    {todayPlan.nutrition.subtitle}
                  </Text>
                  <Button
                    color="orange"
                    mt="sm"
                    radius="xl"
                    size="sm"
                    style={{width: 'fit-content'}}
                    variant="light"
                  >
                    View Meals
                  </Button>
                </Stack>
                <Box
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'flex-end',
                  }}
                >
                  <Badge
                    color="dark"
                    radius="md"
                    size="lg"
                    style={{
                      position: 'absolute',
                      bottom: 60,
                      left: -10,
                      zIndex: 2,
                      padding: '8px 12px',
                    }}
                  >
                    {todayPlan.nutrition.count}
                  </Badge>
                  <Box
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <img
                      alt="Nutrition"
                      src={nutritionPlanImg}
                      style={{width: 52, height: 52, objectFit: 'contain'}}
                    />
                  </Box>
                </Box>
              </Group>
            </Card>
          </Stack>
        </Stack>
      </PaddingContainer>
    </PagePaper>
  );
};

export default HomePage;
