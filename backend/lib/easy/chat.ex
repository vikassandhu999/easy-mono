defmodule Easy.Chat do
  alias Easy.Attachments.Attachment
  alias Easy.Chat.Conversation
  alias Easy.Chat.Message
  alias Easy.Chat.MessageAttachment
  alias Easy.Clients
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Forms.FormAssignment
  alias Easy.Forms.FormSubmission
  alias Easy.Forms.FormTemplate
  alias Easy.Orgs.Coach
  alias Easy.Repo
  alias Ecto.Multi

  import Ecto.Query

  @spec list_conversations(Ctx.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), conversations: [Conversation.t()]}}
  def list_conversations(%Ctx{} = ctx, opts \\ []) do
    offset = max(Keyword.get(opts, :offset, 0), 0)
    limit = min(max(Keyword.get(opts, :limit, 20), 0), 100)

    base =
      Conversation
      |> Conversation.for_business(ctx.business_id)
      |> constrain_to_visible_clients(ctx)

    count = Repo.aggregate(base, :count)

    conversations =
      base
      |> Conversation.include_client()
      |> Conversation.select_coach_unread()
      |> Conversation.recent()
      |> offset(^offset)
      |> limit(^limit)
      |> Repo.all()

    {:ok, %{count: count, conversations: conversations}}
  end

  @spec get_conversation(Ctx.t(), String.t()) :: {:ok, Conversation.t()} | {:error, :not_found}
  def get_conversation(%Ctx{} = ctx, conversation_id) do
    conversation =
      Conversation
      |> Conversation.for_business(ctx.business_id)
      |> Conversation.include_client()
      |> Conversation.select_coach_unread()
      |> Repo.get(conversation_id)

    with {:ok, conversation} <- ok_or_not_found(conversation),
         :ok <- Clients.authorize_client_id(ctx, conversation.client_id) do
      {:ok, conversation}
    end
  end

  @spec get_or_create_conversation_for_client(Ctx.t(), String.t()) ::
          {:ok, Conversation.t()} | {:error, :not_found}
  def get_or_create_conversation_for_client(%Ctx{} = ctx, client_id) do
    with {:ok, client} <- Clients.get_client(ctx, client_id) do
      upsert_conversation(ctx.business_id, client.id, :coach)
    end
  end

  @spec list_messages(Ctx.t(), String.t(), keyword()) ::
          {:ok, %{messages: [Message.t()], has_more: boolean()}} | {:error, :not_found}
  def list_messages(%Ctx{} = ctx, conversation_id, opts \\ []) do
    with {:ok, conversation} <- get_conversation(ctx, conversation_id) do
      {:ok, page_messages(ctx.business_id, conversation.id, opts)}
    end
  end

  @spec send_message(Ctx.t(), String.t(), map()) ::
          {:ok, Message.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def send_message(%Ctx{} = ctx, conversation_id, attrs) do
    with {:ok, coach} <- get_coach(ctx),
         {:ok, conversation} <- get_conversation(ctx, conversation_id) do
      insert_message(ctx, conversation, :coach, coach.id, attrs, :allow_embed)
    end
  end

  @spec mark_read(Ctx.t(), String.t()) :: {:ok, Conversation.t()} | {:error, :not_found}
  def mark_read(%Ctx{} = ctx, conversation_id) do
    with {:ok, conversation} <- get_conversation(ctx, conversation_id) do
      advance_read_cursor(conversation, :coach_last_read_at)
    end
  end

  @spec get_client_conversation(Ctx.t()) :: {:ok, Conversation.t()} | {:error, :not_found}
  def get_client_conversation(%Ctx{} = ctx) do
    with {:ok, client} <- get_client_account(ctx) do
      upsert_conversation(ctx.business_id, client.id, :client)
    end
  end

  @spec list_client_messages(Ctx.t(), keyword()) ::
          {:ok, %{messages: [Message.t()], has_more: boolean()}} | {:error, :not_found}
  def list_client_messages(%Ctx{} = ctx, opts \\ []) do
    with {:ok, conversation} <- get_client_conversation(ctx) do
      {:ok, page_messages(ctx.business_id, conversation.id, opts)}
    end
  end

  @spec send_client_message(Ctx.t(), map()) ::
          {:ok, Message.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def send_client_message(%Ctx{} = ctx, attrs) do
    with {:ok, client} <- get_client_account(ctx),
         {:ok, conversation} <- upsert_conversation(ctx.business_id, client.id, :client) do
      insert_message(ctx, conversation, :client, client.id, attrs, :reject_embed)
    end
  end

  @spec mark_client_read(Ctx.t()) :: {:ok, Conversation.t()} | {:error, :not_found}
  def mark_client_read(%Ctx{} = ctx) do
    with {:ok, conversation} <- get_client_conversation(ctx) do
      advance_read_cursor(conversation, :client_last_read_at)
    end
  end

  # Private

  defp upsert_conversation(business_id, client_id, unread_for) do
    business_id
    |> Conversation.insert_changeset(client_id)
    |> Repo.insert(on_conflict: :nothing)

    Conversation
    |> Conversation.for_client(business_id, client_id)
    |> Conversation.include_client()
    |> unread_select(unread_for)
    |> Repo.one()
    |> ok_or_not_found()
  end

  defp unread_select(query, :coach), do: Conversation.select_coach_unread(query)
  defp unread_select(query, :client), do: Conversation.select_client_unread(query)

  defp page_messages(business_id, conversation_id, opts) do
    limit = min(max(Keyword.get(opts, :limit, 50), 1), 100)

    messages =
      Message
      |> Message.for_conversation(business_id, conversation_id)
      |> maybe_before(business_id, conversation_id, Keyword.get(opts, :before))
      |> Message.newest()
      |> limit(^(limit + 1))
      |> Repo.all()

    {page, rest} = Enum.split(messages, limit)
    %{messages: page |> load_message_attachments(business_id) |> Enum.reverse(), has_more: rest != []}
  end

  defp maybe_before(query, _business_id, _conversation_id, nil), do: query

  defp maybe_before(query, business_id, conversation_id, before_id) do
    case Message |> Message.for_conversation(business_id, conversation_id) |> Repo.get(before_id) do
      nil -> query
      cursor -> Message.before_message(query, cursor)
    end
  end

  defp insert_message(ctx, conversation, sender_type, sender_id, attrs, embed_policy) do
    attrs = attrs |> normalize_attrs() |> normalize_body()

    base_changeset =
      Message.insert_changeset(ctx.business_id, sender_type, sender_id, conversation.id, nil, attrs)

    with {:ok, attachment_ids} <- validate_attachment_ids(base_changeset, attrs),
         {:ok, attachments} <- load_attachments(ctx, conversation.client_id, attachment_ids),
         {:ok, embed} <- resolve_embed(ctx, conversation.client_id, attrs[:embed], embed_policy, base_changeset),
         changeset <-
           Message.insert_changeset(ctx.business_id, sender_type, sender_id, conversation.id, embed, attrs)
           |> require_content(attachments, embed),
         {:ok, message} <- persist_message(changeset, conversation, attachments) do
      broadcast_message(conversation, message)
      {:ok, message}
    end
  end

  defp persist_message(changeset, conversation, attachments) do
    Multi.new()
    |> Multi.insert(:message, changeset)
    |> Multi.run(:attachment_links, fn repo, %{message: message} ->
      insert_attachment_links(repo, message.business_id, message.id, attachments)
    end)
    |> Multi.run(:conversation, fn repo, %{message: message, attachment_links: attachments} ->
      update_conversation(repo, conversation, message, attachments)
    end)
    |> Multi.run(:complete_message, fn repo, %{message: message} ->
      reload_message(repo, message.business_id, message.id)
    end)
    |> Repo.transaction()
    |> case do
      {:ok, %{complete_message: message}} -> {:ok, message}
      {:error, _operation, reason, _changes} -> {:error, reason}
    end
  end

  defp normalize_attrs(attrs) do
    Enum.reduce(attrs, %{}, fn
      {"body", value}, acc -> Map.put(acc, :body, value)
      {"attachment_ids", value}, acc -> Map.put(acc, :attachment_ids, value)
      {"embed", value}, acc -> Map.put(acc, :embed, normalize_embed(value))
      {:embed, value}, acc -> Map.put(acc, :embed, normalize_embed(value))
      {key, _value}, acc when is_binary(key) -> acc
      {key, value}, acc -> Map.put(acc, key, value)
    end)
  end

  defp normalize_embed(embed) when is_map(embed) do
    Enum.reduce(embed, %{}, fn
      {"type", value}, acc -> Map.put(acc, :type, value)
      {"id", value}, acc -> Map.put(acc, :id, value)
      {key, _value}, acc when is_binary(key) -> acc
      {key, value}, acc -> Map.put(acc, key, value)
    end)
  end

  defp normalize_embed(embed), do: embed

  defp normalize_body(%{body: body} = attrs) when is_binary(body) do
    case String.trim(body) do
      "" -> Map.put(attrs, :body, nil)
      body -> Map.put(attrs, :body, body)
    end
  end

  defp normalize_body(attrs), do: attrs

  defp validate_attachment_ids(changeset, attrs) do
    ids = Map.get(attrs, :attachment_ids, [])

    cond do
      not is_list(ids) ->
        {:error, Ecto.Changeset.add_error(changeset, :attachment_ids, "is invalid")}

      length(ids) > 4 ->
        {:error, Ecto.Changeset.add_error(changeset, :attachment_ids, "should have at most 4 item(s)")}

      true ->
        case cast_attachment_ids(ids) do
          {:ok, ids} -> validate_unique_attachment_ids(changeset, ids)
          :error -> {:error, Ecto.Changeset.add_error(changeset, :attachment_ids, "is invalid")}
        end
    end
  end

  defp validate_unique_attachment_ids(changeset, ids) do
    if length(Enum.uniq(ids)) == length(ids),
      do: {:ok, ids},
      else: {:error, Ecto.Changeset.add_error(changeset, :attachment_ids, "must be unique")}
  end

  defp cast_attachment_ids(ids) do
    Enum.reduce_while(ids, {:ok, []}, fn id, {:ok, cast_ids} ->
      case Ecto.UUID.cast(id) do
        {:ok, id} -> {:cont, {:ok, [id | cast_ids]}}
        :error -> {:halt, :error}
      end
    end)
    |> case do
      {:ok, ids} -> {:ok, Enum.reverse(ids)}
      :error -> :error
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

  defp resolve_embed(_ctx, _client_id, nil, _policy, _changeset), do: {:ok, nil}

  defp resolve_embed(_ctx, _client_id, _embed, :reject_embed, changeset),
    do: {:error, Ecto.Changeset.add_error(changeset, :embed, "is not allowed")}

  defp resolve_embed(ctx, client_id, %{type: type, id: id}, :allow_embed, _changeset)
       when type in [:form_submission, "form_submission"] and is_binary(id) do
    case Ecto.UUID.cast(id) do
      {:ok, id} -> resolve_form_submission(ctx, client_id, id)
      :error -> {:error, :not_found}
    end
  end

  defp resolve_embed(_ctx, _client_id, _embed, :allow_embed, changeset),
    do: {:error, Ecto.Changeset.add_error(changeset, :embed, "is invalid")}

  defp resolve_form_submission(ctx, client_id, id) do
    result =
      from(submission in FormSubmission,
        join: assignment in FormAssignment,
        on:
          assignment.id == submission.form_assignment_id and
            assignment.business_id == submission.business_id and
            assignment.client_id == submission.client_id,
        join: template in FormTemplate,
        on:
          template.id == assignment.form_template_id and
            template.business_id == submission.business_id,
        where:
          submission.id == ^id and submission.business_id == ^ctx.business_id and
            submission.client_id == ^client_id,
        select: {submission, assignment, template}
      )
      |> Repo.one()

    case result do
      {submission, assignment, template} ->
        {:ok,
         %{
           type: :form_submission,
           id: submission.id,
           snapshot: %{
             "form_assignment_id" => assignment.id,
             "title" => template.name,
             "submitted_at" => DateTime.to_iso8601(submission.submitted_at)
           }
         }}

      nil ->
        {:error, :not_found}
    end
  end

  defp require_content(changeset, [], nil) do
    if Ecto.Changeset.get_field(changeset, :body),
      do: changeset,
      else: Ecto.Changeset.add_error(changeset, :body, "can't be blank")
  end

  defp require_content(changeset, _attachments, _embed), do: changeset

  defp insert_attachment_links(repo, business_id, message_id, attachments) do
    result =
      attachments
      |> Enum.with_index()
      |> Enum.reduce_while(:ok, fn {attachment, position}, :ok ->
        case business_id
             |> MessageAttachment.insert_changeset(message_id, attachment.id, %{position: position})
             |> repo.insert() do
          {:ok, _link} -> {:cont, :ok}
          {:error, changeset} -> {:halt, {:error, changeset}}
        end
      end)

    case result do
      :ok -> {:ok, attachments}
      error -> error
    end
  end

  defp update_conversation(repo, conversation, message, attachments) do
    Conversation
    |> where([c], c.id == ^conversation.id and c.business_id == ^conversation.business_id)
    |> where([c], is_nil(c.last_message_at) or c.last_message_at <= ^message.inserted_at)
    |> repo.update_all(
      set: [
        last_message_at: message.inserted_at,
        last_message_preview: message_preview(message, attachments),
        updated_at: DateTime.truncate(message.inserted_at, :second)
      ]
    )

    {:ok, :updated}
  end

  defp message_preview(%Message{body: body}, _attachments) when is_binary(body),
    do: String.slice(body, 0, 200)

  defp message_preview(%Message{embed_snapshot: %{"title" => title}}, _attachments),
    do: "Shared #{title}"

  defp message_preview(_message, [_, _ | _] = attachments), do: "#{length(attachments)} attachments"
  defp message_preview(_message, [%Attachment{content_type: "image/" <> _} | _]), do: "Photo"
  defp message_preview(_message, [%Attachment{content_type: "video/" <> _} | _]), do: "Video"
  defp message_preview(_message, [%Attachment{content_type: "audio/" <> _} | _]), do: "Voice note"
  defp message_preview(_message, [_attachment | _]), do: "Attachment"

  defp reload_message(repo, business_id, message_id) do
    Message
    |> where([message], message.id == ^message_id and message.business_id == ^business_id)
    |> Message.include_attachments()
    |> repo.one()
    |> ok_or_not_found()
  end

  defp load_message_attachments([], _business_id), do: []

  defp load_message_attachments(messages, business_id) do
    ids = Enum.map(messages, & &1.id)

    loaded =
      Message
      |> where([message], message.business_id == ^business_id and message.id in ^ids)
      |> Message.include_attachments()
      |> Repo.all()
      |> Map.new(&{&1.id, &1})

    Enum.map(messages, &Map.fetch!(loaded, &1.id))
  end

  defp broadcast_message(conversation, message) do
    Phoenix.PubSub.broadcast(Easy.PubSub, "conversation:#{conversation.id}", {:chat_message_created, message})

    Phoenix.PubSub.broadcast(
      Easy.PubSub,
      "inbox:business:#{conversation.business_id}",
      {:conversation_updated, conversation.id}
    )
  end

  defp advance_read_cursor(conversation, field) do
    {1, [updated]} =
      from(c in Conversation,
        where: c.id == ^conversation.id,
        update: [set: [{^field, c.last_message_at}]],
        select: c
      )
      |> Repo.update_all([])

    {:ok, conversation |> Map.put(field, Map.get(updated, field)) |> Map.put(:unread_count, 0)}
  end

  # Coach inbox listings must only surface conversations for clients the caller
  # can see: owner -> all, trainer -> assigned only. The join predicate mirrors
  # Client.visible_to/2 — keep them in sync if visibility semantics change.
  defp constrain_to_visible_clients(query, %Ctx{owner?: true}), do: query

  defp constrain_to_visible_clients(query, %Ctx{coach_id: coach_id}) when not is_nil(coach_id) do
    join(query, :inner, [c], cl in Client, on: cl.id == c.client_id and cl.assigned_coach_id == ^coach_id)
  end

  # Fail closed: coach routes always provide owner? or coach_id. A ctx with
  # neither is malformed and must see nothing.
  defp constrain_to_visible_clients(query, %Ctx{}), do: where(query, false)

  defp get_client_account(%Ctx{} = ctx) do
    Client
    |> Client.for_business(ctx.business_id)
    |> Client.for_user(ctx.user_id)
    |> Repo.one()
    |> ok_or_not_found()
  end

  defp get_coach(%Ctx{} = ctx) do
    Coach
    |> Coach.for_business(ctx.business_id)
    |> Coach.for_user(ctx.user_id)
    |> Repo.one()
    |> ok_or_not_found()
  end

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
