defmodule Easy.Revision do
  alias Easy.Repo
  import Ecto.Changeset
  import Ecto.Query

  @spec stale(struct()) :: Ecto.Changeset.t()
  def stale(record), do: record |> change() |> add_error(:revision, "is stale") |> Map.put(:action, :stale_revision)

  @spec check(struct() | nil, non_neg_integer() | :any) :: :ok | {:error, Ecto.Changeset.t()}
  def check(_record, :any), do: :ok
  def check(%{revision: revision}, revision), do: :ok
  def check(record, _expected), do: {:error, stale(record)}

  @spec mutate(struct() | nil, non_neg_integer() | :any, (struct() -> {:ok, term()} | {:error, term()})) :: term()
  def mutate(nil, _expected, _mutation), do: Repo.rollback(:not_found)

  def mutate(record, expected, mutation) do
    with :ok <- check(record, expected), {:ok, result} <- mutation.(record) do
      result
    else
      {:error, reason} -> Repo.rollback(reason)
    end
  end

  @type mutation() :: (struct() -> {:ok, term()} | {:error, term()})

  @spec locked(Ecto.Queryable.t(), String.t(), pos_integer() | :any, mutation()) :: {:ok, term()} | {:error, term()}
  def locked(query, id, expected, mutation) do
    Repo.transaction(fn -> query |> lock("FOR UPDATE") |> Repo.get(id) |> mutate(expected, mutation) end)
  end
end
