defmodule Easy.Forms.Templates do
  alias Easy.Ctx
  alias Easy.DefaultCheckIn
  alias Easy.DefaultIntake
  alias Easy.Forms.FormAssignment
  alias Easy.Forms.FormTemplate
  alias Easy.Repo

  import Ecto.Query

  @spec list(Ctx.t()) :: {:ok, [FormTemplate.t()]} | {:error, Ecto.Changeset.t()}
  def list(%Ctx{} = ctx) do
    with {:ok, _template} <- get_or_create_default_check_in_template(ctx) do
      templates =
        FormTemplate
        |> FormTemplate.for_business(ctx.business_id)
        |> FormTemplate.join_response_count(ctx.business_id)
        |> FormTemplate.oldest()
        |> Repo.all()

      {:ok, templates}
    end
  end

  # No cursor preserves the legacy full-list contract during the coachapp rebuild.
  @spec list_page(Ctx.t(), keyword()) ::
          {:ok, Easy.CursorPage.t(FormTemplate.t())}
          | {:error, :cursor_required | :invalid_cursor | Ecto.Changeset.t()}
  def list_page(%Ctx{} = ctx, opts \\ []) do
    case Keyword.get(opts, :cursor) do
      nil ->
        list_legacy_page(ctx, opts)

      cursor ->
        list_cursor_page(ctx, cursor, opts)
    end
  end

  defp list_legacy_page(ctx, opts) do
    if pagination_requested?(opts) do
      {:error, :cursor_required}
    else
      with {:ok, templates} <- list(ctx) do
        {:ok, %{data: templates, count: length(templates), next_cursor: nil}}
      end
    end
  end

  defp pagination_requested?(opts) do
    Enum.any?([:limit, :search, :purpose], &(not is_nil(Keyword.get(opts, &1))))
  end

  defp list_cursor_page(ctx, cursor, opts) do
    base =
      FormTemplate
      |> FormTemplate.for_business(ctx.business_id)
      |> FormTemplate.for_search(Keyword.get(opts, :search))
      |> FormTemplate.for_purpose(Keyword.get(opts, :purpose))

    limit = Easy.CursorPage.limit(opts)

    with {:ok, query} <- Easy.CursorPage.query(base, cursor, limit),
         {:ok, _template} <- get_or_create_default_check_in_template(ctx) do
      count = Repo.aggregate(base, :count, :id)
      rows = query |> FormTemplate.join_response_count(ctx.business_id) |> Repo.all()
      {:ok, Easy.CursorPage.finish(rows, limit, count)}
    end
  end

  @spec create(Ctx.t(), map()) ::
          {:ok, FormTemplate.t()} | {:error, Ecto.Changeset.t()}
  def create(%Ctx{} = ctx, attrs) do
    ctx.business_id
    |> FormTemplate.insert_changeset(attrs)
    |> Repo.insert()
  end

  @spec get(Ctx.t(), String.t()) :: {:ok, FormTemplate.t()} | {:error, :not_found}
  def get(%Ctx{} = ctx, template_id) do
    FormTemplate
    |> FormTemplate.for_business(ctx.business_id)
    |> Repo.get(template_id)
    |> ok_or_not_found()
  end

  @spec update(Ctx.t(), String.t(), map()) ::
          {:ok, FormTemplate.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update(%Ctx{} = ctx, template_id, attrs) do
    with {:ok, template} <- get(ctx, template_id) do
      template
      |> FormTemplate.update_changeset(attrs)
      |> Repo.update()
    end
  end

  @spec set_default_intake(Ctx.t(), String.t()) ::
          {:ok, FormTemplate.t()}
          | {:error, :not_found | :invalid_default_intake_template | Ecto.Changeset.t()}
  def set_default_intake(%Ctx{} = ctx, template_id) do
    with {:ok, template} <- get(ctx, template_id),
         :ok <- ensure_active_intake_template(template) do
      Repo.transact(fn -> set_default_intake_template_transaction(ctx, template) end)
    end
  end

  @spec clear_default_intake(Ctx.t(), String.t()) ::
          {:ok, FormTemplate.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def clear_default_intake(%Ctx{} = ctx, template_id) do
    with {:ok, template} <- get(ctx, template_id) do
      template |> FormTemplate.default_intake_changeset(false) |> Repo.update()
    end
  end

  defp set_default_intake_template_transaction(ctx, template) do
    FormTemplate
    |> FormTemplate.for_business(ctx.business_id)
    |> FormTemplate.default_intake()
    |> where([t], t.id != ^template.id)
    |> Repo.update_all(set: [is_default_intake: false, updated_at: DateTime.utc_now(:second)])

    template
    |> FormTemplate.default_intake_changeset(true)
    |> Repo.update()
  end

  defp ensure_active_intake_template(%FormTemplate{purpose: :intake, status: :active}), do: :ok
  defp ensure_active_intake_template(_template), do: {:error, :invalid_default_intake_template}

  @spec delete(Ctx.t(), String.t()) ::
          {:ok, FormTemplate.t()} | {:error, :not_found | :form_template_assigned | Ecto.Changeset.t()}
  def delete(%Ctx{} = ctx, template_id) do
    with {:ok, template} <- get(ctx, template_id) do
      if form_template_has_assignments?(ctx.business_id, template.id) do
        {:error, :form_template_assigned}
      else
        template
        |> FormTemplate.delete_changeset()
        |> Repo.delete()
      end
    end
  end

  # The flagged default wins while it is still an active intake template;
  # otherwise (none flagged, archived, or deleted) fall back to the
  # oldest-active-or-create behavior. Never rewrites existing assignments.
  @spec get_default_intake(Ctx.t()) :: {:ok, FormTemplate.t()} | {:error, Ecto.Changeset.t()}
  def get_default_intake(%Ctx{} = ctx) do
    FormTemplate
    |> FormTemplate.for_business(ctx.business_id)
    |> FormTemplate.active_intake()
    |> FormTemplate.default_intake()
    |> Repo.one()
    |> case do
      nil -> get_or_create_default_intake_template(ctx)
      template -> {:ok, template}
    end
  end

  defp get_or_create_default_intake_template(%Ctx{} = ctx) do
    FormTemplate
    |> FormTemplate.for_business(ctx.business_id)
    |> FormTemplate.active_intake()
    |> FormTemplate.oldest()
    |> limit(1)
    |> Repo.one()
    |> case do
      nil ->
        create(ctx, %{
          "name" => "Intake",
          "purpose" => "intake",
          "status" => "active",
          "sections" => DefaultIntake.sections()
        })

      template ->
        {:ok, template}
    end
  end

  defp get_or_create_default_check_in_template(%Ctx{} = ctx) do
    case default_check_in_template(ctx.business_id) do
      nil -> insert_default_check_in_template(ctx)
      template -> evolve_default_check_in_template(template)
    end
  end

  defp insert_default_check_in_template(ctx) do
    attrs = %{
      "name" => "Weekly check-in",
      "purpose" => "check_in",
      "status" => "active",
      "sections" => DefaultCheckIn.sections(),
      "system_version" => DefaultCheckIn.system_version()
    }

    with {:ok, _template} <-
           ctx.business_id
           |> FormTemplate.insert_system_changeset("weekly_check_in", attrs)
           |> Repo.insert(
             on_conflict: :nothing,
             conflict_target: {:unsafe_fragment, "(business_id, system_key) WHERE system_key IS NOT NULL"}
           ) do
      {:ok, default_check_in_template(ctx.business_id)}
    end
  end

  defp evolve_default_check_in_template(%FormTemplate{system_version: version} = template)
       when is_integer(version) and version >= 2,
       do: {:ok, template}

  defp evolve_default_check_in_template(template) do
    sections = DefaultCheckIn.upgrade_sections(template.sections)

    template
    |> FormTemplate.system_content_changeset(sections, DefaultCheckIn.system_version())
    |> Repo.update()
  end

  defp default_check_in_template(business_id) do
    FormTemplate
    |> FormTemplate.for_business(business_id)
    |> FormTemplate.for_system_key("weekly_check_in")
    |> Repo.one()
  end

  defp form_template_has_assignments?(business_id, template_id) do
    FormAssignment
    |> FormAssignment.for_business(business_id)
    |> where([a], a.form_template_id == ^template_id)
    |> Repo.exists?()
  end

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
