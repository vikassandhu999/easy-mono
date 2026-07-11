import {Typography} from '@heroui/react';
import {useCallback, useEffect, useMemo, useState} from 'react';

import {
  type ClientProfileFormAssignment,
  type ClientProfileFormSubmission,
  useListFormSubmissionsQuery,
} from '@/api/checkins';
import RatingSparkline, {type RatingTrendPoint} from '@/clients/components/rating-sparkline';

type RatingTrend = {
  id: string;
  label: string;
  points: RatingTrendPoint[];
};

type SnapshotQuestion = {id?: string; label?: string; type?: string};
type SnapshotSection = {questions?: SnapshotQuestion[]};

export function extractRatingTrends(submissions: ClientProfileFormSubmission[]): RatingTrend[] {
  const trends = new Map<string, RatingTrend>();
  const sorted = [...submissions].sort(
    (left, right) => left.submitted_at.localeCompare(right.submitted_at) || left.id.localeCompare(right.id),
  );

  for (const submission of sorted) {
    const answers = submission.answers as Record<string, unknown>;
    const sections = (submission.question_snapshot ?? []) as SnapshotSection[];

    for (const question of sections.flatMap((section) => section.questions ?? [])) {
      const value = question.id ? answers[question.id] : undefined;
      if (
        question.type !== 'rating' ||
        !question.id ||
        !Number.isInteger(value) ||
        typeof value !== 'number' ||
        value < 1 ||
        value > 5
      ) {
        continue;
      }

      const trend = trends.get(question.id) ?? {id: question.id, label: question.label ?? question.id, points: []};
      trend.label = question.label ?? trend.label;
      trend.points.push({date: submission.submitted_at, id: submission.id, value});
      trends.set(question.id, trend);
    }
  }

  return [...trends.values()].sort((left, right) => left.label.localeCompare(right.label));
}

function SubmissionLoader({
  assignmentId,
  onLoad,
}: {
  assignmentId: string;
  onLoad: (assignmentId: string, submissions: ClientProfileFormSubmission[] | null) => void;
}) {
  const {data} = useListFormSubmissionsQuery({id: assignmentId});

  useEffect(() => {
    if (data) {
      onLoad(assignmentId, data.data);
    }
    return () => onLoad(assignmentId, null);
  }, [assignmentId, data, onLoad]);

  return null;
}

export default function CheckinTrends({assignments}: {assignments: ClientProfileFormAssignment[]}) {
  const completed = useMemo(() => assignments.filter((assignment) => assignment.status === 'completed'), [assignments]);
  const [byAssignment, setByAssignment] = useState<Record<string, ClientProfileFormSubmission[]>>({});

  const handleLoad = useCallback((assignmentId: string, submissions: ClientProfileFormSubmission[] | null) => {
    setByAssignment((current) => {
      if (submissions) {
        return {...current, [assignmentId]: submissions};
      }
      const next = {...current};
      delete next[assignmentId];
      return next;
    });
  }, []);

  const trends = useMemo(() => extractRatingTrends(Object.values(byAssignment).flat()), [byAssignment]);

  return (
    <>
      {completed.map((assignment) => (
        <SubmissionLoader
          assignmentId={assignment.id}
          key={assignment.id}
          onLoad={handleLoad}
        />
      ))}
      {trends.length > 0 ? (
        <div className="mb-5">
          <Typography
            className="mb-2 uppercase tracking-wider"
            color="muted"
            type="body-xs"
            weight="bold"
          >
            Rating trends
          </Typography>
          <div className="grid gap-2 sm:grid-cols-2">
            {trends.map((trend) => (
              <RatingSparkline
                key={trend.id}
                label={trend.label}
                points={trend.points}
              />
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
