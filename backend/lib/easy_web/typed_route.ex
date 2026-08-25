defmodule EasyWeb.TypedRoute do
  alias EasyWeb.TypedRoute.{Check, Dump, Type}

  defmacro __using__(_opts) do
    quote do
      import EasyWeb.TypedRoute, only: [typed: 2, ok: 1, ok: 2]
      plug EasyWeb.TypedRoute.Plug
      @typed_routes %{}
      @before_compile EasyWeb.TypedRoute
    end
  end

  defmacro typed(action, opts) do
    route = compile_route(action, opts, __CALLER__)

    quote do
      @typed_routes Map.put(@typed_routes, unquote(action), unquote(Macro.escape(route)))
    end
  end

  defmacro __before_compile__(env) do
    routes = env.module |> Module.get_attribute(:typed_routes) |> List.wrap() |> List.first() || %{}
    source = File.read!(env.file)
    reject_openapi!(env.module, env)
    reject_forbidden!(source, env)
    reject_untyped_actions!(env.module, routes, env)

    quote do
      @spec __typed_route__(atom()) :: map() | nil
      def __typed_route__(action), do: Map.get(unquote(Macro.escape(routes)), action)
    end
  end

  @spec ok(Plug.Conn.t()) :: Plug.Conn.t()
  def ok(conn) do
    case route!(conn).ok do
      {204, nil} ->
        Plug.Conn.send_resp(conn, 204, "")

      other ->
        raise ArgumentError, "ok/1 requires ok: {204, nil}, got #{inspect(other)}"
    end
  end

  @spec ok(Plug.Conn.t(), term()) :: Plug.Conn.t()
  def ok(conn, payload) do
    {status, ir} = route!(conn).ok
    formatted = Dump.dump(payload, ir)
    if check?(), do: Check.assert!(formatted, ir)

    conn
    |> Plug.Conn.put_resp_content_type("application/json")
    |> Plug.Conn.send_resp(status, Jason.encode!(formatted))
  end

  defp compile_route(action, opts, env) when is_atom(action) and is_list(opts) do
    extras = Keyword.keys(opts) -- [:body, :query, :path, :ok]

    if extras != [] do
      raise ArgumentError, "unknown typed keys #{inspect(extras)} on #{action}"
    end

    {status, body_type} = Keyword.get(opts, :ok) || raise ArgumentError, "typed #{action} is missing ok:"

    unless is_integer(status) do
      raise ArgumentError, "typed #{action} ok status must be an integer, got #{inspect(status)}"
    end

    %{
      action: action,
      body: expand_opt(Keyword.get(opts, :body), env),
      query: expand_opt(Keyword.get(opts, :query), env),
      path: expand_opt(Keyword.get(opts, :path), env),
      ok: {status, expand_opt(body_type, env)}
    }
  end

  defp expand_opt(nil, _env), do: nil
  defp expand_opt(ast, env), do: Type.expand(ast, env)

  defp route!(conn) do
    controller = conn.private.phoenix_controller
    action = conn.private.phoenix_action

    controller.__typed_route__(action) ||
      raise ArgumentError, "#{inspect(controller)} has no type #{action}"
  end

  @check Mix.env() != :prod

  defp check?, do: @check

  defp reject_openapi!(module, env) do
    if Module.defines?(module, {:open_api_operation, 1}) do
      raise CompileError,
        file: env.file,
        line: env.line,
        description: "#{inspect(module)} cannot mix typed and OpenApiSpex operation"
    end
  end

  defp reject_forbidden!(source, env) do
    if source =~ ~r/\b(?:render|json|put_view|put_status|send_resp)\(/ do
      raise CompileError,
        file: env.file,
        line: env.line,
        description: "#{inspect(env.module)} typed actions must return through ok/1 or ok/2"
    end
  end

  defp reject_untyped_actions!(module, routes, env) do
    skip = MapSet.new([:action, :call, :init, :__typed_route__])

    missing =
      module
      |> Module.definitions_in(:def)
      |> Enum.map(&elem(&1, 0))
      |> Enum.uniq()
      |> Enum.reject(fn name ->
        String.starts_with?(Atom.to_string(name), "__") or MapSet.member?(skip, name) or
          Map.has_key?(routes, name)
      end)

    if missing != [] do
      raise CompileError,
        file: env.file,
        line: env.line,
        description: "#{inspect(module)} public actions missing typed: #{inspect(missing)}"
    end
  end
end
