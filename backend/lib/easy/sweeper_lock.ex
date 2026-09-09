defmodule Easy.SweeperLock do
  alias Easy.Repo

  @spec run(String.t(), (-> result)) :: {:ok, result} | :busy when result: var
  def run(name, fun) do
    # The caller owns the work deadline. A pool checkout deadline can release
    # this session lock while the callback is still performing external I/O.
    Repo.checkout(
      fn ->
        [[acquired?]] = Repo.query!("SELECT pg_try_advisory_lock(hashtext($1))", [name]).rows

        if acquired? do
          try do
            {:ok, fun.()}
          after
            Repo.query!("SELECT pg_advisory_unlock(hashtext($1))", [name])
          end
        else
          :busy
        end
      end,
      timeout: :infinity
    )
  end
end
