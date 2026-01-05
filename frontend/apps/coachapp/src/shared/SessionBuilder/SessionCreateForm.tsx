import {zodResolver} from '@hookform/resolvers/zod';
import {Button, Group, Stack} from '@mantine/core';
import {useEffect, useMemo, useState} from 'react';
import {useForm} from 'react-hook-form';

import {Content} from '@/services/contents';
import {Session, SessionType} from '@/services/session';

import MealForm from './forms/MealForm';
import WorkoutForm from './forms/WorkoutForm';
import {SessionFormSchema, SessionFormValues, sessionToFormValues} from './sessionForm';

interface SessionCreateFormProps {
  defaultSessionType: SessionType;
  initialSession?: Session;
  isSubmitting?: boolean;
  onSubmit: (values: SessionFormValues, action?: 'close' | 'continue') => Promise<void>;
  showSaveOptions?: boolean;
  submitLabel?: string;
}

/**
 * SessionCreateForm - Generic session builder component
 *
 * Renders the appropriate form based on session type:
 * - WorkoutForm for workout sessions
 * - MealForm for meal sessions
 *
 * Manages form state, content map, and form submission.
 */
export default function SessionCreateForm({
  defaultSessionType,
  initialSession,
  isSubmitting,
  onSubmit,
  showSaveOptions = false,
  submitLabel = 'Create Session',
}: SessionCreateFormProps) {
  // Store content details in a map: contentId -> Content
  const [contentsMap, setContentsMap] = useState<Record<string, Content>>(() => {
    // Initialize contents map from initial session if available
    const initialContentsMap: Record<string, Content> = {};
    if (initialSession?.contents) {
      initialSession.contents.forEach((content) => {
        initialContentsMap[content.id] = content as Content;
      });
    }
    return initialContentsMap;
  });

  const defaultValues = useMemo<SessionFormValues>(() => {
    return sessionToFormValues(initialSession, defaultSessionType);
  }, [defaultSessionType, initialSession]);

  const form = useForm<SessionFormValues>({
    defaultValues,
    resolver: zodResolver(SessionFormSchema),
  });

  const {handleSubmit, reset, watch} = form;

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  // Watch session type to determine which form to render
  const effectiveSessionType = watch('session_type') || defaultSessionType;

  const handleFormSubmit = async (values: SessionFormValues, action: 'close' | 'continue' = 'close') => {
    await onSubmit(values, action);
  };

  return (
    <form
      onSubmit={handleSubmit(
        (values) => handleFormSubmit(values, 'close'),
        (errors) => {
          console.error('Form validation errors:', errors);
        },
      )}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Scrollable content */}
      <Stack
        gap="lg"
        p="lg"
        style={{
          flex: 1,
          overflow: 'auto',
        }}
      >
        {/* Render appropriate form based on session type */}
        {effectiveSessionType === 'workout' && (
          <WorkoutForm
            contentsMap={contentsMap}
            form={form}
            setContentsMap={setContentsMap}
          />
        )}

        {effectiveSessionType === 'meal' && (
          <MealForm
            contentsMap={contentsMap}
            form={form}
            setContentsMap={setContentsMap}
          />
        )}
      </Stack>

      {/* Sticky Submit Button(s) */}
      <Group
        justify="flex-end"
        p="lg"
        style={{
          borderTop: '1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-4))',
          flexShrink: 0,
        }}
      >
        {showSaveOptions ? (
          <>
            <Button
              color="gray"
              loading={isSubmitting}
              onClick={handleSubmit((values) => handleFormSubmit(values, 'continue'))}
              radius="lg"
              size="lg"
              variant="light"
            >
              Save
            </Button>
            <Button
              loading={isSubmitting}
              radius="lg"
              size="lg"
              type="submit"
            >
              Save & Close
            </Button>
          </>
        ) : (
          <Button
            loading={isSubmitting}
            radius="lg"
            size="lg"
            type="submit"
          >
            {submitLabel}
          </Button>
        )}
      </Group>
    </form>
  );
}
