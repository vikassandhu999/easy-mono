import { Group, ScrollArea, SegmentedControl } from "@mantine/core";
import { useMemo, useState } from "react";
import CurrentDayView from "./CurrenDayView";
import dayjs from "dayjs";
import {
  SCHEDULE_WEEK_DAYS,
  ScheduleWeekDay,
} from "@/components/layouts/MainLayout.tsx/constants";

const getCurrentDay = () => {
  // Get current day using dayjs (0=Sunday, 1=Monday, etc.)
  const dayIndex = dayjs().day();

  // Convert to our array format (0=Monday, 6=Sunday)
  const currentDayIndex = dayIndex === 0 ? 6 : dayIndex - 1;
  const currentDayValue = SCHEDULE_WEEK_DAYS[currentDayIndex].value;

  return currentDayValue;
};
const CurrentWeekView = () => {
  const currentDay = useMemo(() => getCurrentDay(), []);

  const [selectedView, setSelectedView] = useState<ScheduleWeekDay>(
    currentDay as ScheduleWeekDay
  );

  console.log("WeeklyView state:", {
    currentDay,
    selectedView,
    weekDaysDataLength: SCHEDULE_WEEK_DAYS.length,
  });

  return (
    <>
      <Group justify="end" w="100%">
        <ScrollArea type="scroll" scrollbars="x" style={{ width: "100%" }}>
          <SegmentedControl
            data={SCHEDULE_WEEK_DAYS}
            variant="filled"
            size="sm"
            radius="lg"
            my="lg"
            fullWidth
            value={selectedView}
            onChange={(value) => {
              console.log("Selected day changed to:", value);
              setSelectedView(value as ScheduleWeekDay);
            }}
            style={{
              minWidth: "max-content",
              width: "auto",
            }}
          />
        </ScrollArea>
      </Group>

      <CurrentDayView />
    </>
  );
};

export default CurrentWeekView;
