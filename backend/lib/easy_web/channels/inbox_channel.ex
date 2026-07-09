defmodule EasyWeb.InboxChannel do
  use Phoenix.Channel

  @impl true
  def join("inbox", _payload, socket) do
    %{ctx: ctx, role: role} = socket.assigns

    if role == :coach do
      # The channel process subscribes to the business-wide topic the context
      # broadcasts on; the client never supplies (or learns) the business id.
      Phoenix.PubSub.subscribe(Easy.PubSub, "inbox:business:#{ctx.business_id}")
      {:ok, socket}
    else
      {:error, %{reason: "unauthorized"}}
    end
  end

  # Payload is id-only by design: trainers in the business may not be allowed to
  # see this client; the frontend refetches over HTTP, where visibility filters.
  @impl true
  def handle_info({:conversation_updated, conversation_id}, socket) do
    push(socket, "conversation_updated", %{conversation_id: conversation_id})
    {:noreply, socket}
  end

  def handle_info(_message, socket), do: {:noreply, socket}
end
