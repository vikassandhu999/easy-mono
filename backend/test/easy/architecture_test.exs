defmodule Easy.ArchitectureTest do
  use ExUnit.Case, async: true

  setup_all do
    modules =
      :easy
      |> Application.spec(:modules)
      |> Enum.map(&compiled_module/1)

    %{modules: modules}
  end

  test "schemas keep persistence in contexts", %{modules: modules} do
    schemas = Enum.filter(modules, & &1.schema?)
    assert schemas != []
    assert_no_calls(schemas, Easy.Repo, "Move persistence into the owning context; keep schema functions pure.")
  end

  test "schemas receive current time from callers", %{modules: modules} do
    schemas = Enum.filter(modules, & &1.schema?)
    assert schemas != []

    clocks = [
      {Date, :utc_today},
      {DateTime, :utc_now},
      {NaiveDateTime, :utc_now},
      {Time, :utc_now},
      {System, :system_time},
      {:erlang, :system_time},
      {:os, :system_time},
      {:os, :timestamp}
    ]

    assert_no_calls(schemas, clocks, "Pass the effective date or timestamp into the schema function.")
  end

  test "controllers delegate persistence to contexts", %{modules: modules} do
    controllers = Enum.filter(modules, &String.starts_with?(&1.file, "lib/easy_web/controllers/"))
    assert controllers != []
    assert_no_calls(controllers, Easy.Repo, "Call a context operation from the controller instead of Repo.")
  end

  test "domain modules stay independent of HTTP connections", %{modules: modules} do
    domain = Enum.filter(modules, &String.starts_with?(&1.file, "lib/easy/"))
    assert domain != []
    assert_no_calls(domain, Plug.Conn, "Keep HTTP handling in easy_web and pass Ctx plus domain arguments.")
  end

  test "domain specs and types reference exported types", %{modules: modules} do
    domain = Enum.filter(modules, &String.starts_with?(&1.file, "lib/easy/"))
    assert domain != []

    violations =
      for source <- domain,
          {:ok, declarations} <- [Code.Typespec.fetch_specs(source.module), Code.Typespec.fetch_types(source.module)],
          reference <- declarations |> remote_types() |> Enum.uniq(),
          not exported_type?(reference) do
        {target, name, arity} = reference
        "#{source.file}: #{inspect(source.module)} references undefined type #{inspect(target)}.#{name}/#{arity}"
      end

    assert violations == [], Enum.join(violations, "\n")
  end

  defp remote_types({:remote_type, _, [{:atom, _, module}, {:atom, _, name}, args]}) do
    [{module, name, length(args)} | remote_types(args)]
  end

  defp remote_types(node) when is_tuple(node), do: node |> Tuple.to_list() |> remote_types()
  defp remote_types(nodes) when is_list(nodes), do: Enum.flat_map(nodes, &remote_types/1)
  defp remote_types(_node), do: []

  defp exported_type?({module, name, arity}) do
    case Code.Typespec.fetch_types(module) do
      {:ok, types} ->
        Enum.any?(types, fn {kind, {type_name, _definition, args}} ->
          kind != :typep and type_name == name and length(args) == arity
        end)

      :error ->
        false
    end
  end

  defp compiled_module(module) do
    {:module, ^module} = Code.ensure_loaded(module)
    {:ok, {^module, [imports: imports]}} = :beam_lib.chunks(:code.which(module), [:imports])

    file =
      module.module_info(:compile)
      |> Keyword.fetch!(:source)
      |> to_string()
      |> Path.relative_to(File.cwd!())

    %{module: module, file: file, imports: imports, schema?: function_exported?(module, :__schema__, 1)}
  end

  defp assert_no_calls(modules, forbidden, remediation) do
    forbidden = List.wrap(forbidden)

    violations =
      for source <- modules,
          {target, function, arity} <- source.imports,
          target in forbidden or {target, function} in forbidden do
        "#{source.file}: #{inspect(source.module)} calls #{inspect(target)}.#{function}/#{arity}"
      end

    assert violations == [], Enum.join(violations, "\n") <> "\n" <> remediation
  end
end
