defmodule Easy.Repo do
  use Ecto.Repo,
    otp_app: :easy,
    adapter: Ecto.Adapters.Postgres

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
  end
end
