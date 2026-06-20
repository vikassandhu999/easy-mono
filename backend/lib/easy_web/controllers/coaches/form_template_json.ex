defmodule EasyWeb.Coaches.FormTemplateJSON do
  alias Easy.ClientProfiles.FormTemplate

  @spec show(%{template: FormTemplate.t()}) :: %{data: map()}
  def show(%{template: template}) do
    %{data: data(template)}
  end

  @spec index(%{templates: [FormTemplate.t()]}) :: %{data: [map()]}
  def index(%{templates: templates}) do
    %{data: Enum.map(templates, &data/1)}
  end

  @spec data(FormTemplate.t()) :: map()
  def data(%FormTemplate{} = template) do
    %{
      id: template.id,
      name: template.name,
      purpose: template.purpose,
      sections: template.sections,
      status: template.status,
      inserted_at: template.inserted_at,
      updated_at: template.updated_at
    }
  end
end
