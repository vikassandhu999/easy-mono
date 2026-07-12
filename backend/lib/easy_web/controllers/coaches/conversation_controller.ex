defmodule EasyWeb.Coaches.ConversationController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Chat
  alias OpenApiSpex.Operation

  alias EasyWeb.OpenApi.Schemas.{
    ChatMessageResponse,
    ChatMessagesResponse,
    CoachChatMessageCreateRequest,
    ConversationListResponse,
    ConversationResponse,
    ErrorResponse
  }

  plug OpenApiSpex.Plug.CastAndValidate,
       [json_render_error_v2: true] when action in [:create_message, :mark_read]

  tags ["coach conversations"]

  operation :index,
    summary: "List conversations (inbox)",
    operation_id: "listCoachConversations",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:offset, :query, :integer, "Offset", required: false),
      Operation.parameter(:limit, :query, :integer, "Limit (max 100)", required: false)
    ],
    responses: [
      ok: {"Conversations", "application/json", ConversationListResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse}
    ]

  operation :show_for_client,
    summary: "Get (or create) a client's conversation",
    operation_id: "getCoachClientConversation",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:client_id, :path, :string, "Client id")],
    responses: [
      ok: {"Conversation", "application/json", ConversationResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :show,
    summary: "Get a conversation",
    operation_id: "getCoachConversation",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Conversation id")],
    responses: [
      ok: {"Conversation", "application/json", ConversationResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :messages,
    summary: "List messages (cursor-paginated, ascending)",
    operation_id: "listCoachConversationMessages",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:id, :path, :string, "Conversation id"),
      Operation.parameter(:before, :query, :string, "Message id cursor — return messages older than this", required: false),
      Operation.parameter(:limit, :query, :integer, "Page size (default 50, max 100)", required: false)
    ],
    responses: [
      ok: {"Messages", "application/json", ChatMessagesResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :create_message,
    summary: "Send a message",
    operation_id: "createCoachConversationMessage",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Conversation id")],
    request_body: {"Message", "application/json", CoachChatMessageCreateRequest, required: true},
    responses: [
      created: {"Message", "application/json", ChatMessageResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :mark_read,
    summary: "Mark the conversation read (coach side)",
    operation_id: "markCoachConversationRead",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Conversation id")],
    responses: [
      ok: {"Conversation", "application/json", ConversationResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    opts =
      [offset: parse_int(params["offset"]), limit: parse_int(params["limit"])]
      |> Enum.reject(fn {_k, v} -> is_nil(v) end)

    with {:ok, %{conversations: conversations, count: count}} <-
           Chat.list_conversations(conn.assigns.ctx, opts) do
      render(conn, :index, conversations: conversations, count: count)
    end
  end

  @spec show_for_client(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show_for_client(conn, %{"client_id" => client_id}) do
    with {:ok, conversation} <-
           Chat.get_or_create_conversation_for_client(conn.assigns.ctx, client_id) do
      render(conn, :show, conversation: conversation)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    with {:ok, conversation} <- Chat.get_conversation(conn.assigns.ctx, id) do
      render(conn, :show, conversation: conversation)
    end
  end

  @spec messages(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def messages(conn, %{"id" => id} = params) do
    opts =
      [before: params["before"], limit: parse_int(params["limit"])]
      |> Enum.reject(fn {_k, v} -> is_nil(v) end)

    with {:ok, %{messages: messages, has_more: has_more}} <-
           Chat.list_messages(conn.assigns.ctx, id, opts) do
      render(conn, :messages, messages: messages, has_more: has_more)
    end
  end

  @spec create_message(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create_message(conn, _params) do
    id = conn.path_params["id"]

    with {:ok, message} <- Chat.send_message(conn.assigns.ctx, id, conn.body_params) do
      conn |> put_status(:created) |> render(:message, message: message)
    end
  end

  @spec mark_read(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def mark_read(conn, _params) do
    id = conn.path_params["id"]

    with {:ok, conversation} <- Chat.mark_read(conn.assigns.ctx, id) do
      render(conn, :show, conversation: conversation)
    end
  end

  defp parse_int(nil), do: nil
  defp parse_int(value) when is_integer(value), do: value

  defp parse_int(value) when is_binary(value) do
    case Integer.parse(value) do
      {int, ""} -> int
      _ -> nil
    end
  end
end
