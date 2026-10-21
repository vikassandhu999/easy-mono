defmodule EasyWeb.Clients.ReviewReplyController do
  alias Easy.Reviews.Reply
  alias EasyWeb.Types.ChatMessageHistory
  alias EasyWeb.Types.Review
  use EasyWeb, :typed_controller
  typed(:index, query: Review.reply_query(), ok: {200, ChatMessageHistory.t()})
  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _) do
    opts =
      Enum.flat_map([:cursor, :limit, :review_id], fn key ->
        case Map.fetch(conn.query_params, to_string(key)) do
          {:ok, value} -> [{key, value}]
          :error -> []
        end
      end)

    with {:ok, result} <- Reply.list_client_replies(conn.assigns.ctx, opts), do: ok(conn, result)
  end
end
