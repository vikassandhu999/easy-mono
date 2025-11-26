defmodule Easy.Training.Programming.TrainingPlan do
  use Easy.Training.Schema

  alias Easy.Organizations.{Business, Coach}
  alias Easy.Clients.Client
  alias Easy.Training.Programming.{Phase, PhaseAssignment}

  schema "training_plans" do
    field :name, :string
    field :description, :string
    field :is_template, :boolean, default: true
    field :duration_weeks, :integer

    belongs_to :business, Business
    belongs_to :author, Coach
    belongs_to :client, Client
    belongs_to :original_template, __MODULE__

    has_many :phases, Phase
    has_many :phase_assignments, PhaseAssignment

    timestamps()
  end

  @doc false
  def changeset(training_plan, attrs) do
    training_plan
    |> cast(attrs, [
      :name,
      :description,
      :is_template,
      :duration_weeks,
      :business_id,
      :author_id,
      :client_id,
      :original_template_id
    ])
    |> validate_required([:name, :business_id, :author_id])
    |> validate_number(:duration_weeks, greater_than: 0)
    |> validate_template_or_client()
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:author_id)
    |> foreign_key_constraint(:client_id)
    |> foreign_key_constraint(:original_template_id)
  end

  defp validate_template_or_client(changeset) do
    is_template = get_field(changeset, :is_template)
    client_id = get_field(changeset, :client_id)

    cond do
      is_template && client_id ->
        add_error(changeset, :client_id, "template cannot have a client assigned")

      !is_template && is_nil(client_id) ->
        add_error(changeset, :client_id, "assigned plan must have a client")

      true ->
        changeset
    end
  end
end
