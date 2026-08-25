defmodule EasyWeb.TypedRouteTest do
  use Easy.ConnCase, async: true

  alias EasyWeb.Plugs.Idempotency
  alias EasyWeb.TypedRoute
  alias EasyWeb.TypedRoute.{Cast, Check, Dump, Emit, Type}
  alias EasyWeb.TypedRouteTestController, as: Controller
  alias EasyWeb.Types.TypedItem

  defmodule Item do
    defstruct [:id, :name]
  end

  test "expands record, data, page, and remote types" do
    ast = quote do: %{required(:name) => String.t(), optional(:notes) => String.t()}
    assert {:record, fields} = Type.expand(ast, __ENV__)
    assert {:name, :required, :string} in fields
    assert {:notes, :optional, :string} in fields

    data_ast = quote do: data(TypedItem.t())
    assert {:record, [{:data, :required, {:remote, TypedItem, :t}}]} = Type.expand(data_ast, __ENV__)

    page_ast = quote do: page(TypedItem.t())

    assert {:record,
            [
              {:data, :required, {:list, {:remote, TypedItem, :t}}},
              {:count, :required, :non_neg_integer}
            ]} = Type.expand(page_ast, __ENV__)
  end

  test "rejects illegal wire types" do
    ast = quote do: pid()

    assert_raise ArgumentError, fn ->
      Type.expand(ast, __ENV__)
    end
  end

  test "caster rejects unknown body keys and missing required keys" do
    ir = TypedItem.__wire_type__(:create)
    assert {:error, %{"nope" => ["is unknown"]}} = Cast.body(%{"name" => "x", "nope" => 1}, ir)
    assert {:error, %{"name" => ["is required"]}} = Cast.body(%{}, ir)
    assert {:ok, %{name: "x"}} = Cast.body(%{"name" => "x"}, ir)
  end

  test "caster coerces query integers and keeps string keys" do
    ir = TypedItem.__wire_type__(:list_query)
    assert {:ok, %{"offset" => 0, "limit" => 20}} = Cast.query(%{"offset" => "0", "limit" => "20"}, ir)
    assert {:error, %{"limit" => ["is invalid"]}} = Cast.query(%{"limit" => "0"}, ir)
  end

  test "caster coerces path dates and leaves other segments" do
    ir = Type.expand(quote(do: %{date: Date.t()}), __ENV__)
    date = ~D[2026-01-02]

    assert {:ok, %{"date" => ^date, "id" => "abc"}} =
             Cast.path(%{"date" => "2026-01-02", "id" => "abc"}, ir)
  end

  test "take/1 raises on NotLoaded" do
    assert_raise ArgumentError, fn ->
      TypedItem.take(%Ecto.Association.NotLoaded{__field__: :x, __owner__: Item, __cardinality__: :one})
    end
  end

  test "take/1 picks t keys from a struct" do
    assert %{id: "1", name: "n"} = TypedItem.take(%Item{id: "1", name: "n"})
  end

  test "dump encodes DateTime and Decimal" do
    dt = ~U[2026-01-02 03:04:05Z]
    assert Dump.dump(dt, :datetime) == "2026-01-02T03:04:05Z"
    assert Dump.dump(Decimal.new("1.50"), :decimal) == "1.50"
  end

  test "checker raises with a field path" do
    ir = TypedItem.__wire_type__(:t)

    assert_raise ArgumentError, ~r/name/, fn ->
      Check.assert!(%{id: "1"}, ir)
    end
  end

  test "emit prints named types and openapi-fetch path params" do
    named = Emit.named_aliases({:remote, TypedItem, :t})
    assert named[{TypedItem, :t}] == "TypedItem"
    assert Emit.export_named_types(named) =~ "export type TypedItem"
    assert Emit.path_template("/v1/coach/nutrition-recipes/:id") == "/v1/coach/nutrition-recipes/{id}"
    assert Emit.ir_to_ts({:record, [{:name, :optional, :string}]}) == "{ name?: string }"
  end

  test "create action casts body, formats, and returns 201" do
    conn =
      :create
      |> typed_conn(%{"name" => "soup"})
      |> TypedRoute.Plug.call([])
      |> Controller.create(%{})

    assert conn.status == 201
    assert Jason.decode!(conn.resp_body) == %{"data" => %{"id" => "1", "name" => "soup"}}
  end

  test "create action 422s on extra keys" do
    conn =
      :create
      |> typed_conn(%{"name" => "soup", "extra" => true})
      |> TypedRoute.Plug.call([])

    assert conn.status == 422
    assert conn.halted
    body = Jason.decode!(conn.resp_body)
    assert body["error_code"] == "invalid_input"
    assert body["error_detail"]["fields"]["extra"] == ["is unknown"]
  end

  test "show and delete return 200 envelope and 204" do
    show =
      :show
      |> typed_conn(%{}, %{"id" => "9"})
      |> TypedRoute.Plug.call([])
      |> Controller.show(%{})

    assert show.status == 200
    assert Jason.decode!(show.resp_body) == %{"data" => %{"id" => "9", "name" => "n"}}

    delete =
      :delete
      |> typed_conn()
      |> TypedRoute.Plug.call([])
      |> Controller.delete(%{})

    assert delete.status == 204
    assert delete.resp_body == ""
  end

  test "index reads coerced query params" do
    conn =
      :index
      |> typed_conn(%{}, %{}, %{"offset" => "2", "limit" => "10"})
      |> TypedRoute.Plug.call([])
      |> Controller.index(%{})

    assert conn.status == 200
    assert conn.query_params == %{"offset" => 2, "limit" => 10}
    assert Jason.decode!(conn.resp_body) == %{"data" => [], "count" => 0}
  end

  test "Idempotency plug requires a UUID" do
    conn = Idempotency.call(build_conn(), [])
    assert conn.status == 422
    assert conn.halted

    uuid = Ecto.UUID.generate()

    conn =
      build_conn()
      |> Plug.Conn.put_req_header("idempotency-key", uuid)
      |> Idempotency.call([])

    assert conn.assigns.idempotency_key == uuid
  end

  defp typed_conn(action, body \\ %{}, path \\ %{}, query \\ %{}) do
    build_conn()
    |> Map.put(:body_params, body)
    |> Map.put(:path_params, path)
    |> Map.put(:query_params, query)
    |> Plug.Conn.put_private(:phoenix_controller, Controller)
    |> Plug.Conn.put_private(:phoenix_action, action)
  end
end
