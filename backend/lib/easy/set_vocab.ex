defmodule Easy.SetVocab do
  @set_types [:working, :warmup, :dropset]
  @load_units [:kg, :lbs, :bodyweight, :none]
  @distance_units [:meters, :km, :miles, :none]

  @spec set_types() :: [atom()]
  def set_types, do: @set_types

  @spec load_units() :: [atom()]
  def load_units, do: @load_units

  @spec distance_units() :: [atom()]
  def distance_units, do: @distance_units
end
