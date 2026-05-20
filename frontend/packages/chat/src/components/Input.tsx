import {ActionIcon, Transition} from '@mantine/core';
import {CLEAR_EDITOR_COMMAND, LexicalEditor} from 'lexical';
import React, {ReactNode, useCallback, useEffect, useRef, useState} from 'react';
import {RichTextEditor} from '../rich-text';
import {MessageContent} from '../types';

export type InputBarProps = {
  sendMessage: (content: MessageContent) => Promise<void>;
  sendIcon: ReactNode;
  onTypingStarted: () => void;
  onTypingStopped: () => void;
};

const Input = function InputBar({sendMessage, sendIcon, onTypingStarted, onTypingStopped}: InputBarProps) {
  const [isSending, setIsSending] = useState(false);
  const [isDisabled, setIsDisabled] = useState(true);
  const editorRef = useRef<LexicalEditor | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>();
  const [currentText, setCurrentText] = useState('');

  // Optimized send handler with better error handling
  const handleSend = useCallback(async () => {
    const textValue = currentText.trim();
    if (textValue === '' || isSending) {
      return;
    }

    try {
      setIsSending(true);
      onTypingStopped();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      await sendMessage({content: textValue});

      // Clear editor only after successful send
      editorRef.current?.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined);
      setCurrentText('');
      setIsDisabled(true);

      // Auto-focus for better UX on mobile
      setTimeout(() => {
        editorRef.current?.focus();
      }, 100);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Keep the text in case user wants to retry
    } finally {
      setIsSending(false);
    }
  }, [currentText, isSending, onTypingStopped, sendMessage]);

  // Enhanced update handler with improved typing indicators
  const handleUpdate = useCallback(
    (content: MessageContent) => {
      const newText = content.content;
      setCurrentText(newText);
      setIsDisabled(newText.trim() === '');

      // Debounced typing indicators
      if (!typingTimeoutRef.current && newText.trim() !== '') {
        onTypingStarted();
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        onTypingStopped();
        typingTimeoutRef.current = undefined;
      }, 1000);
    },
    [onTypingStarted, onTypingStopped],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <RichTextEditor
      onSetup={(lexical) => {
        editorRef.current = lexical;
      }}
      onUpdate={handleUpdate}
      onSend={handleSend}
    >
      <Transition
        mounted={!isDisabled}
        transition="scale"
        duration={200}
      >
        {(styles) => (
          <ActionIcon
            onClick={handleSend}
            disabled={isDisabled || isSending}
            loading={isSending}
            variant="filled"
            color="blue"
            size="md"
            radius="xl"
            aria-label="Send message"
            style={{
              minWidth: '36px',
              minHeight: '36px',
              ...styles,
            }}
          >
            {sendIcon}
          </ActionIcon>
        )}
      </Transition>
    </RichTextEditor>
  );
};

export default Input;
