defmodule Easy.LocalCalendar do
  import Ecto.Changeset

  @default_timezone "Asia/Kolkata"

  @spec default_timezone() :: String.t()
  def default_timezone, do: @default_timezone

  @spec valid_timezone?(term()) :: boolean()
  def valid_timezone?(name) when is_binary(name) and name != "" do
    Tzdata.zone_exists?(name)
  end

  def valid_timezone?(_), do: false

  @spec applied_timezone(String.t() | nil, String.t() | nil) :: String.t()
  def applied_timezone(client_timezone, business_timezone) do
    cond do
      present?(client_timezone) -> client_timezone
      present?(business_timezone) -> business_timezone
      true -> @default_timezone
    end
  end

  @spec to_local_date(DateTime.t(), String.t()) :: Date.t()
  def to_local_date(%DateTime{} = utc, timezone) do
    utc
    |> DateTime.shift_zone!(timezone)
    |> DateTime.to_date()
  end

  @spec stamp_timezone(Ecto.Changeset.t()) :: Ecto.Changeset.t()
  def stamp_timezone(changeset) do
    changeset
    |> put_change(:timezone, @default_timezone)
    |> validate_timezone()
  end

  @spec validate_timezone(Ecto.Changeset.t()) :: Ecto.Changeset.t()
  def validate_timezone(changeset) do
    validate_change(changeset, :timezone, fn :timezone, value ->
      if valid_timezone?(value) do
        []
      else
        [timezone: "is not a valid IANA timezone"]
      end
    end)
  end

  defp present?(value) when is_binary(value), do: value != ""
  defp present?(_value), do: false
end
