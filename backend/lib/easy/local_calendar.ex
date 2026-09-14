defmodule Easy.LocalCalendar do
  import Ecto.Changeset

  @default_timezone "Asia/Kolkata"

  @spec default_timezone() :: String.t()
  def default_timezone, do: @default_timezone

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

  @spec stamp_timezone(Ecto.Changeset.t(), String.t()) :: Ecto.Changeset.t()
  def stamp_timezone(changeset, timezone \\ @default_timezone), do: put_change(changeset, :timezone, timezone)

  @spec validate_timezone(Ecto.Changeset.t()) :: Ecto.Changeset.t()
  def validate_timezone(changeset) do
    changeset
    |> validate_required([:timezone])
    |> validate_change(:timezone, fn :timezone, value ->
      if Tzdata.zone_exists?(value), do: [], else: [timezone: "choose a valid time zone"]
    end)
  end

  @spec timezones() :: {:ok, [String.t()]}
  def timezones, do: {:ok, Enum.sort(Tzdata.zone_list())}

  defp present?(value) when is_binary(value), do: value != ""
  defp present?(_value), do: false
end
