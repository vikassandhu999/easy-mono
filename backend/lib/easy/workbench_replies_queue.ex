defmodule Easy.WorkbenchRepliesQueue do
  import Ecto.Query

  alias Easy.Chat.Conversation
  alias Easy.Ctx
  alias Easy.Repo

  @spec count(Ctx.t()) :: non_neg_integer()
  def count(%Ctx{} = ctx) do
    ctx
    |> facts()
    |> distinct_identity_count()
  end

  @spec list(Ctx.t(), keyword()) :: %{count: non_neg_integer(), items: [map()]}
  def list(%Ctx{} = ctx, opts) do
    facts = facts(ctx)
    {offset, limit} = pagination(opts)

    items =
      facts
      |> Conversation.include_client()
      |> Conversation.oldest()
      |> Easy.Utils.paginate(offset, limit)
      |> Repo.all()
      |> Enum.map(fn conversation ->
        %{
          conversation: conversation,
          reasons: [%{code: :reply_needed, waiting_since: conversation.waiting_since}]
        }
      end)

    %{count: distinct_identity_count(facts), items: items}
  end

  defp facts(%Ctx{} = ctx) do
    Conversation
    |> Conversation.for_business(ctx.business_id)
    |> Conversation.waiting()
    |> Conversation.for_visible_clients(ctx)
  end

  defp distinct_identity_count(query) do
    query
    |> select([conversation], conversation.id)
    |> distinct(true)
    |> subquery()
    |> Repo.aggregate(:count)
  end

  defp pagination(opts) do
    offset = max(Keyword.get(opts, :offset, 0), 0)
    limit = min(max(Keyword.get(opts, :limit, 20), 0), 100)
    {offset, limit}
  end
end
