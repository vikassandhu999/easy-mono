defmodule EasyWeb.Coaches.ThreadJSON do
  alias Easy.Threads.Thread
  alias Easy.Threads.ThreadMessage

  @spec index(%{threads: [Thread.t()]}) :: map()
  def index(%{threads: threads}), do: %{data: Enum.map(threads, &data/1), count: length(threads)}

  @spec show(%{thread: Thread.t()}) :: map()
  def show(%{thread: thread}), do: %{data: detail(thread)}

  @spec message(%{message: ThreadMessage.t()}) :: map()
  def message(%{message: message}), do: %{data: message_data(message)}

  @spec data(Thread.t()) :: map()
  def data(%Thread{} = t) do
    %{
      id: t.id,
      client_id: t.client_id,
      module: t.module,
      subject_type: t.subject_type,
      subject_ref: t.subject_ref,
      title: t.title,
      status: t.status,
      priority: t.priority,
      last_message_at: t.last_message_at,
      last_message_preview: t.last_message_preview,
      created_by_type: t.created_by_type,
      created_by_id: t.created_by_id,
      inserted_at: t.inserted_at,
      updated_at: t.updated_at
    }
  end

  @spec detail(Thread.t()) :: map()
  def detail(%Thread{} = t) do
    Map.put(data(t), :messages, Enum.map(messages(t.messages), &message_data/1))
  end

  @spec message_data(ThreadMessage.t()) :: map()
  def message_data(%ThreadMessage{} = m) do
    %{
      id: m.id,
      thread_id: m.thread_id,
      author_type: m.author_type,
      author_id: m.author_id,
      body: m.body,
      kind: m.kind,
      metadata: m.metadata,
      inserted_at: m.inserted_at,
      updated_at: m.updated_at
    }
  end

  defp messages(list) when is_list(list), do: list
  defp messages(_), do: []
end
