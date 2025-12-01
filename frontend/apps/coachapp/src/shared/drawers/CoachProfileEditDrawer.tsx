import { humanizeError } from "@easy/error-parser";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Group,
  Loader,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

import useParamsDrawer from "@/hooks/useParamDrawer";
import {
  UpdateCoachProfile_zod,
  UpdateCoachProfileRequest,
  useProfileQuery,
  useUpdateCoachProfileMutation,
} from "@/services/auth";
import AutoDrawer from "@/shared/AutoDrawer/AutoDrawer";
import { notifyError, notifySuccess } from "@/utils/notification";

const CoachProfileEditDrawer = () => {
  const { closeDrawer } = useParamsDrawer({});

  const { data: profile, isLoading: isLoadingProfile } = useProfileQuery();
  const [updateProfile, { isLoading: isUpdating }] =
    useUpdateCoachProfileMutation();

  const { control, handleSubmit, reset } = useForm<UpdateCoachProfileRequest>({
    defaultValues: {
      first_name: "",
      last_name: "",
      bio: "",
      specialties: [],
    },
    resolver: zodResolver(UpdateCoachProfile_zod),
  });

  useEffect(() => {
    if (profile) {
      reset({
        first_name: profile.user.first_name || "",
        last_name: profile.user.last_name || "",
        bio: profile.coach?.bio || "",
        specialties: profile.coach?.specialties || [],
      });
    }
  }, [profile, reset]);

  const handleFormSubmit = async (values: UpdateCoachProfileRequest) => {
    try {
      // Clean up empty strings to null for optional fields
      const cleanedValues = {
        ...values,
        bio: values.bio === "" ? null : values.bio,
      };

      await updateProfile(cleanedValues).unwrap();
      closeDrawer();
    } catch (error) {
      const errMsg = humanizeError(error);
      notifyError(errMsg);
    }
  };

  if (isLoadingProfile) {
    return (
      <AutoDrawer
        content={
          <Stack align="center" justify="center" py="xl">
            <Loader size="sm" />
            <Text c="dimmed" size="sm">
              Loading profile...
            </Text>
          </Stack>
        }
        onClose={closeDrawer}
        title="Edit Profile"
      />
    );
  }

  if (!profile) {
    return (
      <AutoDrawer
        content={
          <Text c="red" size="sm">
            Profile not found
          </Text>
        }
        onClose={closeDrawer}
        title="Edit Profile"
      />
    );
  }

  return (
    <AutoDrawer
      actions={
        <Group w="100%">
          <Button
            color="blue"
            flex={1}
            loading={isUpdating}
            onClick={handleSubmit(handleFormSubmit)}
            radius="xl"
            size="sm"
            variant="filled"
          >
            Save Changes
          </Button>
        </Group>
      }
      content={
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <Stack gap="lg">
            {/* Personal Info Section */}
            <Stack gap="xs">
              <Text c="dimmed" fw={600} size="xs" tt="uppercase">
                Personal Information
              </Text>

              <Controller
                control={control}
                name="first_name"
                render={({ field, fieldState }) => (
                  <TextInput
                    {...field}
                    error={fieldState.error?.message}
                    label="First Name"
                    placeholder="e.g., Rahul"
                    required
                  />
                )}
              />

              <Controller
                control={control}
                name="last_name"
                render={({ field, fieldState }) => (
                  <TextInput
                    {...field}
                    error={fieldState.error?.message}
                    label="Last Name"
                    placeholder="e.g., Sharma"
                    required
                  />
                )}
              />

              <TextInput
                description="Email cannot be changed"
                disabled
                label="Email"
                value={profile.user.email}
              />
            </Stack>

            {/* Coach Info Section */}
            <Stack gap="xs">
              <Text c="dimmed" fw={600} size="xs" tt="uppercase">
                Coach Profile
              </Text>

              <Controller
                control={control}
                name="bio"
                render={({ field, fieldState }) => (
                  <Textarea
                    {...field}
                    description="Tell your clients about yourself and your coaching style"
                    error={fieldState.error?.message}
                    label="Bio"
                    placeholder="e.g., Certified fitness coach with 5+ years of experience specializing in weight training and nutrition..."
                    rows={4}
                    value={field.value || ""}
                  />
                )}
              />
            </Stack>
          </Stack>
        </form>
      }
      onClose={closeDrawer}
      title="Edit Profile"
    />
  );
};

export default CoachProfileEditDrawer;
