defmodule Easy.Nutrition.DiarySlot do
  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query
  alias Easy.Clients.Client
  alias Easy.Nutrition.{DiaryDay, MealSlot}
  alias Easy.Nutrition.DiarySlot.Document
  alias Easy.Orgs.Business

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @type t :: %__MODULE__{}

  schema "nutrition_diary_slots" do
    field :local_date, :date
    field :meal_slot, Ecto.Enum, values: MealSlot.values()
    field :applied_timezone, :string
    field :has_coverage, :boolean
    field :revision, :integer, default: 0
    belongs_to :day, DiaryDay, foreign_key: :nutrition_diary_day_id
    belongs_to :business, Business
    belongs_to :client, Client
    embeds_one :document, Document, on_replace: :delete
    timestamps(type: :utc_datetime)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(slot, document_attrs) do
    slot
    |> change(revision: slot.revision + 1)
    |> put_embed(:document, Document.changeset(slot.document || %Document{}, document_attrs))
    |> validate_required([
      :local_date,
      :meal_slot,
      :applied_timezone,
      :has_coverage,
      :nutrition_diary_day_id,
      :business_id,
      :client_id
    ])
    |> unique_constraint([:business_id, :client_id, :local_date, :meal_slot],
      name: :nutrition_diary_slots_identity_index
    )
    |> check_constraint(:document, name: :nutrition_diary_slots_document_check)
    |> foreign_key_constraint(:nutrition_diary_day_id, name: :nutrition_diary_slots_day_identity_fkey)
  end

  @spec for_client(Ecto.Queryable.t(), String.t(), String.t()) :: Ecto.Query.t()
  def for_client(query \\ __MODULE__, business_id, client_id) do
    from(slot in query, where: slot.business_id == ^business_id and slot.client_id == ^client_id)
  end

  @spec for_date(Ecto.Queryable.t(), Date.t()) :: Ecto.Query.t()
  def for_date(query \\ __MODULE__, date), do: from(slot in query, where: slot.local_date == ^date)
end
