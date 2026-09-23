defmodule Easy.Nutrition.Diary.CorrectionPolicy do
  alias Easy.Clients.Client
  alias Easy.LocalCalendar

  @spec local_today(Client.t() | String.t(), DateTime.t()) :: Date.t()
  def local_today(%Client{} = client, %DateTime{} = now) do
    Client.local_date(client, now)
  end

  def local_today(timezone, %DateTime{} = now) when is_binary(timezone) do
    LocalCalendar.to_local_date(now, timezone)
  end

  @spec write_eligible?(Date.t(), Date.t()) :: boolean()
  def write_eligible?(%Date{} = date, %Date{} = today) do
    Date.compare(date, today) != :gt
  end

  @spec validate_write(Date.t(), Date.t()) ::
          :ok | {:error, :future_date}
  def validate_write(%Date{} = date, %Date{} = today) do
    if write_eligible?(date, today), do: :ok, else: {:error, :future_date}
  end

  @spec validate_switch(Date.t(), Date.t()) ::
          :ok | {:error, :future_date | :cannot_switch_past_slot}
  def validate_switch(%Date{} = date, %Date{} = today) do
    case Date.compare(date, today) do
      :gt -> {:error, :future_date}
      :lt -> {:error, :cannot_switch_past_slot}
      :eq -> :ok
    end
  end
end
