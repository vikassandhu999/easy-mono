defmodule EasyWeb.Coaches.ProfileFieldJSON do
  alias Easy.ClientProfiles.ProfileFieldDefinition

  @spec show(%{field: ProfileFieldDefinition.t()}) :: %{data: map()}
  def show(%{field: field}) do
    %{data: data(field)}
  end

  @spec index(%{fields: [ProfileFieldDefinition.t()]}) :: %{data: [map()]}
  def index(%{fields: fields}) do
    %{data: Enum.map(fields, &data/1)}
  end

  defp data(%ProfileFieldDefinition{} = field) do
    %{
      id: field.id,
      section: field.section,
      label: field.label,
      key: field.key,
      field_type: field.field_type,
      options: field.options,
      filterable: field.filterable,
      archived_at: field.archived_at,
      inserted_at: field.inserted_at,
      updated_at: field.updated_at
    }
  end
end
