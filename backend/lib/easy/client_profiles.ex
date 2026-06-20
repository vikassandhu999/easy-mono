defmodule Easy.ClientProfiles do
  alias Easy.ClientProfiles.ClientProfile
  alias Easy.ClientProfiles.FormAssignment
  alias Easy.ClientProfiles.FormSubmission
  alias Easy.ClientProfiles.FormTemplate
  alias Easy.ClientProfiles.ProfileFieldDefinition
  alias Easy.ClientProfiles.ProfileFieldValue
  alias Easy.Clients.Client
  alias Easy.Repo

  import Ecto.Query

  @actor_types ["coach", "client", "system"]

  @spec get_or_create_profile(String.t(), String.t()) ::
          {:ok, ClientProfile.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def get_or_create_profile(business_id, client_id) do
    with {:ok, client} <- get_client(business_id, client_id) do
      case ClientProfile
           |> ClientProfile.for_business(business_id)
           |> ClientProfile.for_client(client.id)
           |> Repo.one() do
        nil ->
          business_id
          |> ClientProfile.insert_changeset(client.id)
          |> Repo.insert()

        %ClientProfile{} = profile ->
          {:ok, profile}
      end
    end
  end

  @spec update_profile(String.t(), String.t(), map()) ::
          {:ok, ClientProfile.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_profile(business_id, client_id, attrs) do
    with {:ok, profile} <- get_or_create_profile(business_id, client_id) do
      profile
      |> ClientProfile.update_changeset(attrs)
      |> Repo.update()
    end
  end

  @spec list_profile_fields(String.t()) :: {:ok, [ProfileFieldDefinition.t()]}
  def list_profile_fields(business_id) do
    fields =
      ProfileFieldDefinition
      |> ProfileFieldDefinition.for_business(business_id)
      |> where([f], is_nil(f.archived_at))
      |> order_by([f], asc: f.section, asc: f.inserted_at)
      |> Repo.all()

    {:ok, fields}
  end

  @spec create_profile_field(String.t(), map()) ::
          {:ok, ProfileFieldDefinition.t()} | {:error, Ecto.Changeset.t()}
  def create_profile_field(business_id, attrs) do
    business_id
    |> ProfileFieldDefinition.insert_changeset(attrs)
    |> Repo.insert()
  end

  @spec update_profile_field(String.t(), String.t(), map()) ::
          {:ok, ProfileFieldDefinition.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_profile_field(business_id, field_id, attrs) do
    with {:ok, field} <- get_profile_field(business_id, field_id) do
      field
      |> ProfileFieldDefinition.update_changeset(attrs)
      |> Repo.update()
    end
  end

  @spec archive_profile_field(String.t(), String.t()) ::
          {:ok, ProfileFieldDefinition.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def archive_profile_field(business_id, field_id) do
    with {:ok, field} <- get_profile_field(business_id, field_id) do
      field
      |> ProfileFieldDefinition.archive_changeset()
      |> Repo.update()
    end
  end

  @spec upsert_profile_field_value(String.t(), String.t(), String.t(), any(), any()) ::
          {:ok, ProfileFieldValue.t()}
          | {:error, :not_found | :invalid_actor | Ecto.Changeset.t()}
  def upsert_profile_field_value(business_id, client_id, field_id, value, actor) do
    with {:ok, actor} <- normalize_actor(actor),
         {:ok, _client} <- get_client(business_id, client_id),
         {:ok, field} <- get_profile_field(business_id, field_id) do
      attrs = %{
        "value" => %{"value" => value},
        "updated_by_type" => actor.type,
        "updated_by_id" => actor.id,
        "updated_from_submission_id" => actor.submission_id
      }

      updated_at = DateTime.utc_now(:second)

      business_id
      |> ProfileFieldValue.insert_changeset(client_id, field.id, attrs)
      |> Repo.insert(
        on_conflict: [
          set: [
            value: attrs["value"],
            updated_by_type: actor.type,
            updated_by_id: actor.id,
            updated_from_submission_id: actor.submission_id,
            updated_at: updated_at
          ]
        ],
        conflict_target: [:client_id, :profile_field_definition_id],
        returning: true
      )
    end
  end

  @spec list_form_templates(String.t()) :: {:ok, [FormTemplate.t()]}
  def list_form_templates(business_id) do
    templates =
      FormTemplate
      |> FormTemplate.for_business(business_id)
      |> order_by([t], asc: t.inserted_at)
      |> Repo.all()

    {:ok, templates}
  end

  @spec create_form_template(String.t(), map()) ::
          {:ok, FormTemplate.t()} | {:error, Ecto.Changeset.t()}
  def create_form_template(business_id, attrs) do
    business_id
    |> FormTemplate.insert_changeset(attrs)
    |> Repo.insert()
  end

  @spec get_form_template(String.t(), String.t()) :: {:ok, FormTemplate.t()} | {:error, :not_found}
  def get_form_template(business_id, template_id) do
    FormTemplate
    |> FormTemplate.for_business(business_id)
    |> Repo.get(template_id)
    |> ok_or_not_found()
  end

  @spec update_form_template(String.t(), String.t(), map()) ::
          {:ok, FormTemplate.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_form_template(business_id, template_id, attrs) do
    with {:ok, template} <- get_form_template(business_id, template_id) do
      template
      |> FormTemplate.update_changeset(attrs)
      |> Repo.update()
    end
  end

  @spec delete_form_template(String.t(), String.t()) ::
          {:ok, FormTemplate.t()} | {:error, :not_found | Easy.Error.t() | Ecto.Changeset.t()}
  def delete_form_template(business_id, template_id) do
    with {:ok, template} <- get_form_template(business_id, template_id) do
      if form_template_has_assignments?(business_id, template.id) do
        {:error, Easy.Error.unprocessable(%{fields: %{form_template_id: ["has assignments"]}})}
      else
        Repo.delete(template)
      end
    end
  end

  @spec assign_form_template(String.t(), String.t(), String.t(), map()) ::
          {:ok, FormAssignment.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def assign_form_template(business_id, template_id, client_id, attrs) do
    with {:ok, template} <- get_form_template(business_id, template_id),
         {:ok, client} <- get_client(business_id, client_id) do
      attrs =
        attrs
        |> Map.take(["priority", "due_date"])
        |> Map.put_new("priority", "normal")
        |> Map.put("purpose", template.purpose)
        |> Map.put("status", "assigned")

      with {:ok, assignment} <-
             business_id
             |> FormAssignment.insert_changeset(client.id, template.id, attrs)
             |> Repo.insert() do
        get_form_assignment(business_id, assignment.id)
      end
    end
  end

  @spec list_form_assignments_for_client(String.t(), String.t()) ::
          {:ok, [FormAssignment.t()]} | {:error, :not_found}
  def list_form_assignments_for_client(business_id, client_id) do
    with {:ok, _client} <- get_client(business_id, client_id) do
      assignments =
        FormAssignment
        |> FormAssignment.for_business(business_id)
        |> FormAssignment.for_client(client_id)
        |> with_business_template(business_id)
        |> order_by([a, _t], asc: a.inserted_at)
        |> Repo.all()

      {:ok, assignments}
    end
  end

  @spec update_form_assignment(String.t(), String.t(), map()) ::
          {:ok, FormAssignment.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_form_assignment(business_id, assignment_id, attrs) do
    with {:ok, assignment} <- get_form_assignment(business_id, assignment_id) do
      assignment
      |> FormAssignment.update_changeset(attrs)
      |> Repo.update()
    end
  end

  @spec get_client_form_assignment(String.t(), String.t(), String.t()) ::
          {:ok, FormAssignment.t()} | {:error, :not_found}
  def get_client_form_assignment(business_id, client_id, assignment_id) do
    FormAssignment
    |> FormAssignment.for_business(business_id)
    |> FormAssignment.for_client(client_id)
    |> with_business_template(business_id)
    |> Repo.get(assignment_id)
    |> ok_or_not_found()
  end

  @spec submit_form_assignment(String.t(), String.t(), String.t(), map()) ::
          {:ok, FormSubmission.t()}
          | {:error, :not_found | Easy.Error.t() | Ecto.Changeset.t()}
  def submit_form_assignment(business_id, client_id, assignment_id, attrs) do
    with {:ok, answers} <- answers_from_attrs(attrs),
         {:ok, assignment} <- get_client_form_assignment(business_id, client_id, assignment_id),
         :ok <- ensure_assignment_submittable(assignment) do
      Repo.transaction(fn ->
        template = assignment.form_template

        submitted_at = DateTime.utc_now(:second)

        submission_attrs = %{
          "question_snapshot" => template.sections,
          "answers" => answers,
          "submitted_by_type" => "client",
          "submitted_by_id" => client_id,
          "submitted_at" => submitted_at
        }

        submission =
          case FormSubmission.insert_changeset(
                 business_id,
                 client_id,
                 assignment.id,
                 submission_attrs
               )
               |> Repo.insert() do
            {:ok, submission} -> submission
            {:error, reason} -> Repo.rollback(reason)
          end

        apply_profile_mappings!(business_id, client_id, template.sections, answers, submission)

        case assignment
             |> FormAssignment.complete_changeset(submitted_at)
             |> Repo.update() do
          {:ok, _assignment} -> submission
          {:error, reason} -> Repo.rollback(reason)
        end
      end)
    end
  end

  defp apply_profile_mappings!(business_id, client_id, sections, answers, submission) do
    Enum.each(sections, fn section ->
      section
      |> Map.get("questions", [])
      |> Enum.each(fn question ->
        mapping = Map.get(question, "profile_mapping")
        question_id = Map.get(question, "id")
        answer = Map.get(answers, question_id)

        if mapping && not is_nil(answer) do
          apply_profile_mapping!(business_id, client_id, mapping, answer, submission)
        end
      end)
    end)
  end

  defp apply_profile_mapping!(
         business_id,
         client_id,
         %{"kind" => "core", "section" => section, "field" => field},
         answer,
         _submission
       )
       when is_binary(field) and field != "" do
    with {:ok, section_key} <- core_profile_section(section),
         {:ok, profile} <- get_or_create_profile(business_id, client_id) do
      current = Map.get(profile, section_key) || %{}
      attrs = %{Atom.to_string(section_key) => Map.put(current, field, answer)}

      case update_profile(business_id, client_id, attrs) do
        {:ok, _profile} -> :ok
        {:error, reason} -> Repo.rollback(reason)
      end
    else
      {:error, reason} -> Repo.rollback(reason)
    end
  end

  defp apply_profile_mapping!(
         business_id,
         client_id,
         %{"kind" => "custom_field", "field_key" => field_key},
         answer,
         submission
       )
       when is_binary(field_key) and field_key != "" do
    case get_profile_field_by_key(business_id, field_key) do
      {:ok, field} ->
        actor = %{type: "client", id: client_id, submission_id: submission.id}

        case upsert_profile_field_value(business_id, client_id, field.id, answer, actor) do
          {:ok, _value} -> :ok
          {:error, reason} -> Repo.rollback(reason)
        end

      {:error, reason} ->
        Repo.rollback(reason)
    end
  end

  defp apply_profile_mapping!(_business_id, _client_id, _mapping, _answer, _submission) do
    Repo.rollback(invalid_profile_mapping_error())
  end

  defp core_profile_section("general"), do: {:ok, :general}
  defp core_profile_section("nutrition"), do: {:ok, :nutrition}
  defp core_profile_section("training"), do: {:ok, :training}
  defp core_profile_section("lifestyle"), do: {:ok, :lifestyle}
  defp core_profile_section(_), do: {:error, invalid_profile_mapping_error()}

  defp answers_from_attrs(%{"answers" => answers}) when is_map(answers), do: {:ok, answers}

  defp answers_from_attrs(%{"answers" => _answers}) do
    {:error, Easy.Error.unprocessable(%{fields: %{answers: ["is invalid"]}})}
  end

  defp answers_from_attrs(_attrs) do
    {:error, Easy.Error.unprocessable(%{fields: %{answers: ["can't be blank"]}})}
  end

  defp ensure_assignment_submittable(%FormAssignment{status: status}) when status in ["assigned", "in_progress"] do
    :ok
  end

  defp ensure_assignment_submittable(_assignment) do
    {:error, Easy.Error.unprocessable(%{fields: %{status: ["cannot be submitted"]}})}
  end

  defp invalid_profile_mapping_error do
    Easy.Error.unprocessable(%{fields: %{profile_mapping: ["is invalid"]}})
  end

  defp get_client(business_id, client_id) do
    Client
    |> Client.for_business(business_id)
    |> Repo.get(client_id)
    |> ok_or_not_found()
  end

  defp get_profile_field(business_id, field_id) do
    ProfileFieldDefinition
    |> ProfileFieldDefinition.for_business(business_id)
    |> Repo.get(field_id)
    |> ok_or_not_found()
  end

  defp get_profile_field_by_key(business_id, key) do
    ProfileFieldDefinition
    |> ProfileFieldDefinition.for_business(business_id)
    |> where([f], f.key == ^key and is_nil(f.archived_at))
    |> Repo.one()
    |> ok_or_not_found()
  end

  defp get_form_assignment(business_id, assignment_id) do
    FormAssignment
    |> FormAssignment.for_business(business_id)
    |> with_business_template(business_id)
    |> Repo.get(assignment_id)
    |> ok_or_not_found()
  end

  defp form_template_has_assignments?(business_id, template_id) do
    FormAssignment
    |> FormAssignment.for_business(business_id)
    |> where([a], a.form_template_id == ^template_id)
    |> Repo.exists?()
  end

  defp with_business_template(query, business_id) do
    query
    |> join(:inner, [a], t in FormTemplate, on: t.id == a.form_template_id and t.business_id == ^business_id)
    |> preload([_a, t], form_template: t)
  end

  defp normalize_actor(%{} = actor) do
    type = actor[:type] || actor["type"]

    if type in @actor_types do
      {:ok,
       %{
         type: type,
         id: actor[:id] || actor["id"],
         submission_id: actor[:submission_id] || actor["submission_id"]
       }}
    else
      {:error, :invalid_actor}
    end
  end

  defp normalize_actor(_actor), do: {:error, :invalid_actor}

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
