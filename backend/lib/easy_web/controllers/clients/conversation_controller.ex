defmodule EasyWeb.Clients.ConversationController do
  use EasyWeb, :typed_controller

  alias Easy.Chat
  alias EasyWeb.Types.{ChatMessage, ChatMessageHistory, ChatMessagePage, Conversation}

  typed(:show, ok: {200, data(Conversation.t())})
  typed(:messages, query: ChatMessage.list_query(), ok: {200, ChatMessagePage.t()})
  typed(:history, query: ChatMessage.history_query(), ok: {200, ChatMessageHistory.t()})
  typed(:create_message, body: ChatMessage.client_create(), ok: {201, data(ChatMessage.t())})
  typed(:mark_read, query: Conversation.mark_read_query(), ok: {200, data(Conversation.t())})

  @spec history(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def history(conn, _params) do
    params = conn.query_params
    opts = [cursor: params["cursor"], limit: params["limit"]]
    with {:ok, page} <- Chat.list_client_message_page(conn.assigns.ctx, opts), do: ok(conn, page)
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    with {:ok, conversation} <- Chat.get_client_conversation(conn.assigns.ctx) do
      ok(conn, %{data: conversation})
    end
  end

  @spec messages(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def messages(conn, _params) do
    opts =
      conn.query_params
      |> Map.take(["before", "limit"])
      |> Enum.map(fn
        {"before", value} -> {:before, value}
        {"limit", value} -> {:limit, value}
      end)

    with {:ok, %{messages: messages, has_more: has_more}} <-
           Chat.list_client_messages(conn.assigns.ctx, opts) do
      ok(conn, %{data: messages, has_more: has_more})
    end
  end

  @spec create_message(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create_message(conn, _params) do
    with {:ok, message} <- Chat.send_client_message(conn.assigns.ctx, conn.body_params) do
      ok(conn, %{data: message})
    end
  end

  @spec mark_read(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def mark_read(conn, _params) do
    with {:ok, conversation} <- Chat.mark_client_read(conn.assigns.ctx, conn.query_params["through"]) do
      ok(conn, %{data: conversation})
    end
  end
end
