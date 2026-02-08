import { IconPencil } from "@tabler/icons-react";
import { FC } from "react";

import { Button, Modal, Spinner } from "@heroui/react";

import { DRAWER_KEYS } from "@/configs";
import useParamsDrawer from "@/hooks/useParamDrawer";
import { type Coach, useGetMyCoachQuery } from "@/services/coach";
import { selectUser } from "@/slices/authSlice";
import { useAppSelector } from "@/store";

const CoachProfileViewDrawer = () => {
  const { closeDrawer, openDrawer } = useParamsDrawer({});
  const user = useAppSelector(selectUser);
  const { data: coach, isLoading: isLoadingCoach } = useGetMyCoachQuery();

  const handleEdit = () => {
    openDrawer(DRAWER_KEYS.COACH_PROFILE_EDIT);
  };

  if (isLoadingCoach) {
    return (
      <Modal>
        <Modal.Backdrop isDismissable isOpen onOpenChange={() => closeDrawer()}>
          <Modal.Container placement="top" scroll="outside" size="lg">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading className="text-xl font-semibold">
                  My Profile
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
                  My Profile
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
                My Profile
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="p-4">
              <ProfileContent coach={coach} email={user?.email ?? ""} />
            </Modal.Body>
            <Modal.Footer>
              <Button slot="close" variant="secondary">
                Close
              </Button>
              <Button onPress={handleEdit}>
                <IconPencil size={16} />
                Edit
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

/* ---- Profile Content ---- */

interface ProfileContentProps {
  coach: Coach;
  email: string;
}

const ProfileContent: FC<ProfileContentProps> = ({ coach, email }) => {
  const fullName = coach.name || "No name set";

  return (
    <div className="flex flex-col gap-6">
      {/* Personal Info */}
      <Section title="Personal Information">
        <InfoRow label="Name" value={fullName} />
        {email && <InfoRow label="Email" value={email} />}
      </Section>

      <hr className="border-default-200" />

      {/* Coach Profile */}
      <Section title="Coach Profile">
        {coach.title ? (
          <div className="flex flex-col gap-1">
            <p className="text-xs text-default-400">Title</p>
            <p className="text-sm text-foreground">{coach.title}</p>
          </div>
        ) : (
          <EmptyState text="No title added yet" />
        )}

        {coach.bio ? (
          <div className="flex flex-col gap-1 mt-3">
            <p className="text-xs text-default-400">Bio</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {coach.bio}
            </p>
          </div>
        ) : (
          <EmptyState text="No bio added yet" />
        )}
      </Section>
    </div>
  );
};

/* ---- Helper Components ---- */

const Section: FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <div className="flex flex-col gap-3">
    <p className="text-xs font-semibold uppercase tracking-wide text-default-400">
      {title}
    </p>
    {children}
  </div>
);

const InfoRow: FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-default-500">{label}</span>
    <span className="text-sm font-medium text-foreground">{value}</span>
  </div>
);

const EmptyState: FC<{ text: string }> = ({ text }) => (
  <p className="text-sm italic text-default-400">{text}</p>
);

export default CoachProfileViewDrawer;
