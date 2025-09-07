import PagePaper from "@/Components/Containers/PagePaper";
import ProfileEditHeader from "./Header";
import PaddingContainer from "@/Components/Containers/PaddingContainer";
import {
  Button,
  Group,
  TextInput,
  Stack,
  Avatar,
  FileButton,
  Text,
  Alert,
  LoadingOverlay,
  Box,
} from "@mantine/core";
import { useForm, zodResolver } from "@mantine/form";
import { useState } from "react";
import { useNavigate } from "react-router";
import { notifications } from "@mantine/notifications";
import { IconAlertCircle, IconCheck, IconCamera } from "@tabler/icons-react";
import { z } from "zod";

// Form validation schema
const editProfileSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters"),
  email: z.string().email("Please enter a valid email address"),
});

type EditProfileFormData = z.infer<typeof editProfileSchema>;

const EditProfilePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // TODO: Replace with actual user data from API/context
  const getCurrentUserData = () => {
    return {
      name: "Coffeestories",
      email: "mark.brook@icloud.com",
      avatar: null, // URL to current avatar or null
    };
  };

  const userData = getCurrentUserData();

  const form = useForm<EditProfileFormData>({
    validate: zodResolver(editProfileSchema),
    initialValues: {
      name: userData.name,
      email: userData.email,
    },
  });

  const handleAvatarChange = (file: File | null) => {
    setAvatarFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setAvatarPreview(null);
    }
  };

  const handleSubmit = async (values: EditProfileFormData) => {
    setLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual API call
      // const formData = new FormData();
      // formData.append('name', values.name);
      // formData.append('email', values.email);
      // if (avatarFile) {
      //   formData.append('avatar', avatarFile);
      // }

      // const response = await updateUserProfile(formData);

      // Simulate API call with the form values
      console.log(
        "Updating profile with:",
        values,
        avatarFile ? "with new avatar" : "no avatar change"
      );
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Show success notification
      notifications.show({
        title: "Profile Updated",
        message: "Your profile has been successfully updated.",
        color: "green",
        icon: <IconCheck size={16} />,
        autoClose: 3000,
      });

      // Navigate back to profile
      navigate("/profile");
    } catch (err) {
      console.error("Failed to update profile:", err);
      setError("Failed to update profile. Please try again.");

      notifications.show({
        title: "Update Failed",
        message: "There was an error updating your profile. Please try again.",
        color: "red",
        icon: <IconAlertCircle size={16} />,
        autoClose: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Check if form has changes
    const hasChanges =
      form.values.name !== userData.name ||
      form.values.email !== userData.email ||
      avatarFile !== null;

    if (hasChanges) {
      // TODO: Show confirmation dialog
      if (window.confirm("Are you sure you want to discard your changes?")) {
        navigate(-1);
      }
    } else {
      navigate(-1);
    }
  };

  const resetForm = () => {
    form.setValues({
      name: userData.name,
      email: userData.email,
    });
    setAvatarFile(null);
    setAvatarPreview(null);
    setError(null);
  };

  return (
    <PagePaper>
      <ProfileEditHeader />
      <PaddingContainer>
        <Box pos="relative">
          <LoadingOverlay visible={loading} />

          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="lg">
              {/* Avatar Section */}
              <Stack gap="sm" align="center">
                <Box pos="relative">
                  <Avatar
                    src={avatarPreview || userData.avatar}
                    alt={userData.name}
                    size={100}
                    radius={50}
                  />
                  <FileButton
                    onChange={handleAvatarChange}
                    accept="image/png,image/jpeg,image/jpg"
                  >
                    {(props) => (
                      <Button
                        {...props}
                        size="xs"
                        radius="xl"
                        variant="filled"
                        color="blue"
                        pos="absolute"
                        bottom={0}
                        right={0}
                        style={{
                          minWidth: "auto",
                          width: 32,
                          height: 32,
                          padding: 0,
                        }}
                      >
                        <IconCamera size={16} />
                      </Button>
                    )}
                  </FileButton>
                </Box>
                <Text size="xs" c="dimmed" ta="center">
                  Click the camera icon to change your profile picture
                  <br />
                  (JPG, PNG up to 5MB)
                </Text>
              </Stack>

              {/* Error Alert */}
              {error && (
                <Alert
                  color="red"
                  icon={<IconAlertCircle size={16} />}
                  onClose={() => setError(null)}
                  withCloseButton
                >
                  {error}
                </Alert>
              )}

              {/* Form Fields */}
              <Stack gap="md">
                <TextInput
                  label="Full Name"
                  placeholder="Enter your full name"
                  required
                  size="md"
                  {...form.getInputProps("name")}
                />

                <TextInput
                  label="Email Address"
                  placeholder="Enter your email address"
                  required
                  size="md"
                  type="email"
                  {...form.getInputProps("email")}
                />
              </Stack>

              {/* Action Buttons */}
              <Group justify="space-between" mt="xl">
                <Button
                  variant="subtle"
                  color="gray"
                  onClick={resetForm}
                  disabled={loading}
                >
                  Reset
                </Button>

                <Group gap="sm">
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    loading={loading}
                    disabled={!form.isValid() && form.isTouched()}
                  >
                    Save Changes
                  </Button>
                </Group>
              </Group>
            </Stack>
          </form>
        </Box>
      </PaddingContainer>
    </PagePaper>
  );
};

export default EditProfilePage;
