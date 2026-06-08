import {ActionIcon, Avatar, Group, Text, Title} from '@mantine/core';
import {IconArrowLeft} from '@tabler/icons-react';
import React, {RefCallback, useContext, useEffect, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {ChatContext} from './ChatProvider';

const ChatHeader = ({headerRef}: {headerRef: RefCallback<HTMLElement>}) => {
  const navigate = useNavigate();
  const context = useContext(ChatContext);
  const {chat, chatApi} = context!;

  const [isTyping, setIsTyping] = useState(false);
  const typingRef = useRef<ReturnType<typeof setTimeout> | undefined>();
  const other = chatApi.getOther(chat);

  useEffect(() => {
    const unstarted = chatApi.onOtherStartedTyping(chat.id, () => {
      setIsTyping(true);
      if (typingRef.current) {
        clearTimeout(typingRef.current);
      }
      typingRef.current = setTimeout(() => {
        setIsTyping(false);
      }, 10000); // Typing indicator timeout
    });

    const unstopped = chatApi.onOtherStoppedTyping(chat.id, () => {
      setIsTyping(false);
      if (typingRef.current) {
        clearTimeout(typingRef.current);
        typingRef.current = undefined;
      }
    });

    return () => {
      unstarted();
      unstopped();
      if (typingRef.current) {
        clearTimeout(typingRef.current);
      }
    };
  }, [chat.id, chatApi]);

  // Mobile-first responsive design with Mantine components
  return (
    <header
      ref={headerRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 12px', // Mobile-first smaller padding
        position: 'sticky',
        top: 0,
        zIndex: 10,
        backgroundColor: 'var(--mantine-color-gray-0)',
        borderBottom: '1px solid var(--mantine-color-gray-3)',
        minHeight: '56px', // Mobile-friendly header height
      }}
    >
      <ActionIcon
        variant="subtle"
        color="gray"
        onClick={() => navigate(-1)}
        aria-label="Go back"
        size="md"
        mr="xs"
      >
        <IconArrowLeft size={18} />
      </ActionIcon>
      <Group
        gap="xs"
        align="center"
        wrap="nowrap"
      >
        <Avatar
          src={`https://i.pravatar.cc/150?u=${other.id}`}
          alt={other.name}
          size="sm"
        />
        <div style={{minWidth: 0, flex: 1}}>
          <Title
            order={3}
            size="sm"
            fw={600}
            mb={1}
            style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {other.name}
          </Title>
          <Text
            size="xs"
            c="dimmed"
            style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {isTyping ? `${other.name} is typing...` : 'Online'}
          </Text>
        </div>
      </Group>
    </header>
  );
};

export default ChatHeader;
