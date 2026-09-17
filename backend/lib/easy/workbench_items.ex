defmodule Easy.WorkbenchItems do
  import Ecto.Query

  alias Easy.Chat.Conversation
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Forms.FormAssignment
  alias Easy.Forms.FormSubmission
  alias Easy.Forms.FormTemplate
  alias Easy.WorkbenchExpiringQueue
  alias Easy.WorkbenchOnboardingQueue
  alias Easy.WorkbenchProgrammingQueue
  alias Easy.WorkbenchQuietQueue

  @spec query(Ctx.t(), map()) :: Ecto.Query.t()
  def query(%Ctx{} = ctx, params) do
    facts = facts(ctx, params.view, params.evaluated_at) |> search(params.search)
    page = facts |> after_position(params.position) |> ordered() |> limit(^(params.limit + 1))
    counts = count_query(facts, params.include_count)

    from(total in subquery(counts),
      left_join: row in subquery(page),
      on: true,
      left_join: client in Client,
      on: client.id == row.client_id and client.business_id == ^ctx.business_id,
      order_by: [asc: row.band, asc: row.order_value, asc: row.kind_rank, asc: row.source_id, asc: row.service_rank],
      select: %{count: total.count, row: row, client: map(client, [:id, :first_name, :last_name, :email, :status])}
    )
  end

  @spec facts(Ctx.t(), String.t(), DateTime.t()) :: Ecto.Query.t()
  def facts(ctx, "awaiting", at) do
    replies(ctx)
    |> union_all(^reviews(ctx))
    |> union_all(^programming(ctx, at))
    |> subquery()
    |> then(&from(row in &1))
  end

  def facts(ctx, "follow-ups", at) do
    onboarding(ctx, at)
    |> union_all(^quiet(ctx, DateTime.to_date(at)))
    |> union_all(^expiring(ctx, DateTime.to_date(at)))
    |> subquery()
    |> then(&from(row in &1))
  end

  defp replies(ctx) do
    conversations =
      Conversation
      |> Conversation.for_business(ctx.business_id)
      |> Conversation.for_visible_clients(ctx)
      |> Conversation.waiting()

    from(c in conversations,
      select: %{
        client_id: c.client_id,
        source_id: c.id,
        kind_rank: type(^0, :integer),
        band: type(^1, :integer),
        order_value: type(fragment("(extract(epoch from ?) * 1000000)::bigint", c.waiting_since), :integer),
        service_rank: type(^0, :integer),
        code: type(^"reply_needed", :string),
        service: type(^nil, :string),
        target_id: c.id,
        waiting_since: type(c.waiting_since, :utc_datetime_usec),
        due_on: type(^nil, :date),
        ends_on: type(^nil, :date),
        sent_at: type(^nil, :utc_datetime),
        preview: c.last_message_preview
      }
    )
  end

  defp reviews(ctx) do
    submissions =
      FormSubmission
      |> FormSubmission.for_business(ctx.business_id)
      |> FormSubmission.unreviewed()
      |> FormSubmission.for_visible_clients(ctx)

    from(s in submissions,
      join: a in FormAssignment,
      on: a.id == s.form_assignment_id and a.business_id == s.business_id and a.client_id == s.client_id,
      join: t in FormTemplate,
      on: t.id == a.form_template_id and t.business_id == s.business_id,
      where: a.purpose in [:check_in, :intake],
      select: %{
        client_id: s.client_id,
        source_id: s.id,
        kind_rank: type(^1, :integer),
        band: type(^1, :integer),
        order_value: type(fragment("(extract(epoch from ?) * 1000000)::bigint", s.submitted_at), :integer),
        service_rank: type(^0, :integer),
        code:
          type(
            fragment(
              "CASE WHEN ? = 'intake' THEN 'intake_awaiting_review' ELSE 'check_in_awaiting_review' END",
              a.purpose
            ),
            :string
          ),
        service: type(^nil, :string),
        target_id: a.id,
        waiting_since: type(s.submitted_at, :utc_datetime_usec),
        due_on: type(^nil, :date),
        ends_on: type(^nil, :date),
        sent_at: type(^nil, :utc_datetime),
        preview: t.name
      }
    )
  end

  defp programming(ctx, at) do
    from(f in subquery(WorkbenchProgrammingQueue.service_facts(ctx, at)),
      select: %{
        client_id: f.client_id,
        source_id: f.client_id,
        kind_rank: type(^2, :integer),
        band: type(fragment("CASE WHEN ? = ? THEN 0 ELSE 2 END", f.first_uncovered_on, f.today), :integer),
        order_value:
          type(
            fragment(
              "CASE WHEN ? = ? THEN 0 ELSE COALESCE(? - DATE '1970-01-01', 0) END",
              f.first_uncovered_on,
              f.today,
              f.first_uncovered_on
            ),
            :integer
          ),
        service_rank: f.service_rank,
        code: f.code,
        service: f.service,
        target_id: f.client_id,
        waiting_since: type(^nil, :utc_datetime_usec),
        due_on: type(f.first_uncovered_on, :date),
        ends_on: type(f.coverage_ends_on, :date),
        sent_at: type(^nil, :utc_datetime),
        preview: type(^nil, :string)
      }
    )
  end

  defp onboarding(ctx, at) do
    from([c, a, t] in WorkbenchOnboardingQueue.facts(ctx, at),
      select: %{
        client_id: c.id,
        source_id: type(fragment("CASE WHEN ? IS NULL THEN ? ELSE ? END", c.joined_at, c.id, a.id), Ecto.UUID),
        kind_rank: type(fragment("CASE WHEN ? IS NULL THEN 3 ELSE 4 END", c.joined_at), :integer),
        band: type(^0, :integer),
        order_value:
          type(
            fragment(
              "(extract(epoch from CASE WHEN ? IS NULL THEN ? + interval '3 days' ELSE ?::timestamp END) * 1000000)::bigint",
              c.joined_at,
              c.invitation_sent_at,
              a.due_date
            ),
            :integer
          ),
        service_rank: type(^0, :integer),
        code:
          type(
            fragment("CASE WHEN ? IS NULL THEN 'invitation_follow_up_due' ELSE 'intake_overdue' END", c.joined_at),
            :string
          ),
        service: type(^nil, :string),
        target_id: type(fragment("CASE WHEN ? IS NULL THEN ? ELSE ? END", c.joined_at, c.id, a.id), Ecto.UUID),
        waiting_since: type(^nil, :utc_datetime_usec),
        due_on: type(fragment("CASE WHEN ? IS NULL THEN NULL ELSE ? END", c.joined_at, a.due_date), :date),
        ends_on: type(^nil, :date),
        sent_at: type(c.invitation_sent_at, :utc_datetime),
        preview: t.name
      }
    )
  end

  defp quiet(ctx, today) do
    from([a, c] in WorkbenchQuietQueue.facts(ctx, today),
      select: %{
        client_id: c.id,
        source_id: c.id,
        kind_rank: type(^5, :integer),
        band: type(^0, :integer),
        order_value: type(fragment("(extract(epoch from ?::timestamp) * 1000000)::bigint", a.due_on), :integer),
        service_rank: type(^0, :integer),
        code: type(^"missed_check_in", :string),
        service: type(^nil, :string),
        target_id: type(a.assignment_id, Ecto.UUID),
        waiting_since: type(^nil, :utc_datetime_usec),
        due_on: type(a.due_on, :date),
        ends_on: type(^nil, :date),
        sent_at: type(^nil, :utc_datetime),
        preview: type(^nil, :string)
      }
    )
  end

  defp expiring(ctx, today) do
    from(c in WorkbenchExpiringQueue.facts(ctx, today),
      select: %{
        client_id: c.id,
        source_id: c.id,
        kind_rank: type(^6, :integer),
        band: type(^0, :integer),
        order_value: type(fragment("extract(epoch from ?::date)::bigint * 1000000", c.subscription_ends_on), :integer),
        service_rank: type(^0, :integer),
        code: type(^"engagement_ending_soon", :string),
        service: type(^nil, :string),
        target_id: c.id,
        waiting_since: type(^nil, :utc_datetime_usec),
        due_on: type(c.subscription_ends_on, :date),
        ends_on: type(c.subscription_ends_on, :date),
        sent_at: type(^nil, :utc_datetime),
        preview: type(^nil, :string)
      }
    )
  end

  defp search(query, ""), do: query

  defp search(query, search) do
    pattern = Easy.Search.like_pattern(search)

    from(row in query,
      join: c in Client,
      on: c.id == row.client_id,
      where: ilike(fragment("concat_ws(' ', ?, ?)", c.first_name, c.last_name), ^pattern) or ilike(c.email, ^pattern),
      select: row
    )
  end

  defp count_query(facts, true), do: from(row in subquery(facts), select: %{count: count()})

  defp count_query(_facts, false),
    do: from(total in fragment("SELECT NULL::bigint AS count"), select: %{count: type(field(total, :count), :integer)})

  defp ordered(query),
    do:
      order_by(query, [row],
        asc: row.band,
        asc: row.order_value,
        asc: row.kind_rank,
        asc: row.source_id,
        asc: row.service_rank
      )

  defp after_position(query, nil), do: query

  defp after_position(query, p) do
    where(
      query,
      [row],
      fragment(
        "(?, ?, ?, ?, ?) > (?, ?, ?, ?::uuid, ?)",
        row.band,
        row.order_value,
        row.kind_rank,
        row.source_id,
        row.service_rank,
        ^p.band,
        ^p.order_value,
        ^p.kind_rank,
        type(^p.source_id, Ecto.UUID),
        ^p.service_rank
      )
    )
  end
end
