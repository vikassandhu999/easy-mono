defmodule Easy.Reviews.Reply do
  alias Easy.Chat
  alias Easy.Chat.Conversation
  alias Easy.Chat.Message
  alias Easy.Ctx
  alias Easy.Repo
  alias Easy.Reviews.Review
  import Ecto.Query
  import Ecto.Changeset

  @spec save(Ctx.t(), Review.t(), map()) :: {:ok, {Review.t(), term()}} | {:error, term()}
  def save(ctx, review, attrs) do
    case Map.fetch(attrs, :reply) do
      {:ok, value} ->
        write(ctx, review, value)

      :error ->
        case Map.fetch(attrs, "reply") do
          {:ok, value} -> write(ctx, review, value)
          :error -> {:ok, {review, nil}}
        end
    end
  end

  defp write(ctx, review, body) when is_nil(body) or is_binary(body) do
    body = if is_binary(body), do: String.trim(body)

    with {:ok, conversation} <- Chat.get_or_create_conversation_for_client(ctx, review.client_id) do
      conversation =
        Repo.one(
          from(c in Conversation,
            where: c.business_id == ^ctx.business_id and c.id == ^conversation.id,
            lock: "FOR UPDATE"
          )
        )

      message = load(ctx, review)
      mutate(ctx, review, conversation, message, body)
    end
  end

  defp write(_ctx, review, _body), do: {:error, review |> change() |> add_error(:reply, "is invalid")}

  defp mutate(_ctx, review, _conversation, nil, body) when body in [nil, ""], do: {:ok, {review, nil}}

  defp mutate(_ctx, review, conversation, message, body) when body in [nil, ""] do
    with {:ok, review} <- review |> change(reply_message_id: nil) |> Repo.update(),
         {:ok, _} <- Repo.delete(message),
         {:ok, _} <- refresh(conversation) do
      {:ok, {review, {conversation, :chat_message_deleted, message.id}}}
    end
  end

  defp mutate(_ctx, review, _conversation, %{body: body}, body), do: {:ok, {review, nil}}

  defp mutate(ctx, review, conversation, nil, body) do
    embed = %{
      type: :review,
      id: review.id,
      snapshot: %{
        title: "Coach review",
        occurred_on: DateTime.to_date(review.reviewed_at),
        recorded_at: review.reviewed_at
      }
    }

    changeset =
      ctx.business_id
      |> Message.insert_changeset(:coach, review.coach_id, conversation.id, %{body: body})
      |> Message.put_content([], embed)

    with {:ok, message} <- Repo.insert(changeset),
         {:ok, review} <- review |> change(reply_message_id: message.id) |> Repo.update(),
         {:ok, _} <- refresh(conversation) do
      {:ok, {review, {conversation, :chat_message_created, load(ctx, review)}}}
    end
  end

  defp mutate(ctx, review, conversation, message, body) do
    with {:ok, _} <-
           message
           |> cast(%{body: body}, [:body])
           |> validate_required([:body])
           |> validate_length(:body, max: 4000)
           |> put_change(:edited_at, DateTime.utc_now(:microsecond))
           |> Repo.update(),
         {:ok, _} <- refresh(conversation) do
      {:ok, {review, {conversation, :chat_message_updated, load(ctx, review)}}}
    end
  end

  defp refresh(conversation) do
    latest =
      Message.for_conversation(conversation.business_id, conversation.id)
      |> Message.newest()
      |> limit(1)
      |> Repo.one()
      |> Repo.preload(:attachments)

    values =
      if latest,
        do: %{
          last_message_at: latest.inserted_at,
          last_message_preview: Message.preview(latest, latest.attachments),
          last_message_role: latest.sender_type
        },
        else: %{last_message_at: nil, last_message_preview: nil, last_message_role: nil}

    conversation |> change(values) |> Repo.update()
  end

  @spec load(Ctx.t(), Review.t()) :: Message.t() | nil
  def load(_ctx, %{reply_message_id: nil}), do: nil

  def load(ctx, review),
    do:
      Message.for_business(ctx.business_id)
      |> where([m], m.id == ^review.reply_message_id)
      |> Message.include_sender()
      |> Message.include_attachments()
      |> Repo.one()

  @spec notify(Ctx.t(), term()) :: :ok
  def notify(_ctx, nil), do: :ok

  def notify(_ctx, {conversation, event, value}) do
    Phoenix.PubSub.broadcast(Easy.PubSub, "conversation:#{conversation.id}", {event, value})
    Phoenix.PubSub.broadcast(Easy.PubSub, "conversation:#{conversation.id}", {:conversation_updated, conversation.id})

    Phoenix.PubSub.broadcast(
      Easy.PubSub,
      "inbox:business:#{conversation.business_id}",
      {:conversation_updated, conversation.id}
    )

    :ok
  end

  @spec list_client_replies(Ctx.t(), keyword()) :: {:ok, map()} | {:error, term()}
  def list_client_replies(ctx, opts \\ []) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx),
         {:ok, _} <- Easy.Trackers.client(ctx, client_id) do
      base =
        from(m in Message,
          join: c in Conversation,
          on: c.id == m.conversation_id and c.business_id == m.business_id,
          where: c.business_id == ^ctx.business_id and c.client_id == ^client_id and m.embed_type == :review
        )

      base = if opts[:review_id], do: where(base, [m], m.embed_id == ^opts[:review_id]), else: base

      Repo.snapshot(fn -> reply_page(base, opts) end)
    end
  end

  defp reply_page(base, opts) do
    with {:ok, page} <- Easy.Trackers.page(base, opts, &load_message/1) do
      latest = Repo.one(from(m in base, select: max(m.inserted_at)))
      {:ok, Map.put(page, :latest_message_at, latest)}
    end
  end

  defp load_message(row),
    do:
      Message.for_business(row.business_id)
      |> where([m], m.id == ^row.id)
      |> Message.include_sender()
      |> Message.include_attachments()
      |> Repo.one()
end
