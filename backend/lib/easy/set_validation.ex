defmodule Easy.SetValidation do
  import Ecto.Changeset

  @spec require_load_unit(Ecto.Changeset.t()) :: Ecto.Changeset.t()
  def require_load_unit(changeset) do
    if get_field(changeset, :load_value) && unit_blank?(get_field(changeset, :load_unit)) do
      add_error(changeset, :load_unit, "required when load_value is set")
    else
      changeset
    end
  end

  @spec require_distance_unit(Ecto.Changeset.t()) :: Ecto.Changeset.t()
  def require_distance_unit(changeset) do
    if get_field(changeset, :distance_value) && unit_blank?(get_field(changeset, :distance_unit)) do
      add_error(changeset, :distance_unit, "required when distance_value is set")
    else
      changeset
    end
  end

  @spec blank?(any()) :: boolean()
  def blank?(value) when is_binary(value), do: String.trim(value) == ""
  def blank?(nil), do: true
  def blank?(_), do: false

  defp unit_blank?(unit), do: is_nil(unit) or unit == :none
end
