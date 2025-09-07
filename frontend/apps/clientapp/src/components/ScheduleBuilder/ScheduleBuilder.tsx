import { useSchedule } from "@/Hooks/useScheduleQueries";
import { Drawer, LoadingOverlay } from "@mantine/core";
import { DisplayError } from "../Containers/DisplayError";
import PaddingContainer from "../Containers/PaddingContainer";
import ScheduleEntriesView from "../ScheduleEntriesView/ScheduleEntriesView";
import ScheduleEntryForm from "./ScheduleEntryForm";
import Header from "../Layouts/Header";
import HeadingContainer from "../Containers/HeaderContainer";
import SessionChoice from "./SessionChoice";
import SessionTypeChoice from "./SessionTypeChoice";
import {
  CreateScheduleEntryProps,
  ScheduleEntriesAPI,
} from "@/Api/ScheduleEntries";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SCHEDULE_ENTRIES_QUERY_KEYS } from "@/Hooks/useScheduleEntriesQueries";
import { notifications } from "@mantine/notifications";
import SessionBuilder from "../SessionBuilder/SessionBuilder";
import { useDrawerActions, useDrawerData } from "@/Hooks/useDrawerStackRouter";

export default function ScheduleBuilder() {
  const queryClient = useQueryClient();
  const stackRouter = useDrawerActions();

  // Always get entries-view data when it's open
  const entriesViewData = useDrawerData("entries-view");
  const scheduleId = entriesViewData?.scheduleId;

  // Get data from other drawers independently
  const selectSessionTypeData = useDrawerData("select-session-type");
  const selectSessionData = useDrawerData("select-session");
  const addEntryData = useDrawerData("add-entry");
  const createSessionData = useDrawerData("create-session");

  console.log({
    entriesViewData,
    selectSessionTypeData,
    selectSessionData,
    addEntryData,
    createSessionData,
  });

  // Extract values with proper fallback chain
  const addingToDay =
    addEntryData?.addingToDay ??
    selectSessionData?.addingToDay ??
    selectSessionTypeData?.addingToDay ??
    createSessionData?.addingToDay ??
    null;

  const sessionType =
    addEntryData?.sessionType ??
    selectSessionData?.sessionType ??
    createSessionData?.sessionType ??
    null;

  const sessionDefID = addEntryData?.sessionDefID ?? null;

  const {
    data: schedule,
    isLoading,
    error,
  } = useSchedule(scheduleId || "", !!scheduleId);

  const createEntry = useMutation({
    mutationFn: async ({
      scheduleId,
      data,
    }: {
      scheduleId: string;
      data: CreateScheduleEntryProps;
    }) => {
      const result = await ScheduleEntriesAPI.createEntry(scheduleId, data);
      if (result.isError) {
        throw result.error;
      }
      return result.value!;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: SCHEDULE_ENTRIES_QUERY_KEYS.schedule(variables.scheduleId),
      });
      stackRouter.closeDrawer("add-entry");
    },
    onError: (error) => {
      notifications.show({
        title: "Failed to add entry",
        message: error.message || "Something went wrong",
        color: "red",
      });
    },
  });

  return (
    <Drawer.Stack>
      <Drawer
        {...stackRouter.register("entries-view")}
        onClose={() => stackRouter.closeDrawer("entries-view")}
        withCloseButton={false}
        translate={"yes"}
      >
        <HeadingContainer
          withBorder={false}
          style={{
            paddingInline: "var(--ce-size-xs)",
            paddingBlock: "var(--ce-size-md)",
          }}
        >
          <Header
            onBack={() => stackRouter.closeDrawer("entries-view")}
            title={schedule?.name ? `Schedule: ${schedule.name}` : "Schedule"}
          />
        </HeadingContainer>
        <div style={{ flex: 1, overflow: "auto" }}>
          <PaddingContainer>
            {error && <DisplayError error={error} codesMap={new Map()} />}
            {isLoading && <LoadingOverlay />}
            {schedule && (
              <ScheduleEntriesView
                schedule={schedule}
                onAddEntry={(day) => {
                  stackRouter.openDrawer("select-session-type", {
                    addingToDay: day,
                  });
                }}
              />
            )}
          </PaddingContainer>
        </div>
      </Drawer>

      <Drawer
        {...stackRouter.register("select-session-type")}
        withCloseButton={false}
      >
        <HeadingContainer
          withBorder={false}
          style={{
            paddingInline: "var(--ce-size-xs)",
            paddingBlock: "var(--ce-size-md)",
          }}
        >
          <Header
            onBack={() => stackRouter.closeDrawer("select-session-type")}
            title={"Choose session type"}
          />
        </HeadingContainer>
        <div
          style={{ flex: 1, overflow: "auto", marginTop: "var(--ce-size-md)" }}
        >
          <SessionTypeChoice
            onSelect={(type) => {
              stackRouter.replaceDrawer("select-session", {
                sessionType: type,
                addingToDay,
              });
            }}
          />
        </div>
      </Drawer>

      <Drawer
        {...stackRouter.register("select-session")}
        withCloseButton={false}
      >
        <HeadingContainer
          withBorder={false}
          style={{
            paddingInline: "var(--ce-size-xs)",
            paddingBlock: "var(--ce-size-md)",
          }}
        >
          <Header
            onBack={() => stackRouter.closeDrawer("select-session")}
            title={"Select " + (sessionType || "")}
          />
        </HeadingContainer>
        <div
          style={{ flex: 1, overflow: "auto", marginTop: "var(--ce-size-md)" }}
        >
          <SessionChoice
            sessionType={sessionType as any}
            onCreateNew={() => {
              stackRouter.replaceDrawer("create-session", {
                sessionType,
                addingToDay,
              });
            }}
            onSelect={(id) => {
              stackRouter.replaceDrawer("add-entry", {
                sessionDefID: id,
                sessionType,
                addingToDay,
              });
            }}
          />
        </div>
      </Drawer>

      <Drawer {...stackRouter.register("add-entry")} withCloseButton={false}>
        <HeadingContainer
          withBorder={false}
          style={{
            paddingInline: "var(--ce-size-xs)",
            paddingBlock: "var(--ce-size-md)",
          }}
        >
          <Header
            onBack={() => stackRouter.closeDrawer("add-entry")}
            title={`Choose time of day`}
          />
        </HeadingContainer>
        <div style={{ flex: 1, overflow: "auto" }}>
          {schedule && scheduleId && (
            <ScheduleEntryForm
              schedule={schedule}
              sessionDefId={sessionDefID}
              day={addingToDay}
              onSubmit={async (values) => {
                await createEntry.mutateAsync({
                  scheduleId,
                  data: values,
                });
              }}
            />
          )}
        </div>
      </Drawer>

      <Drawer
        {...stackRouter.register("create-session")}
        withCloseButton={false}
      >
        <HeadingContainer
          withBorder={false}
          style={{
            paddingInline: "var(--ce-size-xs)",
            paddingBlock: "var(--ce-size-md)",
          }}
        >
          <Header
            onBack={() => stackRouter.closeDrawer("create-session")}
            title={`Create new ${sessionType || ""}`}
          />
        </HeadingContainer>
        <div style={{ flex: 1, overflow: "auto" }}>
          <SessionBuilder
            stackRouter={stackRouter}
            sessionType={sessionType as any}
            onComplete={async () => {}}
          />
        </div>
      </Drawer>
    </Drawer.Stack>
  );
}
