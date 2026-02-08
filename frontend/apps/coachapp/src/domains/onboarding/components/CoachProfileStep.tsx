import { humanizeError } from "@easy/error-parser";
import {
  Button,
  FieldError,
  Input,
  Label,
  TextArea,
  TextField,
} from "@heroui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconCheck } from "@tabler/icons-react";
import React from "react";
import { Controller, useForm } from "react-hook-form";

import {
  useGetMyCoachQuery,
  useUpdateMyCoachMutation,
} from "@/services/coach/coach";
import {
  CoachProfileForm_zod,
  type CoachProfileFormValues,
} from "@/services/coach/coach_definition";
import { selectUser } from "@/slices/authSlice";
import { useAppSelector } from "@/store";
import { notifyError } from "@/utils/notification";

interface CoachProfileStepProps {
  onComplete: () => void;
}

/**
 * Onboarding Step 2: Complete coach profile.
 * Fields: name (required), title (optional), bio (optional).
 *
 * Pre-fills name from auth user if available, and from existing coach data.
 */
const CoachProfileStep: React.FC<CoachProfileStepProps> = ({ onComplete }) => {
  const user = useAppSelector(selectUser);
  const { data: coach } = useGetMyCoachQuery();
  const [updateMyCoach] = useUpdateMyCoachMutation();

  // Build default name: prefer coach.name, then fall back to auth user name
  const defaultName =
    coach?.name || (user ? `${user.first_name} ${user.last_name}`.trim() : "");

  const { control, handleSubmit, formState, watch } =
    useForm<CoachProfileFormValues>({
      defaultValues: {
        name: defaultName,
        title: coach?.title ?? "",
        bio: coach?.bio ?? "",
      },
      resolver: zodResolver(CoachProfileForm_zod),
      mode: "onBlur",
    });

  const isSubmitting = formState.isSubmitting;

  // Word counter for bio
  const bioValue = watch("bio");
  const wordCount = React.useMemo(() => {
    if (!bioValue) return 0;
    return bioValue.trim().split(/\s+/).filter(Boolean).length;
  }, [bioValue]);

  const onSubmit = async (values: CoachProfileFormValues) => {
    try {
      await updateMyCoach({
        name: values.name,
        title: values.title || undefined,
        bio: values.bio || undefined,
      }).unwrap();
      onComplete();
    } catch (err) {
      const errMsg = humanizeError(err);
      notifyError(errMsg);
    }
  };

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit(onSubmit)}>
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="mb-1 text-lg font-semibold text-neutral-900">
          Complete your profile
        </h2>
        <p className="mb-6 text-sm text-neutral-500">
          Let your clients know who you are. You can always update this later.
        </p>

        <div className="flex flex-col gap-5">
          {/* Full name */}
          <Controller
            control={control}
            name="name"
            render={({ field, fieldState }) => (
              <TextField {...field} isInvalid={fieldState.invalid} isRequired>
                <Label className="text-sm font-medium">Full name</Label>
                <Input placeholder="Your full name" />
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
                <Input placeholder="e.g. Certified Strength Coach" />
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
              <TextField
                {...field}
                isInvalid={fieldState.invalid}
                value={field.value ?? ""}
              >
                <Label className="text-sm font-medium">Bio</Label>
                <TextArea
                  placeholder="A short introduction about yourself and your coaching approach..."
                  rows={4}
                />
                <div className="mt-1 flex justify-between">
                  {fieldState.error?.message ? (
                    <FieldError>{fieldState.error.message}</FieldError>
                  ) : (
                    <span />
                  )}
                  <span
                    className={`text-xs ${wordCount > 200 ? "text-red-500" : "text-neutral-400"}`}
                  >
                    {wordCount}/200 words
                  </span>
                </div>
              </TextField>
            )}
          />
        </div>
      </div>

      <Button className="w-full" isDisabled={isSubmitting} type="submit">
        Finish setup
        <IconCheck size={18} />
      </Button>
    </form>
  );
};

export default CoachProfileStep;
