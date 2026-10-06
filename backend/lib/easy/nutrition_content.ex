defmodule Easy.Nutrition.Content do
  alias Easy.Nutrition.ContentValidator
  @behaviour Easy.Plans.Domain
  @spec empty() :: map()
  def empty do
    id = Ecto.UUID.generate()

    %{
      "targets" => %{},
      "meals" => [],
      "day_patterns" => [%{"id" => id, "name" => "Every day", "slots" => []}],
      "schedule" => %{
        "cycle_weeks" => 1,
        "entries" => Enum.map(0..6, &%{"id" => Ecto.UUID.generate(), "day" => &1, "ref" => id})
      }
    }
  end

  @spec summary(map()) :: map()
  def summary(content), do: %{meal_count: length(content["meals"])}
  @spec coverage(map()) :: map()
  def coverage(content), do: %{meals: content["meals"], day_patterns: content["day_patterns"]}
  @spec validate(Easy.Ctx.t(), map()) :: {:ok, map()} | {:error, term()}
  def validate(ctx, content), do: ContentValidator.validate(ctx, content)
end
