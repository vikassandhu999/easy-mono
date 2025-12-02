defmodule Easy.Repo.Seeds.MeasurementUnits do
  @moduledoc """
  Seeds for measurement units (nutrition).
  """
  alias Easy.Repo
  alias Easy.Nutrition.MeasurementUnit

  import Ecto.Query

  @units [
    %{name: "Gram", abbreviation: "g", system: "metric"},
    %{name: "Kilogram", abbreviation: "kg", system: "metric"},
    %{name: "Milliliter", abbreviation: "ml", system: "metric"},
    %{name: "Liter", abbreviation: "l", system: "metric"},
    %{name: "Teaspoon", abbreviation: "tsp", system: "imperial"},
    %{name: "Tablespoon", abbreviation: "tbsp", system: "imperial"},
    %{name: "Cup", abbreviation: "cup", system: "imperial"},
    %{name: "Fluid Ounce", abbreviation: "fl oz", system: "imperial"},
    %{name: "Ounce", abbreviation: "oz", system: "imperial"},
    %{name: "Pound", abbreviation: "lb", system: "imperial"}
  ]

  def run do
    seed_units()
  end

  defp seed_units do
    inserted_count =
      @units
      |> Enum.reduce(0, fn unit_attrs, count ->
        case upsert_unit(unit_attrs) do
          {:ok, _} -> count + 1
          {:skip, _} -> count
        end
      end)

    IO.puts("✓ Seeded #{inserted_count}/#{length(@units)} Measurement Units")
  end

  defp upsert_unit(%{name: name} = attrs) do
    case Repo.one(from u in MeasurementUnit, where: u.name == ^name) do
      nil ->
        %MeasurementUnit{}
        |> MeasurementUnit.changeset(attrs)
        |> Repo.insert()

      _existing ->
        {:skip, :already_exists}
    end
  end
end
