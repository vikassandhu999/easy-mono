import {
  IconHaze,
  IconMoon,
  IconSun,
  IconSunset,
  IconClock,
  IconCalendar,
} from "@tabler/icons-react";
import { useState } from "react";
import { Select } from "@mantine/core";
import classes from "./tabs.module.css";
import { SCHEDULE_TIME_SLOTS } from "@/components/layouts/MainLayout.tsx/constants";
import TimeSlotList from "@/components/listing/TimeSlotList";
import TaskItem from "@/components/listing/TaskItem";

const TimeSlotConfig = SCHEDULE_TIME_SLOTS.map((slot) => ({
  ...slot,
  icon:
    slot.id === "morning" ? (
      <IconHaze />
    ) : slot.id === "afternoon" ? (
      <IconSun />
    ) : slot.id === "evening" ? (
      <IconSunset />
    ) : slot.id === "night" ? (
      <IconMoon />
    ) : slot.id === "all-day" ? (
      <IconCalendar />
    ) : (
      <IconClock />
    ),
  color:
    slot.id === "morning"
      ? "var(--mantine-color-yellow-5)"
      : slot.id === "afternoon"
      ? "var(--mantine-color-orange-5)"
      : slot.id === "evening"
      ? "var(--mantine-color-red-5)"
      : slot.id === "night"
      ? "var(--mantine-color-blue-5)"
      : slot.id === "all-day"
      ? "var(--mantine-color-green-5)"
      : "var(--mantine-color-violet-5)",
}));

const CurrentDayView = () => {
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("all");

  const selectData = [
    { value: "all", label: "All Times" },
    ...TimeSlotConfig.map((slot) => ({
      value: slot.id,
      label: slot.title,
    })),
  ];

  return (
    <>
      <div
        style={{
          width: "100%",
          position: "sticky",
          top: 100,
          zIndex: 20,
          background: "white",
          paddingTop: "8px",
          paddingBottom: "8px",
          display: "flex",
          justifyContent: "end",
        }}
      >
        <Select
          data={selectData}
          value={selectedTimeSlot}
          onChange={(value) => setSelectedTimeSlot(value || "all")}
          placeholder="Select time slot"
          variant={"filled"}
          size="sm"
          radius="lg"
          leftSection={<IconClock />}
          classNames={classes}
          styles={{
            root: {
              width: "100%",
              maxWidth: "200px",
            },
            input: {
              background: "var(--mantine-color-gray-0)",
              border: `2px solid var(--mantine-color-gray-2)`,
            },
          }}
        />
      </div>

      {/* All Times Panel */}
      {selectedTimeSlot === "all" && (
        <div style={{ paddingTop: "16px" }}>
          {TimeSlotConfig.map((period) => (
            <TimeSlotList
              key={period.id}
              label={period.title}
              icon={period.icon}
              color={period.color}
            >
              <TaskItem
                id="1"
                title="Follow up with client"
                sessionStatus={"in_progress"}
                taskType="lesson"
                onUpdateStatus={(status) =>
                  console.log(`Task 1 status updated to: ${status}`)
                }
              />

              <TaskItem
                id="2"
                title="Follow up with client"
                sessionStatus={"completed"}
                taskType={"workout"}
                onUpdateStatus={(status) =>
                  console.log(`Task 2 status updated to: ${status}`)
                }
              />

              <TaskItem
                id="3"
                title="Follow up with client"
                sessionStatus={"skipped"}
                taskType={"meal"}
                onUpdateStatus={(status) =>
                  console.log(`Task 3 status updated to: ${status}`)
                }
              />

              <TaskItem
                id="4"
                title="Follow up with client"
                sessionStatus={"partial"}
                taskType={"meal"}
                onUpdateStatus={(status) =>
                  console.log(`Task 4 status updated to: ${status}`)
                }
              />
            </TimeSlotList>
          ))}
        </div>
      )}

      {/* Individual Time Slot Panels */}
      {TimeSlotConfig.map(
        (period) =>
          selectedTimeSlot === period.id && (
            <div key={period.id} style={{ paddingTop: "16px" }}>
              <TimeSlotList
                label={`${period.title} (${period.timeRange})`}
                icon={period.icon}
                color={period.color}
              >
                <TaskItem
                  id={`${period.id}-1`}
                  title={`${period.title} workout session`}
                  sessionStatus={"scheduled"}
                  taskType="workout"
                  onUpdateStatus={(status) =>
                    console.log(
                      `${period.title} task status updated to: ${status}`
                    )
                  }
                />
              </TimeSlotList>
            </div>
          )
      )}
    </>
  );
};

export default CurrentDayView;
