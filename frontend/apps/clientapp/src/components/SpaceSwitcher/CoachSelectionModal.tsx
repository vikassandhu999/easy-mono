import React from 'react';
import {
  Modal,
  Group,
  Text,
  Avatar,
  UnstyledButton,
  Stack,
  Badge,
  Loader,
  Center,
  Alert,
} from '@mantine/core';
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { ClientCoachesAPI, Coach } from '@/api/ClientCoaches';
import { notifications } from '@mantine/notifications';

interface CoachSelectionModalProps {
  opened: boolean;
  onClose: () => void;
  currentCoachId?: string;
  onCoachSelect: (coach: Coach) => void;
}

interface CoachItemProps {
  coach: Coach;
  isSelected: boolean;
  onSelect: (coach: Coach) => void;
}

const CoachItem: React.FC<CoachItemProps> = ({ coach, isSelected, onSelect }) => {
  return (
    <UnstyledButton
      onClick={() => onSelect(coach)}
      p="md"
      style={(theme) => ({
        display: 'block',
        width: '100%',
        borderRadius: theme.radius.md,
        border: `1px solid ${isSelected ? theme.colors.blue[6] : theme.colors.gray[3]}`,
        backgroundColor: isSelected ? theme.colors.blue[0] : 'white',
        transition: 'all 0.2s ease',
        '&:hover': {
          backgroundColor: isSelected ? theme.colors.blue[1] : theme.colors.gray[0],
        },
      })}
    >
      <Group justify="space-between">
        <Group>
          <Avatar 
            src={coach.business_avatar} 
            size={50} 
            radius="xl"
          >
            {coach.name.substring(0, 2).toUpperCase()}
          </Avatar>
          
          <div>
            <Text fw={500} size="sm">
              {coach.business_name}
            </Text>
            <Text size="xs" c="dimmed">
              Coach: {coach.name}
            </Text>
            {coach.specialization && (
              <Badge size="xs" variant="light" mt={4}>
                {coach.specialization}
              </Badge>
            )}
          </div>
        </Group>
        
        {isSelected && (
          <IconCheck size={20} color="var(--mantine-color-blue-6)" />
        )}
      </Group>
      
      {coach.bio && (
        <Text size="xs" c="dimmed" mt="xs" lineClamp={2}>
          {coach.bio}
        </Text>
      )}
    </UnstyledButton>
  );
};

const CoachSelectionModal: React.FC<CoachSelectionModalProps> = ({
  opened,
  onClose,
  currentCoachId,
  onCoachSelect,
}) => {
  const {
    data: coaches,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['client-coaches'],
    queryFn: async () => {
      const result = await ClientCoachesAPI.getCoaches();
      if (result.isError) {
        throw new Error(result.getError().message || 'Failed to load coaches');
      }
      return result.getValue();
    },
    enabled: opened, // Only fetch when modal is opened
  });

  const handleCoachSelect = (coach: Coach) => {
    onCoachSelect(coach);
    
    notifications.show({
      title: 'Space Switched!',
      message: `You're now in ${coach.business_name} with coach ${coach.name}`,
      color: 'green',
      icon: <IconCheck size={16} />,
    });
    
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Text fw={600} size="lg">
          Switch Your Space
        </Text>
      }
      size="md"
      centered
      padding="lg"
    >
      {isLoading && (
        <Center py="xl">
          <Loader size="lg" />
          <Text ml="md" c="dimmed">
            Loading your coaches...
          </Text>
        </Center>
      )}

      {error && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Failed to load coaches"
          color="red"
        >
          <Text size="sm">
            {error instanceof Error ? error.message : 'Something went wrong'}
          </Text>
        </Alert>
      )}

      {coaches && coaches.length === 0 && (
        <Center py="xl">
          <Text c="dimmed">No coaches available</Text>
        </Center>
      )}

      {coaches && coaches.length > 0 && (
        <Stack gap="sm">
          <Text size="sm" c="dimmed" mb="sm">
            Select a coach to switch to their space:
          </Text>
          
          {coaches.map((coach) => (
            <CoachItem
              key={coach.id}
              coach={coach}
              isSelected={currentCoachId === coach.id}
              onSelect={handleCoachSelect}
            />
          ))}
        </Stack>
      )}
    </Modal>
  );
};

export default CoachSelectionModal;
