defmodule EasyWeb.Type do
  alias EasyWeb.TypedRoute.{Dump, Type}

  @spec __using__(keyword()) :: Macro.t()
  defmacro __using__(_opts) do
    quote do
      @before_compile EasyWeb.Type
    end
  end

  @spec __before_compile__(Macro.Env.t()) :: Macro.t()
  defmacro __before_compile__(env) do
    reject_format_catchall!(File.read!(env.file), env)

    quote do
      @spec __wire_type__(atom()) :: EasyWeb.TypedRoute.Type.ir()
      def __wire_type__(name), do: EasyWeb.TypedRoute.Type.from_beam!(__MODULE__, name)

      @spec take(term()) :: term()
      def take(%Ecto.Association.NotLoaded{}) do
        raise ArgumentError, "#{inspect(__MODULE__)} got %Ecto.Association.NotLoaded{}"
      end

      def take(nil), do: nil

      def take(value) when is_struct(value) or is_map(value) do
        EasyWeb.Type.take_record(value, __MODULE__)
      end
    end
  end

  @spec take_record(map(), module()) :: map()
  def take_record(value, module) do
    case Type.from_beam!(module, :t) do
      {:record, fields} -> Enum.reduce(fields, %{}, &take_field(&1, &2, value))
      {:dict, inner} -> Map.new(value, fn {key, item} -> {to_string(key), Dump.pick(item, inner)} end)
      {:union, _} -> value
    end
  end

  defp take_field({name, requirement, ir}, result, value) do
    if requirement == :required or Map.has_key?(value, name) or Map.has_key?(value, to_string(name)) do
      Map.put(result, name, Dump.pick(field(value, name), ir))
    else
      result
    end
  end

  @spec field(map(), atom()) :: term()
  def field(%Ecto.Association.NotLoaded{}, _name) do
    raise ArgumentError, "got %Ecto.Association.NotLoaded{}"
  end

  def field(value, name) when is_struct(value) or is_map(value) do
    case Map.get(value, name, Map.get(value, to_string(name))) do
      %Ecto.Association.NotLoaded{} ->
        raise ArgumentError, "#{inspect(name)} is %Ecto.Association.NotLoaded{}"

      other ->
        other
    end
  end

  defp reject_format_catchall!(source, env) do
    if source =~ ~r/def format\((?:\w+|_)\s*\)/ and source =~ ~r/Map\.from_struct/ do
      raise CompileError,
        file: env.file,
        line: env.line,
        description: "#{inspect(env.module)} format/1 must not be a catch-all Map.from_struct/1"
    end
  end
end
