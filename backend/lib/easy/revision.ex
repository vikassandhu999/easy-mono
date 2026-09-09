defmodule Easy.Revision do
  alias Easy.Repo
  import Ecto.Changeset
  import Ecto.Query

  @spec stale(struct()) :: Ecto.Changeset.t()
  def stale(record), do: record |> change() |> add_error(:revision, "is stale") |> Map.put(:action, :stale_revision)

  @spec check(struct(), non_neg_integer() | :any) :: :ok | {:error, Ecto.Changeset.t()}
  def check(_record, :any), do: :ok
  def check(%{revision: revision}, revision), do: :ok
  def check(record, _expected), do: {:error, stale(record)}

  @type mutation(value, reason) :: (struct() -> {:ok, value} | {:error, reason})

  @spec locked(Ecto.Queryable.t(), String.t(), pos_integer() | :any, mutation(value, reason)) ::
          {:ok, value} | {:error, :not_found | Ecto.Changeset.t() | reason}
        when value: var, reason: var
  def locked(query, id, expected, mutation) do
    Repo.transact(fn -> query |> lock("FOR UPDATE") |> Repo.get(id) |> mutate(expected, mutation) end)
  end

  defp mutate(nil, _expected, _mutation), do: {:error, :not_found}

  defp mutate(record, expected, mutation) do
    with :ok <- check(record, expected) do
      mutation.(record)
    end
  end
end
