import dayjs from 'dayjs';
import type {ReactNode} from 'react';

export function formatStartEnd(startIso: string, endsIn: {minutes: number; seconds: number; hours: number}): ReactNode {
  const start = dayjs(startIso);

  let end = start;
  if (endsIn.hours) {
    end = end.add(endsIn.hours, 'hour');
  }
  if (endsIn.minutes) {
    end = end.add(endsIn.minutes, 'minute');
  }
  if (endsIn.seconds) {
    end = end.add(endsIn.seconds, 'second');
  }

  const formattedStartDay = start.format('dddd, DD MMMM YYYY');
  const formattedStartTime = start.format('h:mm');
  const formattedEndTime = end.format('h:mm a');

  if (start.isSame(end, 'day')) {
    return `${formattedStartDay}⋅${formattedStartTime} – ${formattedEndTime}`;
  } else {
    const formattedEndDay = end.format('dddd, DD MMMM');
    return (
      <>
        {formattedStartDay}⋅{formattedStartTime}
        <br /> to <br /> {formattedEndDay}⋅{formattedEndTime}
      </>
    );
  }
}
