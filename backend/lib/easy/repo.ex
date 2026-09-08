defmodule Easy.Repo do
  use Ecto.Repo,
    otp_app: :easy,
    adapter: Ecto.Adapters.Postgres

  # One repeatable-read transaction for reads and writes that span several
  # queries. A writer that loses a serialization race gets a conflict, not a crash.
  @spec snapshot((-> {:ok, term()} | {:error, term()})) :: {:ok, term()} | {:error, term()}
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
