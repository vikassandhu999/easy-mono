defmodule Easy.Forms.Assignments do
  alias Easy.ClientAccess
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Forms.{FormAssignment, FormTemplate, Photos, Templates}
  alias Easy.Repo

  import Ecto.Query

  @spec assign_default_intake_to_client(Ctx.t(), String.t()) ::
          {:ok, FormAssignment.t()} | {:error, :not_found | :conflict | :form_template_archived | Ecto.Changeset.t()}
  def assign_default_intake_to_client(%Ctx{} = ctx, client_id) do
    with {:ok, template} <- Templates.get_default_intake(ctx) do
      assign_form_template_to_client(ctx, client_id, template.id, %{})
    end
  end

  @spec assign_form_template_to_client(Ctx.t(), String.t(), String.t(), map()) ::
          {:ok, FormAssignment.t()} | {:error, :not_found | :conflict | :form_template_archived | Ecto.Changeset.t()}
  def assign_form_template_to_client(%Ctx{} = ctx, client_id, template_id, attrs) do
    with {:ok, template} <- Templates.get(ctx, template_id),
         :ok <- ensure_active_template(template),
         {:ok, client} <- ClientAccess.authorize_client(ctx, client_id) do
      create_form_assignment(ctx, client, template, attrs)
    end
  end

  defp ensure_active_template(%FormTemplate{status: :active}), do: :ok
  defp ensure_active_template(_template), do: {:error, :form_template_archived}

  defp create_form_assignment(ctx, client, %FormTemplate{purpose: :intake} = template, attrs) do
    Repo.transact(fn -> create_intake_assignment(ctx, client, template, attrs) end)
  end

  defp create_form_assignment(ctx, client, template, attrs) do
    insert_and_load_assignment(ctx, client, template, attrs)
  end

  defp insert_and_load_assignment(ctx, client, template, attrs) do
    with {:ok, assignment} <- insert_form_assignment(ctx, client, template, attrs) do
      get_form_assignment(ctx.business_id, assignment.id)
    end
  end

  defp create_intake_assignment(ctx, client, template, attrs) do
    locked_client =
      Client
      |> Client.for_business(ctx.business_id)
      |> Client.visible_to(ctx)
      |> where([candidate], candidate.id == ^client.id)
      |> lock("FOR UPDATE")
      |> Repo.one()

    cond do
      is_nil(locked_client) -> {:error, :not_found}
      intake_assignment_exists?(ctx.business_id, client.id) -> {:error, :conflict}
      true -> insert_and_load_assignment(ctx, client, template, attrs)
    end
  end

  defp insert_form_assignment(ctx, client, template, attrs) do
    ctx.business_id
    |> FormAssignment.insert_changeset(client.id, template.id, template.purpose, attrs)
    |> Repo.insert()
  end

  defp intake_assignment_exists?(business_id, client_id) do
    FormAssignment
    |> FormAssignment.for_client(business_id, client_id)
    |> where([assignment], assignment.purpose == :intake)
    |> Repo.exists?()
  end

  @spec list_form_assignments_for_client(Ctx.t(), String.t()) ::
          {:ok, [FormAssignment.t()]} | {:error, :not_found}
  def list_form_assignments_for_client(%Ctx{} = ctx, client_id) do
    with :ok <- ClientAccess.authorize_client_id(ctx, client_id) do
      assignments =
        client_assignment_query(ctx, client_id)
        |> FormAssignment.oldest()
        |> Repo.all()
        |> Enum.map(&FormAssignment.put_latest_submission/1)

      {:ok, assignments}
    end
  end

  @spec get_intake_for_client(Ctx.t(), String.t()) ::
          {:ok, FormAssignment.t() | nil} | {:error, :not_found}
  def get_intake_for_client(%Ctx{} = ctx, client_id) do
    with :ok <- ClientAccess.authorize_client_id(ctx, client_id) do
      assignment =
        client_assignment_query(ctx, client_id)
        |> where([a], a.purpose == :intake)
        |> order_by([a], desc: a.inserted_at, desc: a.id)
        |> limit(1)
        |> Repo.one()
        |> FormAssignment.put_latest_submission()

      {:ok, assignment}
    end
  end

  @spec list_client_form_assignments(Ctx.t()) ::
          {:ok, [FormAssignment.t()]} | {:error, :not_found}
  def list_client_form_assignments(%Ctx{} = ctx) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx) do
      assignments =
        client_assignment_query(ctx, client_id)
        |> FormAssignment.oldest()
        |> Repo.all()
        |> then(&Photos.attach_assignments(ctx, &1))
        |> Enum.map(&FormAssignment.put_latest_submission/1)

      {:ok, assignments}
    end
  end

  @spec update_form_assignment(Ctx.t(), String.t(), map()) ::
          {:ok, FormAssignment.t()} | {:error, :not_found | :assignment_changed | Ecto.Changeset.t()}
  def update_form_assignment(%Ctx{} = ctx, assignment_id, attrs) do
    with {:ok, assignment} <- get_form_assignment(ctx.business_id, assignment_id),
         :ok <- ClientAccess.authorize_client_id(ctx, assignment.client_id) do
      Repo.transact(fn -> update_locked_assignment(ctx, assignment_id, attrs) end)
    end
  end

  defp update_locked_assignment(ctx, assignment_id, attrs) do
    locked =
      FormAssignment
      |> FormAssignment.for_business(ctx.business_id)
      |> where([a], a.id == ^assignment_id)
      |> lock("FOR UPDATE")
      |> Repo.one()

    with {:ok, current} <- ok_or_not_found(locked),
         :ok <- FormAssignment.check_expected_status(current, attrs),
         {:ok, _updated} <-
           current |> FormAssignment.update_changeset(DateTime.utc_now(:second), attrs) |> Repo.update() do
      get_form_assignment(ctx.business_id, assignment_id)
    end
  end

  @spec get_client_form_assignment(Ctx.t(), String.t()) ::
          {:ok, FormAssignment.t()} | {:error, :not_found}
  def get_client_form_assignment(%Ctx{} = ctx, assignment_id) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx) do
      client_assignment_query(ctx, client_id)
      |> Repo.get(assignment_id)
      |> then(&Photos.attach_assignments(ctx, &1))
      |> FormAssignment.put_latest_submission()
      |> ok_or_not_found()
    end
  end

  @spec send_intake_reminder(Ctx.t(), String.t()) ::
          {:ok, FormAssignment.t()}
          | {:error, :not_found | :invalid_intake_assignment | :reminder_email_missing}
  def send_intake_reminder(%Ctx{} = ctx, assignment_id) do
    with {:ok, assignment} <- get_form_assignment(ctx.business_id, assignment_id),
         {:ok, client} <- ClientAccess.authorize_client(ctx, assignment.client_id),
         :ok <- ensure_intake_assignment(assignment),
         :ok <- ensure_reminder_email(client),
         :ok <- ensure_reminder_access(client) do
      name = Client.full_name(client)
      email = Easy.Emails.intake_reminder_email(client.email, name, assignment.id)

      :ok = Easy.MailerDelivery.deliver_async(email, metadata: %{assignment_id: assignment.id})
      {:ok, assignment}
    end
  end

  defp ensure_intake_assignment(%FormAssignment{purpose: :intake, status: status})
       when status in [:assigned, :in_progress, :missed], do: :ok

  defp ensure_intake_assignment(%FormAssignment{}), do: {:error, :invalid_intake_assignment}

  defp ensure_reminder_email(%Client{email: email}) when is_binary(email) and email != "", do: :ok
  defp ensure_reminder_email(%Client{}), do: {:error, :reminder_email_missing}

  defp ensure_reminder_access(%Client{status: :active}), do: :ok
  defp ensure_reminder_access(_client), do: {:error, :invalid_intake_assignment}

  defp client_assignment_query(%Ctx{} = ctx, client_id) do
    FormAssignment
    |> FormAssignment.for_client(ctx.business_id, client_id)
    |> FormAssignment.include_form_template(ctx.business_id)
    |> FormAssignment.include_submission_reviews(ctx.business_id)
  end

  defp get_form_assignment(business_id, assignment_id) do
    FormAssignment
    |> FormAssignment.for_business(business_id)
    |> FormAssignment.include_form_template(business_id)
    |> Repo.get(assignment_id)
    |> ok_or_not_found()
  end

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
