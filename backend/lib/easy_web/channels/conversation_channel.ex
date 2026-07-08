defmodule EasyWeb.ConversationChannel do
  use Phoenix.Channel

  alias Easy.Chat
  alias EasyWeb.Coaches.ConversationJSON

  @impl true
  def join("conversation:" <> conversation_id, _payload, socket) do
    case authorize(socket, conversation_id) do
      :ok -> {:ok, socket}
      :error -> {:error, %{reason: "unauthorized"}}
    end
  end

  @impl true
  def handle_info({:chat_message_created, message}, socket) do
    push(socket, "message_new", ConversationJSON.message_data(message))
    {:noreply, socket}
  end

  def handle_info(_message, socket), do: {:noreply, socket}

  defp authorize(%{assigns: %{role: :client, ctx: ctx}}, conversation_id) do
    case Chat.get_client_conversation(ctx) do
      {:ok, %{id: ^conversation_id}} -> :ok
      _ -> :error
    end
  end

  defp authorize(%{assigns: %{role: :coach, ctx: ctx}}, conversation_id) do
    case Chat.get_conversation(ctx, conversation_id) do
      {:ok, _conversation} -> :ok
      _ -> :error
    end
  end

  defp authorize(_socket, _conversation_id), do: :error
end
