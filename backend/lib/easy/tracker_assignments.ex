defmodule Easy.Trackers.Assignments do
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Repo
  alias Easy.Result
  alias Easy.Revision
  alias Easy.Trackers
  alias Easy.Trackers.Assignment
  alias Easy.Trackers.Content
  alias Easy.Trackers.Template
  import Ecto.Query

  @spec list_for_client(Ctx.t(), String.t()) :: {:ok, [map()]} | {:error, term()}
  def list_for_client(ctx, client_id) do
    with {:ok, client} <- Trackers.client(ctx, client_id) do
      {:ok, current(ctx, client_id, Client.local_date(client, DateTime.utc_now())) |> Enum.map(&present(ctx, &1))}
    end
  end

  @spec add_for_client(Ctx.t(), String.t(), map()) :: {:ok, map()} | {:error, term()}
  def add_for_client(ctx, client_id, attrs) do
    mutate(ctx, client_id, fn client, date ->
      with {:ok, tracker} <- Trackers.active_tracker(ctx, value(attrs, :tracker_id)), {:ok, row} <- insert(ctx, client.id, tracker.id, date, attrs), do: {:ok, present(ctx, row)}
    end)
  end

  @spec change_for_client(Ctx.t(), String.t(), String.t(), map()) :: {:ok, map()} | {:error, term()}
  def change_for_client(ctx, client_id, id, attrs) do
    mutate(ctx, client_id, fn client, date ->
      with {:ok, row} <- get_current(ctx, client.id, id, date),
           {:ok, _tracker} <- Trackers.active_tracker(ctx, row.tracker_id),
           {:ok, _} <- close(row, date),
           {:ok, next} <- insert(ctx, client.id, row.tracker_id, date, attrs),
           do: {:ok, present(ctx, next)}
    end)
  end

  @spec end_for_client(Ctx.t(), String.t(), String.t()) :: {:ok, term()} | {:error, term()}
  def end_for_client(ctx, client_id, id) do
    mutate(ctx, client_id, fn client, date ->
      row = Repo.one(from(a in Assignment, where: a.id == ^id and a.business_id == ^ctx.business_id and a.client_id == ^client.id))
      end_current(row, date)
    end)
  end

  defp end_current(nil, _), do: {:error, :not_found}

  defp end_current(row, date) do
    if row.ends_on && Date.before?(row.ends_on, date), do: {:ok, row}, else: close(row, date)
  end

  @spec apply_for_client(Ctx.t(), String.t(), String.t(), integer()) :: {:ok, [map()]} | {:error, term()}
  def apply_for_client(ctx, client_id, template_id, expected) do
    mutate(ctx, client_id, fn client, date ->
      with {:ok, content} <- template_content(ctx, template_id, expected), {:ok, rows} <- match(ctx, client.id, date, content), do: {:ok, Enum.map(rows, &present(ctx, &1))}
    end)
  end

  @spec template_content(Ctx.t(), String.t(), term()) :: {:ok, map()} | {:error, term()}
  def template_content(ctx, id, expected \\ :any) do
    case Repo.get(Template.for_business(ctx.business_id), id) do
      nil ->
        {:error, :not_found}

      row ->
        with true <- is_nil(row.archived_at) || {:error, :conflict}, :ok <- Revision.check(row, expected), do: Content.validate(ctx, row.content)
    end
  end

  @spec match(Ctx.t(), String.t(), Date.t(), map()) :: {:ok, [Assignment.t()]} | {:error, term()}
  def match(ctx, client_id, date, content) do
    rows = current(ctx, client_id, date)
    items = content["items"]
    ending = Enum.reject(rows, fn row -> Enum.any?(items, &same?(row, &1)) end)
    adding = Enum.reject(items, fn item -> Enum.any?(rows, &same?(&1, item)) end)

    with {:ok, _} <- Result.traverse(ending, &close(&1, date)),
         {:ok, _} <- Result.traverse(adding, &insert(ctx, client_id, &1["tracker_id"], date, &1)) do
      {:ok, current(ctx, client_id, date)}
    end
  end

  defp same?(row, item), do: row.tracker_id == item["tracker_id"] and to_string(row.timing) == item["timing"] and row.weekday == item["weekday"]

  @spec current(Ctx.t(), String.t(), Date.t()) :: [Assignment.t()]
  def current(ctx, client_id, date) do
    Repo.all(
      from(a in Assignment,
        where: a.business_id == ^ctx.business_id and a.client_id == ^client_id,
        where: a.starts_on <= ^date and (is_nil(a.ends_on) or a.ends_on >= ^date),
        preload: [:tracker],
        order_by: [asc: a.inserted_at, asc: a.id]
      )
    )
  end

  @spec present(Ctx.t(), Assignment.t()) :: map()
  def present(ctx, row) do
    row = Repo.preload(row, :tracker)
    Map.take(row, [:id, :timing, :weekday, :starts_on, :ends_on]) |> Map.put(:tracker, Trackers.present(ctx, row.tracker))
  end

  defp get_current(ctx, client_id, id, date) do
    case Enum.find(current(ctx, client_id, date), &(&1.id == id)) do
      nil -> {:error, :not_found}
      row -> {:ok, row}
    end
  end

  defp close(row, date), do: row |> Ecto.Changeset.change(ends_on: Date.add(date, -1)) |> Repo.update()
  defp insert(ctx, client_id, tracker_id, date, attrs), do: Assignment.insert_changeset(ctx.business_id, client_id, tracker_id, date, attrs) |> Repo.insert()

  defp mutate(ctx, client_id, operation) do
    with :ok <- Ctx.ensure_coach(ctx), {:ok, _} <- Trackers.client(ctx, client_id) do
      Repo.transact(fn ->
        client = Repo.one(from(c in Client, where: c.business_id == ^ctx.business_id and c.id == ^client_id, lock: "FOR UPDATE")) |> Repo.preload([:terms, :business])
        operation.(client, Client.local_date(client, DateTime.utc_now()))
      end)
    end
  end

  defp value(attrs, key), do: Map.get(attrs, key, Map.get(attrs, to_string(key)))
end
