defmodule Easy.Clients.ClientTest do
  use Easy.SchemaCase

  alias Easy.Clients.Client

  describe "newest/1" do
    test "uses id as a stable tie-breaker for clients created at the same time" do
      {sql, _params} = Ecto.Adapters.SQL.to_sql(:all, Repo, Client.newest())

      assert sql =~ ~s(ORDER BY c0."inserted_at" DESC, c0."id" DESC)
    end
  end
end
