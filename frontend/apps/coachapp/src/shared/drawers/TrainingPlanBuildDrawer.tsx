import { humanizeError } from "@easy/error-parser";
import { ActionIcon, Menu, Modal } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconCopyPlus,
  IconDots,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react";
import { FC } from "react";
import { useSearchParams } from "react-router";

import { DRAWER_KEYS } from "@/configs";
import useParamsDrawer from "@/hooks/useParamDrawer";
import useScreenSize from "@/hooks/useScreenSize";
import {
  useDeleteTrainingPlan,
  useDuplicateTrainingPlan,
  useGetTrainingPlan,
} from "@/services/training_plans";
import AutoDrawer from "@/shared/AutoDrawer/AutoDrawer";
import TrainingPlanBuilder from "@/shared/TrainingPlanBuilder/TrainingPlanBuilder";
import { notifyError } from "@/utils/notification";

type ActionMenuProps = {
  trainingPlanId: string;
  isTemplate: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onAssign: () => void;
};

export default function TrainingPlanBuildDrawer() {
  const { openDrawer, closeDrawer } = useParamsDrawer({});
  const [searchParams] = useSearchParams();
  const { isMobile } = useScreenSize();
  const [
    deleteModalOpened,
    { open: openDeleteModal, close: closeDeleteModal },
  ] = useDisclosure(false);
  const [deleteTrainingPlan, { isLoading: isDeleting }] =
    useDeleteTrainingPlan();
  const [duplicateTrainingPlan, { isLoading: isDuplicating }] =
    useDuplicateTrainingPlan();

  const trainingPlanId = searchParams.get("training_plan_id") ?? "";

  const { data: plan } = useGetTrainingPlan(trainingPlanId, {
    skip: !trainingPlanId,
  });

  const planNameTitle = plan?.name
    ? plan.name.length > 10 && isMobile
      ? `${plan.name.substring(0, 20)}...`
      : plan.name
    : "Build Training Plan";

  const handleEdit = () => {
    if (trainingPlanId) {
      openDrawer(DRAWER_KEYS.TRAINING_PLAN_EDIT, {
        training_plan_id: trainingPlanId,
      });
    }
  };

  const handleDelete = async () => {
    if (!trainingPlanId) return;

    try {
      await deleteTrainingPlan(trainingPlanId).unwrap();
      notifySuccess("Training plan deleted successfully");
      closeDeleteModal();
      closeDrawer();
    } catch (error) {
      const errMsg = humanizeError(error);
      notifyError(errMsg);
    }
  };

  const handleDuplicate = async () => {
    if (!trainingPlanId || isDuplicating) return;

    try {
      const duplicatedPlan =
        await duplicateTrainingPlan(trainingPlanId).unwrap();
      notifySuccess("Training plan duplicated successfully");
      // Open the duplicated plan in the builder
      openDrawer(DRAWER_KEYS.TRAINING_PLAN_BUILDER, {
        training_plan_id: duplicatedPlan.id,
      });
    } catch (error) {
      const errMsg = humanizeError(error);
      notifyError(errMsg);
    }
  };

  const handleAssign = () => {
    if (trainingPlanId) {
      openDrawer(DRAWER_KEYS.ASSIGN_TRAINING_PLAN, {
        training_plan_id: trainingPlanId,
      });
    }
  };

  return (
    <>
      <AutoDrawer
        actions={
          <ActionMenu
            isTemplate={plan?.is_template ?? true}
            onAssign={handleAssign}
            onDelete={openDeleteModal}
            onDuplicate={handleDuplicate}
            onEdit={handleEdit}
            trainingPlanId={trainingPlanId}
          />
        }
        content={<TrainingPlanBuilder />}
        onClose={closeDrawer}
        title={planNameTitle}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        centered
        onClose={closeDeleteModal}
        opened={deleteModalOpened}
        title="Delete Training Plan"
      >
        <div>
          <p>Are you sure you want to delete this training plan?</p>
          <p style={{ color: "var(--mantine-color-dimmed)", fontSize: "14px" }}>
            This action cannot be undone. All phases, workouts, and exercises in
            this plan will be permanently removed.
          </p>
          <div
            style={{
              display: "flex",
              gap: "8px",
              marginTop: "20px",
              justifyContent: "flex-end",
            }}
          >
            <button
              onClick={closeDeleteModal}
              style={{
                padding: "8px 16px",
                border: "1px solid var(--mantine-color-gray-4)",
                borderRadius: "8px",
                background: "white",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              disabled={isDeleting}
              onClick={handleDelete}
              style={{
                padding: "8px 16px",
                border: "none",
                borderRadius: "8px",
                background: "var(--mantine-color-red-6)",
                color: "white",
                cursor: isDeleting ? "not-allowed" : "pointer",
                opacity: isDeleting ? 0.6 : 1,
              }}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

const ActionMenu: FC<ActionMenuProps> = ({
  trainingPlanId,
  isTemplate,
  onEdit,
  onDelete,
  onDuplicate,
  onAssign,
}) => {
  if (!trainingPlanId) return null;

  return (
    <Menu position="bottom-end" shadow="md" width={200}>
      <Menu.Target>
        <ActionIcon color="dark" variant="subtle">
          <IconDots />
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Item leftSection={<IconPencil size={14} />} onClick={onEdit}>
          Edit Basic Info
        </Menu.Item>
        {isTemplate && (
          <Menu.Item
            leftSection={<IconCopyPlus size={14} />}
            onClick={onDuplicate}
          >
            Duplicate
          </Menu.Item>
        )}

        <Menu.Divider />
        <Menu.Item
          color="red"
          leftSection={<IconTrash size={14} />}
          onClick={onDelete}
        >
          Delete Plan
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};
