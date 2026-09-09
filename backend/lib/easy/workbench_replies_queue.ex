defmodule Easy.WorkbenchRepliesQueue do
  alias Easy.Chat
  alias Easy.Ctx

  @type item :: %{
          conversation: Easy.Chat.Conversation.t(),
          waiting_message_count: non_neg_integer(),
          client_status: :pending | :active | :inactive,
          reasons: [%{code: :reply_needed, waiting_since: DateTime.t()}]
        }
  @type page :: %{count: non_neg_integer(), items: [item()]}

  @spec count(Ctx.t()) :: non_neg_integer()
  def count(%Ctx{} = ctx) do
    {:ok, count} = Chat.count_waiting_conversations(ctx)
    count
  end

  @spec list(Ctx.t(), keyword()) :: page()
  def list(%Ctx{} = ctx, opts) do
    {:ok, page} = Chat.list_waiting_conversations(ctx, opts)

    items =
      Enum.map(page.items, fn %{conversation: conversation} = item ->
        Map.merge(item, %{
          client_status: conversation.client.status,
          reasons: [%{code: :reply_needed, waiting_since: conversation.waiting_since}]
        })
      end)

    %{page | items: items}
  end
end
