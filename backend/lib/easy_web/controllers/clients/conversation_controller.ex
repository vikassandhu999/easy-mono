defmodule EasyWeb.Clients.ConversationController do
  use EasyWeb, :controller
  use EasyWeb.TypedRoute

  alias Easy.Chat
  alias EasyWeb.Types.{ChatMessage, ChatMessagePage, Conversation}

  typed(:show, ok: {200, data(Conversation.t())})
  typed(:messages, query: ChatMessage.list_query(), ok: {200, ChatMessagePage.t()})
  typed(:create_message, body: ChatMessage.client_create(), ok: {201, data(ChatMessage.t())})
  typed(:mark_read, ok: {200, data(Conversation.t())})

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
    with {:ok, conversation} <- Chat.mark_client_read(conn.assigns.ctx) do
      ok(conn, %{data: conversation})
    end
  end
end
