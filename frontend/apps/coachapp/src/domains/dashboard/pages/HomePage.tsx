import {Avatar, Button, Modal, Spinner} from '@heroui/react';
import {IconBell, IconBellOff, IconChevronRight} from '@tabler/icons-react';
import {useState} from 'react';
import {useNavigate} from 'react-router';

import PageContentWrapper from '@/components/PageContentWrapper';
import PageWrapper from '@/components/PageWrapper';
import {parseCoachName, useGetMyCoachQuery} from '@/services/coach';
import {selectUser} from '@/slices/authSlice';
import {useAppSelector} from '@/store';

import {QUICK_ACTIONS, QuickActionConfig} from '../config';

export default function HomePage() {
  const navigate = useNavigate();
  const user = useAppSelector(selectUser);
  const {data: coach, isLoading: coachLoading, isError: coachErr, refetch} = useGetMyCoachQuery();
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);

  const {firstName} = parseCoachName(coach?.name ?? null);
  const coachFirstName = firstName || user?.first_name || 'Coach';
  const coachNameInitial = coachFirstName[0]?.toUpperCase() ?? 'C';

  return (
    <PageWrapper>
      {coachLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
          <Spinner />
        </div>
      )}
      <PageContentWrapper>
        {coachErr && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-danger-200 bg-danger-50 px-4 py-3">
            <p className="flex-1 text-sm text-danger-700">Error loading profile. Please check your connection.</p>
            <Button
              className="shrink-0"
              onPress={() => refetch()}
              size="sm"
              variant="secondary"
            >
              Retry
            </Button>
          </div>
        )}
        <div className="flex flex-col gap-6">
          {/* Greeting */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar size="lg">
                <Avatar.Fallback className="bg-blue-100 text-blue-700 font-semibold">
                  {coachNameInitial}
                </Avatar.Fallback>
              </Avatar>
              <div className="flex flex-col gap-0.5">
                <h2 className="text-lg font-semibold text-foreground">Hello, {coachFirstName}</h2>
                <p className="text-sm text-default-500">Welcome back</p>
              </div>
            </div>

            <button
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 transition-colors hover:bg-cyan-100"
              onClick={() => setNotificationDrawerOpen(true)}
              type="button"
            >
              <IconBell size={22} />
            </button>
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border border-default-200 bg-white p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-default-400">Quick actions</p>
            <div className="flex flex-col gap-1">
              {QUICK_ACTIONS.map((action) => (
                <QuickActionItem
                  action={action}
                  key={action.id}
                  onNavigate={navigate}
                />
              ))}
            </div>
          </div>
        </div>
      </PageContentWrapper>

      {/* Notification Drawer */}
      {notificationDrawerOpen && (
        <Modal>
          <Modal.Backdrop
            isDismissable
            isOpen
            onOpenChange={() => setNotificationDrawerOpen(false)}
          >
            <Modal.Container
              placement="top"
              scroll="outside"
              size="lg"
            >
              <Modal.Dialog>
                <Modal.Header>
                  <Modal.Heading className="text-xl font-semibold">Notifications</Modal.Heading>
                </Modal.Header>
                <Modal.Body>
                  <div className="flex flex-col items-center gap-4 py-8">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-default-100">
                      <IconBellOff
                        className="text-default-400"
                        size={32}
                      />
                    </div>
                    <p className="text-sm text-default-500 text-center">No notifications yet</p>
                    <p className="text-xs text-default-400 text-center">
                      We'll notify you when something important happens.
                    </p>
                  </div>
                </Modal.Body>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      )}
    </PageWrapper>
  );
}

function QuickActionItem({action, onNavigate}: {action: QuickActionConfig; onNavigate: (path: string) => void}) {
  return (
    <button
      className="flex w-full items-center justify-between rounded-lg bg-transparent px-3 py-3 text-left transition-colors hover:bg-default-100 active:bg-default-200"
      onClick={() => onNavigate(action.path)}
      type="button"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-default-100 text-default-500">
          <action.icon size={18} />
        </div>
        <span className="text-sm font-medium text-foreground">{action.label}</span>
      </div>
      <IconChevronRight
        className="text-default-400"
        size={18}
      />
    </button>
  );
}
