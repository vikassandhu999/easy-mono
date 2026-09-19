defmodule Easy.ChatMessages do
  alias Easy.Attachments.Attachment
  alias Easy.Chat.Conversation
  alias Easy.Chat.Message
  alias Easy.Chat.MessageAttachment
  alias Easy.Ctx
  alias Easy.Forms.Submissions
  alias Easy.Repo
  alias Easy.Result

  import Ecto.Query

  @type page :: %{messages: [Message.t()], has_more: boolean()}

  @spec list_message_page(Ctx.t(), Conversation.t(), keyword()) ::
          {:ok, Easy.CursorPage.t(Message.t())} | {:error, :invalid_cursor}
  def list_message_page(ctx, conversation, opts) do
    base = Message.for_conversation(ctx.business_id, conversation.id)
    limit = Easy.CursorPage.limit(opts)

    with {:ok, query} <- Easy.CursorPage.query(base, opts[:cursor] || "start", limit) do
      Repo.snapshot(fn ->
        summary =
          from(message in base,
            select: %{count: count(message.id), latest_message_at: max(message.inserted_at)}
          )
          |> Repo.one()

        page = Easy.CursorPage.finish(Repo.all(query), limit, summary.count)
        ids = Enum.map(page.data, & &1.id)

        {:ok,
         Map.merge(page, %{
           data: load_messages_with_attachments(ids, ctx.business_id),
           latest_message_at: summary.latest_message_at
         })}
      end)
    end
  end

  @spec list_messages(Ctx.t(), Conversation.t(), keyword()) :: {:ok, page()}
  def list_messages(%Ctx{business_id: business_id}, %Conversation{id: conversation_id}, opts \\ []) do
    limit = min(max(Keyword.get(opts, :limit, 20), 1), 100)

    ids =
      Message
      |> Message.for_conversation(business_id, conversation_id)
      |> maybe_before(business_id, conversation_id, Keyword.get(opts, :before))
      |> Message.newest()
      |> limit(^(limit + 1))
      |> select([message], message.id)
      |> Repo.all()

    {page_ids, rest} = Enum.split(ids, limit)

    {:ok,
     %{
       messages: page_ids |> load_messages_with_attachments(business_id) |> Enum.reverse(),
       has_more: rest != []
     }}
  end

  defp maybe_before(query, _business_id, _conversation_id, nil), do: query

  defp maybe_before(query, business_id, conversation_id, before_id) do
    case Message |> Message.for_conversation(business_id, conversation_id) |> Repo.get(before_id) do
      nil -> query
      cursor -> Message.before_message(query, cursor)
    end
  end

  defp load_messages_with_attachments([], _business_id), do: []

  defp load_messages_with_attachments(ids, business_id) do
    loaded =
      Message
      |> Message.for_business(business_id)
      |> Message.for_ids(ids)
      |> Message.include_attachments()
      |> Repo.all()
      |> Map.new(&{&1.id, &1})

    Enum.map(ids, &Map.fetch!(loaded, &1))
  end

  @spec send_message(Ctx.t(), Conversation.t(), {:coach | :client, Ecto.UUID.t()}, map()) ::
          {:ok, Message.t()} | {:error, :not_found | :conflict | Ecto.Changeset.t()}
  def send_message(%Ctx{} = ctx, conversation, {sender_type, sender_id}, attrs)
      when sender_type in [:coach, :client] do
    base_changeset =
      Message.insert_changeset(ctx.business_id, sender_type, sender_id, conversation.id, attrs)

    with {:ok, attachment_ids} <- Message.attachment_ids(base_changeset),
         {:ok, embed_id} <- Message.embed_reference(base_changeset),
         changeset <- Message.put_request_fingerprint(base_changeset, attachment_ids, embed_id),
         {:ok, candidate} <- Ecto.Changeset.apply_action(changeset, :insert),
         {:ok, {message, created?}} <-
           persist_message(ctx, conversation, changeset, candidate, attachment_ids, embed_id) do
      if created?, do: broadcast_message(conversation, message)
      {:ok, message}
    end
  end

  defp persist_message(ctx, conversation, changeset, candidate, attachment_ids, embed_id) do
    Repo.transact(fn ->
      locked =
        Conversation
        |> Conversation.for_business(ctx.business_id)
        |> where([conversation], conversation.id == ^candidate.conversation_id)
        |> lock("FOR UPDATE")
        |> Repo.one()

      case locked do
        nil -> {:error, :not_found}
        _ -> replay_or_insert(ctx, conversation, changeset, candidate, attachment_ids, embed_id)
      end
    end)
  end

  defp replay_or_insert(ctx, conversation, changeset, candidate, attachment_ids, embed_id) do
    case find_request(candidate) do
      nil ->
        insert_message(ctx, conversation, changeset, attachment_ids, embed_id)

      %{request_fingerprint: fingerprint} = message when fingerprint == candidate.request_fingerprint ->
        {:ok, {message, false}}

      _message ->
        {:error, :conflict}
    end
  end

  defp find_request(%Message{request_id: nil}), do: nil

  defp find_request(candidate) do
    Message
    |> Message.for_conversation(candidate.business_id, candidate.conversation_id)
    |> where(
      [message],
      message.sender_type == ^candidate.sender_type and message.sender_id == ^candidate.sender_id and
        message.request_id == ^candidate.request_id
    )
    |> Message.include_attachments()
    |> Repo.one()
  end

  defp insert_message(ctx, conversation, changeset, attachment_ids, embed_id) do
    with {:ok, attachments} <- load_attachments(ctx, conversation.client_id, attachment_ids),
         {:ok, embed} <- resolve_embed(ctx, conversation.client_id, embed_id),
         {:ok, message} <- changeset |> Message.put_content(attachments, embed) |> Repo.insert(),
         {:ok, _links} <- insert_attachment_links(message, attachments),
         {:ok, :updated} <- update_conversation(conversation, message, attachments) do
      {:ok, {%{message | attachments: attachments}, true}}
    end
  end

  defp load_attachments(_ctx, _client_id, []), do: {:ok, []}

  defp load_attachments(ctx, client_id, ids) do
    attachments =
      Attachment
      |> Attachment.for_client(ctx.business_id, client_id)
      |> Attachment.for_ids(ids)
      |> Repo.all()

    if length(attachments) == length(ids) do
      by_id = Map.new(attachments, &{&1.id, &1})
      {:ok, Enum.map(ids, &Map.fetch!(by_id, &1))}
    else
      {:error, :not_found}
    end
  end

  defp resolve_embed(_ctx, _client_id, nil), do: {:ok, nil}

  defp resolve_embed(ctx, client_id, id) do
    with {:ok, submission} <- Submissions.get_for_client(ctx, client_id, id) do
      assignment = submission.form_assignment

      {:ok,
       %{
         type: :form_submission,
         id: submission.id,
         snapshot: %{
           "form_assignment_id" => assignment.id,
           "title" => assignment.form_template.name,
           "submitted_at" => DateTime.to_iso8601(submission.submitted_at)
         }
       }}
    end
  end

  defp insert_attachment_links(message, attachments) do
    attachments
    |> Enum.with_index()
    |> Result.traverse(fn {attachment, position} ->
      message.business_id
      |> MessageAttachment.insert_changeset(message.id, attachment.id, %{position: position})
      |> Repo.insert()
    end)
  end

  defp update_conversation(conversation, message, attachments) do
    result =
      Conversation
      |> where([c], c.id == ^conversation.id and c.business_id == ^conversation.business_id)
      |> where([c], is_nil(c.last_message_at) or c.last_message_at <= ^message.inserted_at)
      |> Repo.update_all(
        set: [
          last_message_at: message.inserted_at,
          last_message_preview: Message.preview(message, attachments),
          last_message_role: message.sender_type,
          updated_at: DateTime.truncate(message.inserted_at, :second)
        ]
      )

    update_waiting_state(conversation, message, result)

    {:ok, :updated}
  end

  defp update_waiting_state(conversation, %Message{sender_type: :client} = message, {1, _}) do
    Conversation
    |> where(
      [candidate],
      candidate.id == ^conversation.id and candidate.business_id == ^conversation.business_id and
        is_nil(candidate.waiting_since)
    )
    |> Repo.update_all(set: [waiting_since: message.inserted_at])
  end

  defp update_waiting_state(conversation, %Message{sender_type: :coach}, {1, _}) do
    Conversation
    |> where(
      [candidate],
      candidate.id == ^conversation.id and candidate.business_id == ^conversation.business_id
    )
    |> Repo.update_all(set: [waiting_since: nil])
  end

  defp update_waiting_state(_conversation, _message, {0, _}), do: :ok

  defp broadcast_message(conversation, message) do
    Phoenix.PubSub.broadcast(Easy.PubSub, "conversation:#{conversation.id}", {:chat_message_created, message})

    Phoenix.PubSub.broadcast(
      Easy.PubSub,
      "inbox:business:#{conversation.business_id}",
      {:conversation_updated, conversation.id}
    )
  end
end
