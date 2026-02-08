import { humanizeError } from "@easy/error-parser";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  FieldError,
  Input,
  Label,
  Modal,
  Spinner,
  Surface,
  TextArea,
  TextField,
} from "@heroui/react";
import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";

import useParamsDrawer from "@/hooks/useParamDrawer";
import {
  CoachProfileForm_zod,
  CoachProfileFormValues,
  useGetMyCoachQuery,
  useUpdateMyCoachMutation,
} from "@/services/coach";
import { notifyError, notifySuccess } from "@/utils/notification";

const MAX_BIO_WORDS = 200;

const countWords = (text: string): number => {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
};

const CoachProfileEditDrawer = () => {
  const { closeDrawer } = useParamsDrawer({});

  const { data: coach, isLoading: isLoadingCoach } = useGetMyCoachQuery();
  const [updateCoach, { isLoading: isUpdating }] = useUpdateMyCoachMutation();

  const { control, handleSubmit, reset, watch } =
    useForm<CoachProfileFormValues>({
      defaultValues: {
        name: "",
        title: "",
        bio: "",
      },
      resolver: zodResolver(CoachProfileForm_zod),
    });

  const bioValue = watch("bio");
  const wordCount = useMemo(() => countWords(bioValue || ""), [bioValue]);
  const isOverWordLimit = wordCount > MAX_BIO_WORDS;

  useEffect(() => {
    if (coach) {
      reset({
        name: coach.name || "",
        title: coach.title || "",
        bio: coach.bio || "",
      });
    }
  }, [coach, reset]);

  const handleFormSubmit = async (values: CoachProfileFormValues) => {
    try {
      const payload = {
        name: values.name,
        title: values.title === "" ? undefined : (values.title ?? undefined),
        bio: values.bio === "" ? undefined : (values.bio ?? undefined),
      };

      await updateCoach(payload).unwrap();
      notifySuccess("Profile updated successfully");
      closeDrawer();
    } catch (error) {
      const errMsg = humanizeError(error);
      notifyError(errMsg);
    }
  };

  if (isLoadingCoach) {
    return (
      <Modal>
        <Modal.Backdrop isDismissable isOpen onOpenChange={() => closeDrawer()}>
          <Modal.Container placement="top" scroll="outside" size="lg">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading className="text-xl font-semibold">
                  Edit Profile
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <div className="flex flex-col items-center justify-center gap-3 py-8">
                  <Spinner />
                  <p className="text-sm text-default-500">Loading profile...</p>
                </div>
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    );
  }

  if (!coach) {
    return (
      <Modal>
        <Modal.Backdrop isDismissable isOpen onOpenChange={() => closeDrawer()}>
          <Modal.Container placement="top" scroll="outside" size="lg">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading className="text-xl font-semibold">
                  Edit Profile
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className="text-sm text-danger-600 py-4">
                  Profile not found
                </p>
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    );
  }

  return (
    <Modal>
      <Modal.Backdrop isDismissable isOpen onOpenChange={() => closeDrawer()}>
        <Modal.Container placement="top" scroll="outside" size="lg">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading className="text-xl font-semibold">
                Edit Profile
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="p-1">
              <Surface variant="default">
                <form
                  className="flex flex-col gap-6 p-4"
                  onSubmit={handleSubmit(handleFormSubmit)}
                >
                  {/* Name */}
                  <Controller
                    control={control}
                    name="name"
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        isInvalid={fieldState.invalid}
                        isRequired
                      >
                        <Label className="text-sm font-medium">Full Name</Label>
                        <Input placeholder="e.g., Rahul Sharma" />
                        {fieldState.error?.message && (
                          <FieldError>{fieldState.error.message}</FieldError>
                        )}
                      </TextField>
                    )}
                  />

                  {/* Title */}
                  <Controller
                    control={control}
                    name="title"
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        isInvalid={fieldState.invalid}
                        value={field.value ?? ""}
                      >
                        <Label className="text-sm font-medium">Title</Label>
                        <Input placeholder="e.g., Certified Fitness Coach" />
                        {fieldState.error?.message && (
                          <FieldError>{fieldState.error.message}</FieldError>
                        )}
                      </TextField>
                    )}
                  />

                  {/* Bio */}
                  <Controller
                    control={control}
                    name="bio"
                    render={({ field, fieldState }) => (
                      <div className="flex flex-col gap-1">
                        <TextField
                          {...field}
                          isInvalid={fieldState.invalid}
                          value={field.value ?? ""}
                        >
                          <Label className="text-sm font-medium">Bio</Label>
                          <TextArea
                            placeholder="Tell your clients about yourself and your coaching style..."
                            rows={4}
                          />
                          {fieldState.error?.message && (
                            <FieldError>{fieldState.error.message}</FieldError>
                          )}
                        </TextField>
                        <p
                          className={`text-xs text-right ${isOverWordLimit ? "text-danger-600" : "text-default-400"}`}
                        >
                          {wordCount} / {MAX_BIO_WORDS} words
                        </p>
                      </div>
                    )}
                  />
                </form>
              </Surface>
            </Modal.Body>
            <Modal.Footer>
              <Button slot="close" variant="secondary">
                Cancel
              </Button>
              <Button
                isDisabled={isUpdating || isOverWordLimit}
                onPress={() => handleSubmit(handleFormSubmit)()}
              >
                {isUpdating ? "Saving..." : "Save"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default CoachProfileEditDrawer;
