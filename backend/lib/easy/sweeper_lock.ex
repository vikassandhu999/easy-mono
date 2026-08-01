defmodule Easy.SweeperLock do
  alias Easy.Repo

  @spec run(String.t(), (-> term())) :: {:ok, term()} | :busy
  def run(name, fun) do
    Repo.checkout(fn ->
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
    end)
  end
end
