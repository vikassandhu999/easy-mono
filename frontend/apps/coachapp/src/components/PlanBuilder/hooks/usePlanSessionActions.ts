import { notifications } from "@mantine/notifications";
import { useCallback } from "react";

import type {
  CreatePlanSessionInput,
  PlanSession,
  useCreatePlanSessionMutation,
  useDeletePlanSessionMutation,
  useUpdatePlanSessionMutation,
} from "@/store/services/plan_sessions";

import { SESSION_TYPE_CONFIG } from "../sessionTypes";

type CreateMutation = ReturnType<typeof useCreatePlanSessionMutation>[0];
type UpdateMutation = ReturnType<typeof useUpdatePlanSessionMutation>[0];
type DeleteMutation = ReturnType<typeof useDeletePlanSessionMutation>[0];

interface UsePlanSessionActionsParams {
  createPlanSession: CreateMutation;
  deletePlanSession: DeleteMutation;
  planId: string;
  sessions: PlanSession[];
  updatePlanSession: UpdateMutation;
}

function getSessionTypeLabel(sessionType?: "meal" | "workout" | null): string {
  if (!sessionType) return "Session";
  return SESSION_TYPE_CONFIG[sessionType]?.label ?? "Session";
}

export function usePlanSessionActions({
  createPlanSession,
  deletePlanSession,
  planId,
  sessions,
  updatePlanSession,
}: UsePlanSessionActionsParams) {
  const handleCreatePlanSession = useCallback(
    async (
      payload: CreatePlanSessionInput,
      sessionType?: "meal" | "workout"
    ) => {
      try {
        await createPlanSession({ planId, data: payload }).unwrap();
        notifications.show({
          color: "green",
          message: `${getSessionTypeLabel(sessionType)} added successfully`,
          title: "Success",
        });
        return true;
      } catch (error) {
        notifications.show({
          color: "red",
          message:
            error instanceof Error ? error.message : "Failed to add session",
          title: "Error",
        });
        return false;
      }
    },
    [createPlanSession, planId]
  );

  const handleDeletePlanSession = useCallback(
    async (planSessionId: string) => {
      try {
        await deletePlanSession({ planId, planSessionId }).unwrap();
        notifications.show({
          color: "green",
          message: "Session removed",
          title: "Success",
        });
        return true;
      } catch (error) {
        notifications.show({
          color: "red",
          message:
            error instanceof Error ? error.message : "Failed to remove session",
          title: "Error",
        });
        return false;
      }
    },
    [deletePlanSession, planId]
  );

  const handleUpdateLabel = useCallback(
    async (oldLabel: string, newLabel: string, dayOfWeek: number) => {
      const sessionsToUpdate = sessions.filter(
        (s) =>
          s.day_of_week === dayOfWeek &&
          s.label?.toLowerCase() === oldLabel.toLowerCase()
      );

      if (sessionsToUpdate.length === 0) return;

      try {
        await Promise.all(
          sessionsToUpdate.map((session) =>
            updatePlanSession({
              planId,
              planSessionId: session.id,
              data: { label: newLabel.toLowerCase() },
            }).unwrap()
          )
        );

        notifications.show({
          color: "green",
          message: `Updated ${sessionsToUpdate.length} session(s)`,
          title: "Label updated",
        });
      } catch (error) {
        notifications.show({
          color: "red",
          message:
            error instanceof Error ? error.message : "Failed to update label",
          title: "Error",
        });
      }
    },
    [planId, sessions, updatePlanSession]
  );

  const handleDeleteLabel = useCallback(
    async (label: string, dayOfWeek: number) => {
      const sessionsToDelete = sessions.filter(
        (s) =>
          s.day_of_week === dayOfWeek &&
          s.label?.toLowerCase() === label.toLowerCase()
      );

      if (sessionsToDelete.length === 0) return;

      try {
        await Promise.all(
          sessionsToDelete.map((session) =>
            deletePlanSession({
              planId,
              planSessionId: session.id,
            }).unwrap()
          )
        );

        notifications.show({
          color: "green",
          message: `Removed ${sessionsToDelete.length} session(s)`,
          title: "Label deleted",
        });
      } catch (error) {
        notifications.show({
          color: "red",
          message:
            error instanceof Error ? error.message : "Failed to delete label",
          title: "Error",
        });
      }
    },
    [deletePlanSession, planId, sessions]
  );

  return {
    handleCreatePlanSession,
    handleDeleteLabel,
    handleDeletePlanSession,
    handleUpdateLabel,
  };
}
