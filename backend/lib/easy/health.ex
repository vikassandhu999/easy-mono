defmodule Easy.Health do
  alias Easy.Repo

  @spec check_readiness((-> {:ok, term()} | {:error, term()})) :: {:ok, :ready} | {:error, :database_unavailable}
  def check_readiness(check \\ &check_database/0) do
    case check.() do
      {:ok, _result} -> {:ok, :ready}
      {:error, _reason} -> {:error, :database_unavailable}
    end
  rescue
    DBConnection.ConnectionError -> {:error, :database_unavailable}
  catch
    :exit, _reason -> {:error, :database_unavailable}
  end

  defp check_database do
    Repo.query("SELECT 1", [], timeout: 1_000, queue: false, log: false)
  end
end
