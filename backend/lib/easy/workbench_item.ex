defmodule Easy.WorkbenchItem do
  @spec from_row(map()) :: map()
  def from_row(%{client: client} = row) do
    Map.merge(details(row), %{
      id: "#{row.kind_rank}:#{row.source_id}:#{row.service_rank}",
      client: client,
      waiting_since: row.waiting_since,
      due_on: row.due_on,
      preview: row.preview
    })
  end

  defp details(%{kind_rank: 0} = row) do
    %{
      kind: :reply,
      target: %{conversation_id: row.source_id},
      reasons: [%{code: :reply_needed, waiting_since: row.waiting_since}]
    }
  end

  defp details(%{kind_rank: 1} = row) do
    purpose = if row.code == "intake_awaiting_review", do: :intake, else: :check_in
    code = if purpose == :intake, do: :intake_awaiting_review, else: :check_in_awaiting_review

    %{
      kind: :review,
      target: %{submission_id: row.source_id, assignment_id: row.target_id, purpose: purpose},
      reasons: [%{code: code, submission_id: row.source_id, submitted_at: row.waiting_since}]
    }
  end

  defp details(%{kind_rank: 2} = row) do
    service = if row.service == "training", do: :training, else: :nutrition
    %{kind: :prepare_plan, target: %{service: service}, reasons: [plan_reason(row, service)]}
  end

  defp details(%{kind_rank: 3} = row) do
    %{
      kind: :invitation_follow_up,
      target: %{invitation_id: row.source_id},
      reasons: [
        %{
          code: :invitation_follow_up_due,
          invitation_id: row.source_id,
          sent_at: row.sent_at,
          follow_up_due_at: DateTime.add(row.sent_at, 3, :day)
        }
      ]
    }
  end

  defp details(%{kind_rank: 4} = row) do
    %{
      kind: :intake_follow_up,
      target: %{assignment_id: row.target_id},
      reasons: [%{code: :intake_overdue, assignment_id: row.target_id, due_on: row.due_on, form_title: row.preview}]
    }
  end

  defp details(%{kind_rank: 5} = row) do
    %{
      kind: :missed_check_in,
      target: %{assignment_id: row.target_id},
      reasons: [%{code: :missed_check_in, assignment_id: row.target_id, due_on: row.due_on}]
    }
  end

  defp details(%{kind_rank: 6} = row) do
    %{
      kind: :ending_engagement,
      target: %{client_id: row.client_id},
      reasons: [%{code: :engagement_ending_soon, ends_on: row.ends_on}]
    }
  end

  defp plan_reason(%{code: "service_never_programmed"}, service),
    do: %{code: :service_never_programmed, service: service}

  defp plan_reason(%{code: "service_coverage_missing"} = row, service),
    do: %{code: :service_coverage_missing, service: service, first_uncovered_on: row.due_on}

  defp plan_reason(row, service),
    do: %{
      code: :service_coverage_ending_soon,
      service: service,
      first_uncovered_on: row.due_on,
      coverage_ends_on: row.ends_on
    }
end
