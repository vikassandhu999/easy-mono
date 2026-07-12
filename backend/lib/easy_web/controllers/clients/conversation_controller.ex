defmodule EasyWeb.Clients.ConversationController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Chat
  alias OpenApiSpex.Operation

  alias EasyWeb.OpenApi.Schemas.{
    ChatMessageResponse,
    ChatMessagesResponse,
    ClientChatMessageCreateRequest,
    ConversationResponse,
    ErrorResponse
  }

  plug OpenApiSpex.Plug.CastAndValidate,
       [json_render_error_v2: true] when action in [:create_message, :mark_read]

  tags ["client conversation"]

  operation :show,
    summary: "Get (or create) my conversation",
    operation_id: "getClientConversation",
    security: [%{"bearerAuth" => []}],
    responses: [
      ok: {"Conversation", "application/json", ConversationResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :messages,
    summary: "List my messages (cursor-paginated, ascending)",
    operation_id: "listClientConversationMessages",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:before, :query, :string, "Message id cursor — return messages older than this", required: false),
      Operation.parameter(:limit, :query, :integer, "Page size (default 50, max 100)", required: false)
    ],
    responses: [
      ok: {"Messages", "application/json", ChatMessagesResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :create_message,
    summary: "Send a message to my coach team",
    operation_id: "createClientConversationMessage",
    security: [%{"bearerAuth" => []}],
    request_body: {"Message", "application/json", ClientChatMessageCreateRequest, required: true},
    responses: [
      created: {"Message", "application/json", ChatMessageResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :mark_read,
    summary: "Mark my conversation read",
    operation_id: "markClientConversationRead",
    security: [%{"bearerAuth" => []}],
    responses: [
      ok: {"Conversation", "application/json", ConversationResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    with {:ok, conversation} <- Chat.get_client_conversation(conn.assigns.ctx) do
      render(conn, :show, conversation: conversation)
    end
  end

  @spec messages(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def messages(conn, params) do
    opts =
      [before: params["before"], limit: parse_int(params["limit"])]
      |> Enum.reject(fn {_k, v} -> is_nil(v) end)

    with {:ok, %{messages: messages, has_more: has_more}} <-
           Chat.list_client_messages(conn.assigns.ctx, opts) do
      render(conn, :messages, messages: messages, has_more: has_more)
    end
  end

  @spec create_message(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create_message(conn, _params) do
    with {:ok, message} <- Chat.send_client_message(conn.assigns.ctx, conn.body_params) do
      conn |> put_status(:created) |> render(:message, message: message)
    end
  end

  @spec mark_read(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def mark_read(conn, _params) do
    with {:ok, conversation} <- Chat.mark_client_read(conn.assigns.ctx) do
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
