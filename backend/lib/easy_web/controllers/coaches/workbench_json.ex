defmodule EasyWeb.Coaches.WorkbenchJSON do
  alias EasyWeb.Coaches.ClientJSON
  alias EasyWeb.Coaches.ConversationJSON

  @spec index(map()) :: map()
  def index(%{counts: counts}) do
    %{
      data: %{
        check_ins: counts.check_ins,
        replies: counts.replies,
        onboarding: counts.onboarding,
        programming: counts.programming,
        expiring: counts.expiring,
        quiet: counts.quiet
      }
    }
  end

  @spec onboarding(%{items: [map()], count: non_neg_integer()}) :: map()
  def onboarding(%{items: items, count: count}) do
    %{
      data: Enum.map(items, &client_item/1),
      count: count
    }
  end

  @spec programming(%{items: [map()], count: non_neg_integer()}) :: map()
  def programming(%{items: items, count: count}), do: client_queue(items, count)

  @spec expiring(%{items: [map()], count: non_neg_integer()}) :: map()
  def expiring(%{items: items, count: count}), do: client_queue(items, count)

  @spec quiet(%{items: [map()], count: non_neg_integer()}) :: map()
  def quiet(%{items: items, count: count}), do: client_queue(items, count)

  @spec check_ins(%{items: [map()], count: non_neg_integer()}) :: map()
  def check_ins(%{items: items, count: count}) do
    data =
      Enum.map(items, fn item ->
        %{
          submission: check_in_submission(item.submission),
          client: ClientJSON.data(item.client),
          assignment: check_in_assignment(item.assignment),
          reasons: item.reasons
        }
      end)

    %{data: data, count: count}
  end

  @spec replies(%{items: [map()], count: non_neg_integer()}) :: map()
  def replies(%{items: items, count: count}) do
    data =
      Enum.map(items, fn item ->
        %{conversation: ConversationJSON.data(item.conversation), reasons: item.reasons}
      end)

    %{data: data, count: count}
  end

  defp client_queue(items, count), do: %{data: Enum.map(items, &client_item/1), count: count}

  defp client_item(%{client: client, reasons: reasons}) do
    %{client: ClientJSON.data(client), reasons: reasons}
  end

  defp check_in_submission(submission) do
    %{
      id: submission.id,
      form_assignment_id: submission.form_assignment_id,
      submitted_at: submission.submitted_at,
      reviewed_at: submission.reviewed_at
    }
  end

  defp check_in_assignment(assignment) do
    %{
      id: assignment.id,
      client_id: assignment.client_id,
      form_template_id: assignment.form_template_id,
      purpose: assignment.purpose,
      status: assignment.status,
      due_date: assignment.due_date
    }
  end
end
