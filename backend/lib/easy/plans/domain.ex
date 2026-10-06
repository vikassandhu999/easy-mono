defmodule Easy.Plans.Domain do
  @type t :: :training | :nutrition | :trackers
  @callback empty() :: map()
  @callback validate(Easy.Ctx.t(), map()) :: {:ok, map()} | {:error, term()}
  @callback summary(map()) :: map()
  @callback coverage(map()) :: map()

  @spec module(t()) :: module()
  def module(:training), do: Easy.Training.Content
  def module(:trackers), do: Easy.Trackers.Content
  def module(:nutrition), do: Easy.Nutrition.Content

  @spec empty(t()) :: map()
  def empty(domain), do: module(domain).empty()

  @spec validate(Easy.Ctx.t(), t(), map()) :: {:ok, map()} | {:error, term()}
  def validate(ctx, domain, content), do: module(domain).validate(ctx, content)

  @spec summary(t(), map()) :: map()
  def summary(domain, content), do: module(domain).summary(content)

  @spec coverage(t(), map()) :: map()
  def coverage(domain, content), do: module(domain).coverage(content)
end
