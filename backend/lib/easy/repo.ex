defmodule Easy.Repo do
  use Ecto.Repo,
    otp_app: :easy,
    adapter: Ecto.Adapters.Postgres

  import Ecto.Query, only: [distinct: 2, exclude: 2, select: 3, subquery: 1]

  @spec count_unique(Ecto.Queryable.t(), atom()) :: non_neg_integer()
  def count_unique(query, field_name \\ :id) do
    query
    |> exclude(:select)
    |> select([row], field(row, ^field_name))
    |> distinct(true)
    |> subquery()
    |> aggregate(:count)
  end

  # One repeatable-read transaction for reads and writes that span several
  # queries. A writer that loses a serialization race gets a conflict, not a crash.
  @spec snapshot((-> {:ok, value} | {:error, reason})) :: {:ok, value} | {:error, :conflict | reason}
        when value: var, reason: var
  def snapshot(operation) do
    if in_transaction?() do
      operation.()
    else
      transact(fn ->
        {:ok, _} = query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ")
        operation.()
      end)
    end
  rescue
    error in Postgrex.Error ->
      if error.postgres[:code] == :serialization_failure,
        do: {:error, :conflict},
        else: reraise(error, __STACKTRACE__)
  end
end
