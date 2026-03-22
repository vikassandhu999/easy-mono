import {ActionIcon, Box, Group, Modal, Title} from '@mantine/core';
import {IconArrowLeft} from '@tabler/icons-react';
import React from 'react';

import useScreenSize from '@/hooks/useScreenSize';

type AutoDrawerProps = {
  title: React.ReactNode | string;
  content: React.ReactNode;
  actions?: React.ReactNode;
  fullScreen?: boolean;
  onClose: () => void;
};

const Header = ({onClose, title, actions}: AutoDrawerProps) => {
  const BackElement = (
    <ActionIcon
      color="dark"
      onClick={onClose}
      radius="lg"
      size={'xl'}
      style={{cursor: 'pointer', flexShrink: 0}}
      variant="subtle"
    >
      <IconArrowLeft size={32} />
    </ActionIcon>
  );

  const TitleElement =
    typeof title === 'string' ? (
      <Title
        lineClamp={1}
        order={4}
        style={{overflow: 'hidden', textOverflow: 'ellipsis'}}
      >
        {title}
      </Title>
    ) : (
      <Box
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          flex: 1,
          minWidth: 0,
        }}
      >
        {title}
      </Box>
    );

  const ActionElements = actions && <Box style={{flexShrink: 0, marginLeft: 'auto'}}>{actions}</Box>;

  return (
    <Box
      bg="white"
      px="sm"
      py="sm"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 1,
        borderBottom: '1px solid var(--ce-stroke-weak)',
      }}
    >
      <Group
        align="center"
        gap="sm"
        justify="space-between"
        w="100%"
        wrap="wrap"
      >
        <Group
          align="center"
          gap="xs"
          style={{flex: '1 1 auto', minWidth: 0}}
        >
          {BackElement}
          {TitleElement}
          {ActionElements}
        </Group>
      </Group>
    </Box>
  );
};

const AutoDrawer = (props: AutoDrawerProps) => {
  const {content, onClose} = props;
  const {isMobile, isTab} = useScreenSize();
  const isMobileOrTab = isMobile || isTab;

  const finalContent = (
    <Box w={'100%'}>
      <Header {...props} />
      <Box
        mah="100vh"
        maw={'100%'}
        w={'100%'}
      >
        <Box p="md">{content}</Box>
      </Box>
    </Box>
  );

  if (isMobileOrTab) {
    return (
      <Modal
        centered
        fullScreen
        onClose={onClose}
        opened={true}
        radius="lg"
        style={{
          position: 'relative',
        }}
        styles={{
          body: {
            padding: 0,
          },
        }}
        withCloseButton={false}
      >
        {finalContent}
      </Modal>
    );
  }

  return (
    <Modal
      centered
      fullScreen={props.fullScreen}
      onClose={onClose}
      opened={true}
      radius="lg"
      size="lg"
      style={{
        position: 'relative',
      }}
      styles={{
        body: {
          padding: 0,
        },
      }}
      withCloseButton={false}
    >
      {finalContent}
    </Modal>
  );
};

export default AutoDrawer;
