defmodule Easy.Organizations.Subscription do
  @moduledoc """
  Subscription schema for business billing and plan management.

  Tracks subscription status, billing periods, and trial periods for businesses.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @type t :: %__MODULE__{}
  @foreign_key_type :binary_id

  schema "subscriptions" do
    field :status, :string
    field :started_at, :utc_datetime
    field :current_period_start, :utc_datetime
    field :current_period_end, :utc_datetime
    field :cancelled_at, :utc_datetime

    # Trial fields
    field :trial_start, :utc_datetime
    field :trial_end, :utc_datetime
    field :trial_used, :boolean, default: false

    belongs_to :business, Easy.Organizations.Business
    belongs_to :plan, Easy.Organizations.Plan

    timestamps()
  end

  @valid_statuses ~w(active trial trial_expired cancelled expired)

  def changeset(subscription, attrs) do
    subscription
    |> cast(attrs, [
      :status,
      :started_at,
      :current_period_start,
      :current_period_end,
      :cancelled_at,
      :trial_start,
      :trial_end,
      :trial_used,
      :business_id,
      :plan_id
    ])
    |> validate_required([
      :status,
      :started_at,
      :current_period_start,
      :current_period_end,
      :business_id,
      :plan_id
    ])
    |> validate_inclusion(:status, @valid_statuses)
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:plan_id)
  end

  @doc """
  Creates a changeset for a standard paid subscription.
  """
  def create_changeset(subscription, business_id, plan_id) do
    now = DateTime.utc_now() |> DateTime.truncate(:second)
    period_end = DateTime.add(now, 30 * 24 * 60 * 60, :second)

    attrs = %{
      status: "active",
      started_at: now,
      current_period_start: now,
      current_period_end: period_end,
      business_id: business_id,
      plan_id: plan_id
    }

    changeset(subscription, attrs)
  end

  @doc """
  Creates a changeset for a trial subscription.

  ## Options
  - `trial_days` - Number of days for trial period (default: 30)
  """
  def trial_changeset(subscription, business_id, plan_id, trial_days \\ 30) do
    now = DateTime.utc_now() |> DateTime.truncate(:second)
    trial_end = DateTime.add(now, trial_days * 24 * 60 * 60, :second)

    attrs = %{
      status: "trial",
      started_at: now,
      current_period_start: now,
      current_period_end: trial_end,
      trial_start: now,
      trial_end: trial_end,
      trial_used: true,
      business_id: business_id,
      plan_id: plan_id
    }

    changeset(subscription, attrs)
  end

  @doc """
  Returns true if subscription is currently in trial period.
  """
  @spec is_trial?(t()) :: boolean()
  def is_trial?(%__MODULE__{status: "trial"}), do: true
  def is_trial?(_), do: false

  @doc """
  Returns true if trial period has expired.

  Checks if trial_end is in the past. Returns false if no trial period exists.
  """
  @spec trial_expired?(t()) :: boolean()
  def trial_expired?(%__MODULE__{trial_end: nil}), do: false

  def trial_expired?(%__MODULE__{trial_end: trial_end}) do
    DateTime.compare(trial_end, DateTime.utc_now()) == :lt
  end

  @doc """
  Returns subscription status as an atom for pattern matching.
  """
  @spec status_atom(t()) :: :active | :trial | :trial_expired | :cancelled | :expired
  def status_atom(%__MODULE__{status: "active"}), do: :active
  def status_atom(%__MODULE__{status: "trial"}), do: :trial
  def status_atom(%__MODULE__{status: "trial_expired"}), do: :trial_expired
  def status_atom(%__MODULE__{status: "cancelled"}), do: :cancelled
  def status_atom(%__MODULE__{status: "expired"}), do: :expired
  def status_atom(_), do: :expired
end
