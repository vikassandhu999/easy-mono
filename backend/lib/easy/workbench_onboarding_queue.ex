defmodule Easy.WorkbenchOnboardingQueue do
  import Ecto.Query

  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Forms.FormAssignment
  alias Easy.Repo

  @follow_up_days 3

  @spec count(Ctx.t()) :: non_neg_integer()
  def count(%Ctx{} = ctx) do
    ctx
    |> facts(DateTime.utc_now(:second))
    |> distinct_identity_count()
  end

  @spec list(Ctx.t(), keyword()) :: %{count: non_neg_integer(), items: [map()]}
  def list(%Ctx{} = ctx, opts) do
    now = DateTime.utc_now(:second)
    facts = facts(ctx, now)
    {offset, limit} = pagination(opts)

    items =
      facts
      |> order_by(
        [client, assignment],
        asc:
          fragment(
            "CASE WHEN ? IS NULL THEN ? + interval '3 days' ELSE ?::timestamp END",
            client.joined_at,
            client.invitation_sent_at,
            assignment.due_date
          ),
        asc: client.id
      )
      |> select([client, assignment], %{
        client: client,
        invitation: is_nil(client.joined_at),
        assignment_id: assignment.id,
        due_on: assignment.due_date,
        sent_at: client.invitation_sent_at
      })
      |> Easy.Utils.paginate(offset, limit)
      |> Repo.all()
      |> Enum.map(&to_item/1)

    %{count: distinct_identity_count(facts), items: items}
  end

  defp facts(%Ctx{} = ctx, now) do
    today = DateTime.to_date(now)
    invitation_cutoff = DateTime.add(now, -@follow_up_days, :day)

    visible_clients =
      Client
      |> Client.for_business(ctx.business_id)
      |> Client.visible_to(ctx)

    from(client in visible_clients,
      left_join: assignment in FormAssignment,
      on:
        assignment.business_id == client.business_id and
          assignment.client_id == client.id and
          assignment.purpose == :intake,
      where: ^onboarding_member(invitation_cutoff, today)
    )
  end

  defp onboarding_member(invitation_cutoff, today) do
    dynamic(
      [client, assignment],
      ^pending_invitation(invitation_cutoff) or ^overdue_intake(today)
    )
  end

  defp pending_invitation(invitation_cutoff) do
    dynamic(
      [client],
      is_nil(client.joined_at) and client.status == :pending and
        not is_nil(client.invitation_sent_at) and client.invitation_sent_at < ^invitation_cutoff
    )
  end

  defp overdue_intake(today) do
    dynamic(
      [client, assignment],
      not is_nil(client.joined_at) and client.status == :active and
        not is_nil(assignment.id) and assignment.status not in [:completed, :dismissed] and
        not is_nil(assignment.due_date) and assignment.due_date < ^today
    )
  end

  defp distinct_identity_count(query) do
    query
    |> select([client], client.id)
    |> distinct(true)
    |> subquery()
    |> Repo.aggregate(:count)
  end

  defp to_item(%{client: client, invitation: true, sent_at: sent_at}) do
    %{
      client: client,
      reasons: [
        %{
          code: :invitation_follow_up_due,
          invitation_id: client.id,
          sent_at: sent_at,
          follow_up_due_at: DateTime.add(sent_at, @follow_up_days, :day)
        }
      ]
    }
  end

  defp to_item(%{client: client, assignment_id: assignment_id, due_on: due_on}) do
    %{
      client: client,
      reasons: [%{code: :intake_overdue, assignment_id: assignment_id, due_on: due_on}]
    }
  end

  defp pagination(opts) do
    offset = max(Keyword.get(opts, :offset, 0), 0)
    limit = min(max(Keyword.get(opts, :limit, 20), 0), 100)
    {offset, limit}
  end
end
