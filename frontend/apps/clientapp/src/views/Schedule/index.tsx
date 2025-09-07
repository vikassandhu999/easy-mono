import { useState } from "react";
import PagePaper from "@/Components/Containers/PagePaper";
import ScheduleHeader from "./header";
import { Box, SegmentedControl } from "@mantine/core";
import CurrentDayView from "./currenDayView";
import CurrentWeekView from "./currenWeekView";
import PaddingContainer from "@/Components/Containers/PaddingContainer";

type View = "daily" | "weekly";

const SchedulePage = () => {
  const [selectedView, setSelectedView] = useState<View>("daily");

  return (
    <PagePaper>
      <ScheduleHeader />
      <PaddingContainer paddingX={"lg"} paddingY={"md"}>
        <Box
          style={{
            position: "sticky",
            top: 30,
            zIndex: 30,
            background: "white",
          }}
          py="md"
        >
          <SegmentedControl
            fullWidth
            data={[
              { label: "Daily", value: "daily" },
              { label: "Weekly", value: "weekly" },
            ]}
            variant="filled"
            size="md"
            radius="lg"
            defaultValue="daily"
            value={selectedView}
            onChange={(value) => setSelectedView(value as View)}
          />
        </Box>

        {selectedView === "daily" && <CurrentDayView />}

        {selectedView === "weekly" && (
          <div>
            <CurrentWeekView />
          </div>
        )}
      </PaddingContainer>
    </PagePaper>
  );
};

export default SchedulePage;
