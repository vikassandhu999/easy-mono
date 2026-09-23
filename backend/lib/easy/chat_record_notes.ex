defmodule Easy.ChatRecordNotes do
  alias Easy.Chat
  alias Easy.Chat.Conversation
  alias Easy.Ctx
  alias Easy.Repo

  import Ecto.Query

  @spec share(Ctx.t(), atom(), map(), String.t() | nil) :: {:ok, term()} | {:error, term()}
  def share(_ctx, _type, _source, note) when note in [nil, ""], do: {:ok, :quiet}

  def share(ctx, type, source, note) do
    if String.trim(note) == "" do
      {:ok, :quiet}
    else
      <<uuid::binary-size(16), _::binary>> = :crypto.hash(:sha256, "#{type}:#{source.id}:#{source.revision}")
      {:ok, request_id} = Ecto.UUID.load(uuid)
      Chat.send_client_message(ctx, %{body: note, request_id: request_id, embed: %{type: to_string(type), id: source.id, revision: source.revision}})
    end
  end

  @spec notify_result(Ctx.t(), {:ok, value} | {:error, reason}) :: {:ok, value} | {:error, reason}
        when value: var, reason: var
  def notify_result(ctx, {:ok, _} = result) do
    notify(ctx)
    result
  end

  def notify_result(_ctx, error), do: error

  @spec notify(Ctx.t()) :: :ok
  def notify(ctx), do: notify(ctx, ctx.client_id)

  @spec notify(Ctx.t(), String.t()) :: :ok
  def notify(ctx, client_id) do
    id = Conversation |> Conversation.for_business(ctx.business_id) |> where([c], c.client_id == ^client_id) |> select([c], c.id) |> Repo.one()

    if id do
      Phoenix.PubSub.broadcast(Easy.PubSub, "conversation:#{id}", {:conversation_updated, id})
    end

    Phoenix.PubSub.broadcast(Easy.PubSub, "inbox:business:#{ctx.business_id}", {:conversation_updated, id})
    :ok
  end
end
