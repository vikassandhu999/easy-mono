defmodule Easy.Nutrition.Portion do
  use Ecto.Type

  @type t() ::
          %{required(:kind) => :gram, required(:grams) => number()}
          | %{
              required(:kind) => :serving,
              required(:amount) => number(),
              required(:unit) => String.t(),
              required(:label) => String.t() | nil,
              optional(:grams) => number() | nil
            }

  @impl Ecto.Type
  @spec embed_as(atom()) :: :dump
  def embed_as(_format), do: :dump

  @impl Ecto.Type
  @spec type() :: :map
  def type, do: :map

  @impl Ecto.Type
  @spec cast(term()) :: {:ok, t()} | :error
  def cast(%{kind: :gram, grams: grams}) when is_number(grams) and grams > 0,
    do: {:ok, %{kind: :gram, grams: grams / 1}}

  def cast(%{kind: :serving, amount: amount, unit: unit} = portion)
      when is_number(amount) and amount > 0 and is_binary(unit) and unit != "" do
    grams = Map.get(portion, :grams)
    label = Map.get(portion, :label)

    if (is_nil(grams) or (is_number(grams) and grams > 0)) and (is_nil(label) or is_binary(label)) do
      {:ok, %{kind: :serving, amount: amount / 1, unit: unit, label: label, grams: grams}}
    else
      :error
    end
  end

  def cast(%{"kind" => _kind} = portion), do: load(portion)
  def cast(_portion), do: :error

  @impl Ecto.Type
  @spec load(term()) :: {:ok, t()} | :error
  def load(%{"kind" => kind} = portion) do
    values = Map.new([:grams, :amount, :unit, :label], &{&1, Map.get(portion, to_string(&1))})

    case kind do
      "gram" -> cast(Map.put(values, :kind, :gram))
      "serving" -> cast(Map.put(values, :kind, :serving))
      _ -> :error
    end
  end

  def load(_portion), do: :error

  @impl Ecto.Type
  @spec dump(term()) :: {:ok, t()} | :error
  def dump(portion), do: cast(portion)

  @spec format(t()) :: t()
  def format(%{kind: :gram} = portion), do: Map.take(portion, [:kind, :grams])
  def format(%{kind: :serving} = portion), do: Map.take(portion, [:kind, :amount, :unit, :label])
end
