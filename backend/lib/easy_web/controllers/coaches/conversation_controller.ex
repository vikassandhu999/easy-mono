defmodule EasyWeb.Coaches.ConversationController do
  use EasyWeb, :controller
  use EasyWeb.TypedRoute

  alias Easy.Chat
  alias EasyWeb.Types.{ChatMessage, ChatMessagePage, Conversation}

  typed(:index, query: Conversation.list_query(), ok: {200, page(Conversation.t())})
  typed(:show_for_client, ok: {200, data(Conversation.t())})
  typed(:show, ok: {200, data(Conversation.t())})
  typed(:messages, query: ChatMessage.list_query(), ok: {200, ChatMessagePage.t()})
  typed(:create_message, body: ChatMessage.coach_create(), ok: {201, data(ChatMessage.t())})
  typed(:mark_read, ok: {200, data(Conversation.t())})
  typed(:mark_handled, body: Conversation.mark_handled(), ok: {204, nil})

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    params = conn.query_params

    opts = [
      offset: Map.get(params, "offset", 0),
      limit: Map.get(params, "limit", 20),
      search: params["search"]
    ]

    with {:ok, %{conversations: conversations, count: count}} <-
           Chat.list_conversations(conn.assigns.ctx, opts) do
      ok(conn, %{data: conversations, count: count})
    end
  end

  @spec show_for_client(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show_for_client(conn, %{"client_id" => client_id}) do
    with {:ok, conversation} <-
           Chat.get_or_create_conversation_for_client(conn.assigns.ctx, client_id) do
      ok(conn, %{data: conversation})
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    with {:ok, conversation} <- Chat.get_conversation(conn.assigns.ctx, id) do
      ok(conn, %{data: conversation})
    end
  end

  @spec messages(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def messages(conn, %{"id" => id}) do
    params = conn.query_params
    opts = [before: params["before"], limit: Map.get(params, "limit", 20)]

    with {:ok, %{messages: messages, has_more: has_more}} <-
           Chat.list_messages(conn.assigns.ctx, id, opts) do
      ok(conn, %{data: messages, has_more: has_more})
    end
  end

  @spec create_message(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create_message(conn, _params) do
    with {:ok, message} <-
           Chat.send_message(conn.assigns.ctx, conn.path_params["id"], conn.body_params) do
      ok(conn, %{data: message})
    end
  end

  @spec mark_read(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def mark_read(conn, _params) do
    with {:ok, conversation} <- Chat.mark_read(conn.assigns.ctx, conn.path_params["id"]) do
      ok(conn, %{data: conversation})
    end
  end

  @spec mark_handled(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def mark_handled(conn, _params) do
    with {:ok, :handled} <-
           Chat.mark_conversation_handled(
             conn.assigns.ctx,
             conn.path_params["id"],
             conn.body_params[:expected_last_message_at]
           ) do
      ok(conn)
    end
  end
end
