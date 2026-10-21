defmodule Easy.SetVocab do
  @type set_type() :: :working | :warmup | :dropset
  @type load_unit() :: :kg | :lbs | :bodyweight | :none
  @type distance_unit() :: :meters | :km | :miles | :none

  @set_types [:working, :warmup, :dropset]
  @load_units [:kg, :lbs, :bodyweight, :none]
  @distance_units [:meters, :km, :miles, :none]

  @spec set_types() :: [set_type()]
  def set_types, do: @set_types

  @spec load_units() :: [load_unit()]
  def load_units, do: @load_units

  @spec distance_units() :: [distance_unit()]
  def distance_units, do: @distance_units
end
