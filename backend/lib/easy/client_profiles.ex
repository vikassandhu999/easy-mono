defmodule Easy.ClientProfiles do
  alias Easy.Attachments.Attachment
  alias Easy.ClientProfiles.CheckInSchedule
  alias Easy.ClientProfiles.ClientProfile
  alias Easy.ClientProfiles.FormAssignment
  alias Easy.ClientProfiles.FormSubmission
  alias Easy.ClientProfiles.FormTemplate
  alias Easy.ClientProfiles.ProfileFieldDefinition
  alias Easy.ClientProfiles.ProfileFieldValue
  alias Easy.Clients
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.DefaultCheckIn
  alias Easy.DefaultIntake
  alias Easy.Fitness.WeightEntry
  alias Easy.Orgs.Business
  alias Easy.Repo
  alias Easy.Storage

  import Ecto.Query

  @spec get_or_create_client_profile(Ctx.t()) ::
          {:ok, ClientProfile.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def get_or_create_client_profile(%Ctx{} = ctx) do
    with {:ok, client} <- get_client(ctx) do
      get_or_create_profile(ctx, client.id)
    end
  end

  @spec get_or_create_profile(Ctx.t(), String.t()) ::
          {:ok, ClientProfile.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def get_or_create_profile(%Ctx{} = ctx, client_id) do
    with {:ok, client} <- fetch_client(ctx.business_id, client_id) do
      case fetch_profile(ctx.business_id, client.id) do
        nil ->
          insert_profile(ctx.business_id, client.id)

        %ClientProfile{} = profile ->
          {:ok, profile}
      end
    end
  end

  defp insert_profile(business_id, client_id) do
    case business_id |> ClientProfile.insert_changeset(client_id) |> Repo.insert() do
      {:ok, profile} -> {:ok, profile}
      {:error, %Ecto.Changeset{}} -> ok_or_not_found(fetch_profile(business_id, client_id))
    end
  end

  defp fetch_profile(business_id, client_id) do
    ClientProfile
    |> ClientProfile.for_client(business_id, client_id)
    |> Repo.one()
  end

  @spec update_profile(Ctx.t(), String.t(), map()) ::
          {:ok, ClientProfile.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_profile(%Ctx{} = ctx, client_id, attrs) do
    with {:ok, profile} <- get_or_create_profile(ctx, client_id) do
      profile
      |> ClientProfile.update_changeset(attrs)
      |> Repo.update()
    end
  end

  # Case-2 wrappers (coach controller, client_id trusted from the URL path only).
  # get_or_create_profile/2 and update_profile/3 stay unguarded because they are
  # also called internally on a Case-3 client's own already-resolved client_id
  # (update_client_profile_sections, apply_profile_mapping!), where ctx is a
  # client-role Ctx that Client.visible_to/2 would reject outright.
  @spec get_or_create_profile_for_client(Ctx.t(), String.t()) ::
          {:ok, ClientProfile.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def get_or_create_profile_for_client(%Ctx{} = ctx, client_id) do
    with :ok <- Clients.authorize_client_id(ctx, client_id) do
      get_or_create_profile(ctx, client_id)
    end
  end

  @spec update_profile_for_client(Ctx.t(), String.t(), map()) ::
          {:ok, ClientProfile.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_profile_for_client(%Ctx{} = ctx, client_id, attrs) do
    with :ok <- Clients.authorize_client_id(ctx, client_id) do
      update_profile(ctx, client_id, attrs)
    end
  end

  @spec update_client_profile_sections(Ctx.t(), map()) ::
          {:ok, ClientProfile.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_client_profile_sections(%Ctx{} = ctx, attrs) do
    with {:ok, client} <- get_client(ctx),
         {:ok, profile} <- get_or_create_profile(ctx, client.id) do
      profile
      |> ClientProfile.update_sections_changeset(attrs)
      |> Repo.update()
    end
  end

  @spec list_profile_fields(Ctx.t()) :: {:ok, [ProfileFieldDefinition.t()]}
  def list_profile_fields(%Ctx{} = ctx) do
    fields =
      ProfileFieldDefinition
      |> ProfileFieldDefinition.for_business(ctx.business_id)
      |> where([f], is_nil(f.archived_at))
      |> order_by([f], asc: f.section, asc: f.inserted_at)
      |> Repo.all()

    {:ok, fields}
  end

  @spec create_profile_field(Ctx.t(), map()) ::
          {:ok, ProfileFieldDefinition.t()} | {:error, Ecto.Changeset.t()}
  def create_profile_field(%Ctx{} = ctx, attrs) do
    ctx.business_id
    |> ProfileFieldDefinition.insert_changeset(attrs)
    |> Repo.insert()
  end

  @spec update_profile_field(Ctx.t(), String.t(), map()) ::
          {:ok, ProfileFieldDefinition.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_profile_field(%Ctx{} = ctx, field_id, attrs) do
    with {:ok, field} <- get_profile_field(ctx.business_id, field_id) do
      field
      |> ProfileFieldDefinition.update_changeset(attrs)
      |> Repo.update()
    end
  end

  @spec archive_profile_field(Ctx.t(), String.t()) ::
          {:ok, ProfileFieldDefinition.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def archive_profile_field(%Ctx{} = ctx, field_id) do
    with {:ok, field} <- get_profile_field(ctx.business_id, field_id) do
      field
      |> ProfileFieldDefinition.archive_changeset()
      |> Repo.update()
    end
  end

  @spec upsert_profile_field_value(Ctx.t(), String.t(), String.t(), any(), map()) ::
          {:ok, ProfileFieldValue.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def upsert_profile_field_value(%Ctx{} = ctx, client_id, field_id, value, %{
        type: actor_type,
        id: actor_id,
        submission_id: submission_id
      }) do
    with {:ok, _client} <- fetch_client(ctx.business_id, client_id),
         {:ok, field} <- get_profile_field(ctx.business_id, field_id) do
      attrs = %{"value" => %{"value" => value}, "updated_from_submission_id" => submission_id}
      updated_by_type = safe_actor_atom(actor_type)
      updated_at = DateTime.utc_now(:second)

      ctx.business_id
      |> ProfileFieldValue.insert_changeset(client_id, field.id, updated_by_type, actor_id, attrs)
      |> Repo.insert(
        on_conflict: [
          set: [
            value: %{"value" => value},
            updated_by_type: updated_by_type,
            updated_by_id: actor_id,
            updated_from_submission_id: submission_id,
            updated_at: updated_at
          ]
        ],
        conflict_target: [:client_id, :profile_field_definition_id],
        returning: true
      )
    end
  end

  @spec list_form_templates(Ctx.t()) :: {:ok, [FormTemplate.t()]}
  def list_form_templates(%Ctx{} = ctx) do
    with {:ok, _template} <- get_or_create_default_check_in_template(ctx) do
      templates =
        FormTemplate
        |> FormTemplate.for_business(ctx.business_id)
        |> order_by([t], asc: t.inserted_at)
        |> Repo.all()

      {:ok, templates}
    end
  end

  @spec create_form_template(Ctx.t(), map()) ::
          {:ok, FormTemplate.t()} | {:error, Ecto.Changeset.t()}
  def create_form_template(%Ctx{} = ctx, attrs) do
    ctx.business_id
    |> FormTemplate.insert_changeset(attrs)
    |> Repo.insert()
  end

  @spec assign_default_intake_to_client(Ctx.t(), String.t()) ::
          {:ok, FormAssignment.t()} | {:error, term()}
  def assign_default_intake_to_client(%Ctx{} = ctx, client_id) do
    with {:ok, template} <- get_or_create_default_intake_template(ctx) do
      assign_form_template_to_client(ctx, client_id, template.id, %{})
    end
  end

  @spec get_form_template(Ctx.t(), String.t()) :: {:ok, FormTemplate.t()} | {:error, :not_found}
  def get_form_template(%Ctx{} = ctx, template_id) do
    FormTemplate
    |> FormTemplate.for_business(ctx.business_id)
    |> Repo.get(template_id)
    |> ok_or_not_found()
  end

  @spec update_form_template(Ctx.t(), String.t(), map()) ::
          {:ok, FormTemplate.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_form_template(%Ctx{} = ctx, template_id, attrs) do
    with {:ok, template} <- get_form_template(ctx, template_id) do
      template
      |> FormTemplate.update_changeset(attrs)
      |> Repo.update()
    end
  end

  @spec delete_form_template(Ctx.t(), String.t()) ::
          {:ok, FormTemplate.t()} | {:error, :not_found | :form_template_assigned | Ecto.Changeset.t()}
  def delete_form_template(%Ctx{} = ctx, template_id) do
    with {:ok, template} <- get_form_template(ctx, template_id) do
      if form_template_has_assignments?(ctx.business_id, template.id) do
        {:error, :form_template_assigned}
      else
        # no_assoc_constraint backstops the check above against a TOCTOU race: the FK is
        # :restrict, so an assignment inserted after the check makes Repo.delete return an
        # error changeset (-> 422) instead of silently cascade-deleting it.
        template
        |> Ecto.Changeset.change()
        |> Ecto.Changeset.no_assoc_constraint(:form_assignments,
          name: :form_assignments_template_business_id_fkey,
          message: "has assignments"
        )
        |> Repo.delete()
      end
    end
  end

  @spec assign_form_template_to_client(Ctx.t(), String.t(), String.t(), map()) ::
          {:ok, FormAssignment.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def assign_form_template_to_client(%Ctx{} = ctx, client_id, template_id, attrs) do
    with {:ok, template} <- get_form_template(ctx, template_id),
         {:ok, client} <- Clients.authorize_client(ctx, client_id) do
      attrs = %{
        "priority" => Map.get(attrs, :priority, "normal"),
        "due_date" => Map.get(attrs, :due_date),
        "purpose" => template.purpose,
        "status" => "assigned"
      }

      with {:ok, assignment} <-
             ctx.business_id
             |> FormAssignment.insert_changeset(client.id, template.id, attrs)
             |> Repo.insert() do
        get_form_assignment(ctx.business_id, assignment.id)
      end
    end
  end

  @spec list_form_assignments_for_client(Ctx.t(), String.t()) ::
          {:ok, [FormAssignment.t()]} | {:error, :not_found}
  def list_form_assignments_for_client(%Ctx{} = ctx, client_id) do
    with {:ok, _client} <- Clients.authorize_client(ctx, client_id) do
      assignments =
        FormAssignment
        |> FormAssignment.for_client(ctx.business_id, client_id)
        |> include_form_template(ctx.business_id)
        |> include_submission_reviews(ctx.business_id)
        |> order_by([a, _t], asc: a.inserted_at)
        |> Repo.all()
        |> put_latest_submission_reviews()

      {:ok, assignments}
    end
  end

  @spec list_client_form_assignments(Ctx.t()) ::
          {:ok, [FormAssignment.t()]} | {:error, :not_found}
  def list_client_form_assignments(%Ctx{} = ctx) do
    with {:ok, client} <- get_client(ctx) do
      assignments =
        FormAssignment
        |> FormAssignment.for_client(ctx.business_id, client.id)
        |> include_form_template(ctx.business_id)
        |> include_submission_reviews(ctx.business_id)
        |> order_by([a, _t], asc: a.inserted_at)
        |> Repo.all()
        |> put_latest_submission_reviews()

      {:ok, assignments}
    end
  end

  @spec update_form_assignment(Ctx.t(), String.t(), map()) ::
          {:ok, FormAssignment.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_form_assignment(%Ctx{} = ctx, assignment_id, attrs) do
    with {:ok, assignment} <- get_form_assignment(ctx.business_id, assignment_id),
         :ok <- Clients.authorize_client_id(ctx, assignment.client_id) do
      Repo.transaction(fn -> update_form_assignment_transaction(ctx, assignment, attrs) end)
    end
  end

  @spec list_check_in_schedules_for_client(Ctx.t(), String.t()) ::
          {:ok, [CheckInSchedule.t()]} | {:error, :not_found}
  def list_check_in_schedules_for_client(%Ctx{} = ctx, client_id) do
    with :ok <- Clients.authorize_client_id(ctx, client_id) do
      schedules =
        CheckInSchedule
        |> CheckInSchedule.for_client(ctx.business_id, client_id)
        |> CheckInSchedule.include_template(ctx.business_id)
        |> order_by([schedule], asc: schedule.next_due_on, asc: schedule.id)
        |> Repo.all()

      {:ok, schedules}
    end
  end

  @spec create_check_in_schedule_for_client(Ctx.t(), String.t(), map()) ::
          {:ok, CheckInSchedule.t()}
          | {:error, :not_found | :invalid_check_in_template | Ecto.Changeset.t()}
  def create_check_in_schedule_for_client(
        %Ctx{} = ctx,
        client_id,
        %{form_template_id: template_id} = attrs
      ) do
    with :ok <- Clients.authorize_client_id(ctx, client_id),
         {:ok, client} <- fetch_client(ctx.business_id, client_id),
         {:ok, template} <- get_form_template(ctx, template_id),
         :ok <- ensure_check_in_template(template) do
      Repo.transaction(fn -> create_check_in_schedule_transaction(ctx, client, template, attrs) end)
    end
  end

  @spec update_check_in_schedule(Ctx.t(), String.t(), map()) ::
          {:ok, CheckInSchedule.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_check_in_schedule(%Ctx{} = ctx, schedule_id, attrs) do
    with {:ok, schedule} <- get_check_in_schedule(ctx.business_id, schedule_id),
         :ok <- Clients.authorize_client_id(ctx, schedule.client_id) do
      case schedule |> CheckInSchedule.update_changeset(attrs) |> Repo.update() do
        {:ok, updated} -> {:ok, reload_check_in_schedule(updated)}
        {:error, changeset} -> {:error, changeset}
      end
    end
  end

  @spec delete_check_in_schedule(Ctx.t(), String.t()) ::
          {:ok, CheckInSchedule.t()} | {:error, :not_found | :schedule_has_assignments | Ecto.Changeset.t()}
  def delete_check_in_schedule(%Ctx{} = ctx, schedule_id) do
    with {:ok, schedule} <- get_check_in_schedule(ctx.business_id, schedule_id),
         :ok <- Clients.authorize_client_id(ctx, schedule.client_id),
         :ok <- ensure_schedule_unused(ctx.business_id, schedule.id) do
      Repo.delete(schedule)
    end
  end

  @spec generate_due_check_ins(Date.t()) :: {non_neg_integer(), non_neg_integer()}
  def generate_due_check_ins(today) do
    due_schedules(today)
    |> Enum.reduce({0, 0}, &generate_due_check_in(&1, today, &2))
  end

  @spec send_due_check_in_reminders(Date.t()) :: {non_neg_integer(), non_neg_integer()}
  def send_due_check_in_reminders(today) do
    FormAssignment
    |> FormAssignment.open()
    |> where(
      [assignment],
      assignment.purpose == :check_in and assignment.due_date == ^today and
        is_nil(assignment.due_reminder_sent_at)
    )
    |> include_assignment_client()
    |> Repo.all()
    |> send_check_in_reminders(:due)
  end

  @spec send_overdue_check_in_reminders(Date.t()) :: {non_neg_integer(), non_neg_integer()}
  def send_overdue_check_in_reminders(today) do
    cutoff = Date.add(today, -2)

    FormAssignment
    |> FormAssignment.open()
    |> where(
      [assignment],
      assignment.purpose == :check_in and assignment.due_date <= ^cutoff and
        is_nil(assignment.overdue_reminder_sent_at)
    )
    |> include_assignment_client()
    |> Repo.all()
    |> send_check_in_reminders(:overdue)
  end

  @spec list_form_submissions(Ctx.t(), String.t()) ::
          {:ok, [FormSubmission.t()]} | {:error, :not_found}
  def list_form_submissions(%Ctx{} = ctx, assignment_id) do
    with {:ok, assignment} <- get_form_assignment(ctx.business_id, assignment_id),
         :ok <- Clients.authorize_client_id(ctx, assignment.client_id) do
      submissions =
        FormSubmission
        |> FormSubmission.for_assignment(ctx.business_id, assignment_id)
        |> FormSubmission.newest()
        |> Repo.all()
        |> attach_submission_attachments(ctx.business_id)

      {:ok, submissions}
    end
  end

  @spec list_unreviewed_check_in_submissions(Ctx.t()) :: {:ok, [FormSubmission.t()]}
  def list_unreviewed_check_in_submissions(%Ctx{} = ctx) do
    submissions =
      FormSubmission
      |> FormSubmission.for_business(ctx.business_id)
      |> FormSubmission.unreviewed()
      |> FormSubmission.for_check_ins()
      |> FormSubmission.for_visible_clients(ctx)
      |> FormSubmission.include_review_context(ctx.business_id)
      |> FormSubmission.newest()
      |> Repo.all()
      |> attach_submission_attachments(ctx.business_id)

    {:ok, submissions}
  end

  @spec review_form_submission(Ctx.t(), String.t()) ::
          {:ok, FormSubmission.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def review_form_submission(%Ctx{} = ctx, submission_id) do
    with {:ok, submission} <- get_form_submission(ctx.business_id, submission_id),
         :ok <- Clients.authorize_client_id(ctx, submission.client_id) do
      case review_form_submission_once(submission, ctx.user_id) do
        {:ok, reviewed} -> {:ok, attach_submission_attachment(ctx.business_id, reviewed)}
        error -> error
      end
    end
  end

  @spec get_form_assignment_for_client(Ctx.t(), String.t(), String.t()) ::
          {:ok, FormAssignment.t()} | {:error, :not_found}
  def get_form_assignment_for_client(%Ctx{} = ctx, client_id, assignment_id) do
    with :ok <- Clients.authorize_client_id(ctx, client_id) do
      FormAssignment
      |> FormAssignment.for_client(ctx.business_id, client_id)
      |> include_form_template(ctx.business_id)
      |> Repo.get(assignment_id)
      |> ok_or_not_found()
    end
  end

  @spec get_client_form_assignment(Ctx.t(), String.t()) ::
          {:ok, FormAssignment.t()} | {:error, :not_found}
  def get_client_form_assignment(%Ctx{} = ctx, assignment_id) do
    with {:ok, client} <- get_client(ctx) do
      FormAssignment
      |> FormAssignment.for_client(ctx.business_id, client.id)
      |> include_form_template(ctx.business_id)
      |> include_submission_reviews(ctx.business_id)
      |> Repo.get(assignment_id)
      |> put_latest_submission_review()
      |> ok_or_not_found()
    end
  end

  @spec submit_client_form_assignment(Ctx.t(), String.t(), map()) ::
          {:ok, FormSubmission.t()}
          | {:error,
             :not_found
             | :invalid_answers
             | :answers_required
             | :unknown_answer_keys
             | :missing_required_answers
             | :invalid_answer_values
             | :assignment_not_submittable
             | :invalid_profile_mapping
             | Ecto.Changeset.t()}
  def submit_client_form_assignment(%Ctx{} = ctx, assignment_id, attrs) do
    with {:ok, answers} <- answers_from_attrs(attrs),
         {:ok, client} <- get_client(ctx),
         {:ok, assignment} <- get_client_form_assignment(ctx, assignment_id),
         :ok <- ensure_assignment_submittable(assignment),
         :ok <- FormSubmission.validate_answers(assignment.form_template.sections, answers),
         :ok <- validate_photo_attachments(ctx.business_id, client.id, assignment.form_template.sections, answers) do
      submit_assignment_transaction(ctx, client, assignment, answers)
    end
  end

  defp submit_assignment_transaction(ctx, client, assignment, answers) do
    case Repo.transaction(fn -> submit_assignment!(ctx, client, assignment, answers) end) do
      {:ok, submission} -> {:ok, attach_submission_attachment(ctx.business_id, submission)}
      error -> error
    end
  end

  defp submit_assignment!(ctx, client, assignment, answers) do
    template = assignment.form_template
    submitted_at = DateTime.utc_now(:second)

    attrs = %{
      "question_snapshot" => template.sections,
      "answers" => answers,
      "submitted_at" => submitted_at
    }

    submission = insert_submission!(ctx.business_id, client.id, assignment.id, attrs)
    append_weight_entries!(ctx.business_id, client, template.sections, answers, submission)
    apply_profile_mappings!(ctx, client.id, template.sections, answers, submission)
    complete_assignment!(ctx, client.id, assignment, submission, submitted_at)
  end

  defp insert_submission!(business_id, client_id, assignment_id, attrs) do
    case FormSubmission.insert_changeset(
           business_id,
           client_id,
           assignment_id,
           :client,
           client_id,
           attrs
         )
         |> Repo.insert() do
      {:ok, submission} -> submission
      {:error, reason} -> Repo.rollback(reason)
    end
  end

  defp append_weight_entries!(business_id, client, sections, answers, submission) do
    weight_answers =
      for %{"questions" => questions} <- List.wrap(sections),
          %{"id" => id, "type" => "weight"} <- List.wrap(questions),
          value = Map.get(answers, id),
          not is_nil(value),
          do: value

    case weight_answers do
      [] ->
        :ok

      values ->
        unit = weight_unit(business_id, client)
        date = DateTime.to_date(submission.submitted_at)

        Enum.each(values, &insert_submission_weight!(business_id, client.id, submission.id, date, unit, &1))
    end
  end

  defp insert_submission_weight!(business_id, client_id, submission_id, date, unit, value) do
    attrs = %{date: date, value: value, unit: unit, form_submission_id: submission_id}

    case business_id |> WeightEntry.insert_changeset(client_id, attrs) |> Repo.insert() do
      {:ok, _entry} -> :ok
      {:error, reason} -> Repo.rollback(reason)
    end
  end

  defp weight_unit(business_id, client) do
    latest_unit =
      WeightEntry
      |> WeightEntry.for_client(business_id, client.id)
      |> WeightEntry.newest()
      |> select([entry], entry.unit)
      |> limit(1)
      |> Repo.one()

    latest_unit || client.goal_weight_unit || default_weight_unit!(business_id)
  end

  defp default_weight_unit!(business_id) do
    case Repo.get(Business, business_id) do
      %Business{default_weight_unit: unit} -> unit
      nil -> Repo.rollback(:not_found)
    end
  end

  defp validate_photo_attachments(business_id, client_id, sections, answers) do
    ids = photo_attachment_ids(sections, answers)

    owned_count =
      Attachment
      |> Attachment.for_client(business_id, client_id)
      |> Attachment.for_purpose(:check_in_photo)
      |> Attachment.with_ids(ids)
      |> Repo.aggregate(:count, :id)

    if owned_count == length(ids), do: :ok, else: {:error, :invalid_answer_values}
  end

  defp attach_submission_attachment(business_id, submission) do
    [attached] = attach_submission_attachments([submission], business_id)
    attached
  end

  defp attach_submission_attachments(submissions, business_id) do
    ids = submissions |> Enum.flat_map(&photo_attachment_ids(&1.question_snapshot, &1.answers)) |> Enum.uniq()

    attachments_by_client_and_id =
      Attachment
      |> Attachment.for_business(business_id)
      |> Attachment.for_purpose(:check_in_photo)
      |> Attachment.with_ids(ids)
      |> Repo.all()
      |> Map.new(&{{&1.client_id, &1.id}, attachment_read_data(&1)})

    Enum.map(submissions, fn submission ->
      attachments =
        submission.question_snapshot
        |> photo_attachment_ids(submission.answers)
        |> Enum.map(&Map.get(attachments_by_client_and_id, {submission.client_id, &1}))
        |> Enum.reject(&is_nil/1)

      %{submission | attachments: attachments}
    end)
  end

  defp attachment_read_data(attachment) do
    signed =
      case Storage.presign_get(attachment.storage_key) do
        {:ok, value} -> value
        {:error, _reason} -> %{url: nil, expires_at: nil}
      end

    %{
      id: attachment.id,
      content_type: attachment.content_type,
      byte_size: attachment.byte_size,
      purpose: attachment.purpose,
      read_url: signed.url,
      read_url_expires_at: signed.expires_at
    }
  end

  defp photo_attachment_ids(sections, answers) do
    for %{"questions" => questions} <- List.wrap(sections),
        %{"id" => id, "type" => "photo"} <- List.wrap(questions),
        attachment_ids when is_list(attachment_ids) <- [Map.get(answers, id, [])],
        attachment_id <- attachment_ids,
        do: attachment_id
  end

  defp complete_assignment!(ctx, client_id, assignment, submission, submitted_at) do
    case assignment |> FormAssignment.complete_changeset(submitted_at) |> Repo.update() do
      {:ok, _assignment} ->
        maybe_sync_intake!(ctx, client_id, assignment.purpose, submitted_at)
        submission

      {:error, reason} ->
        Repo.rollback(reason)
    end
  end

  defp maybe_sync_intake!(ctx, client_id, :intake, submitted_at),
    do: sync_intake_completed!(ctx, client_id, submitted_at)

  defp maybe_sync_intake!(_ctx, _client_id, _purpose, _submitted_at), do: :ok

  defp sync_intake_completed!(ctx, client_id, submitted_at) do
    case get_or_create_profile(ctx, client_id) do
      {:ok, profile} ->
        profile
        |> Ecto.Changeset.change(intake_status: :completed, intake_completed_at: submitted_at)
        |> Repo.update()
        |> case do
          {:ok, _} -> :ok
          {:error, reason} -> Repo.rollback(reason)
        end

      {:error, reason} ->
        Repo.rollback(reason)
    end
  end

  defp sync_intake_status!(ctx, %FormAssignment{purpose: :intake} = assignment) do
    case get_or_create_profile(ctx, assignment.client_id) do
      {:ok, profile} ->
        profile
        |> Ecto.Changeset.change(
          intake_status: assignment.status,
          intake_completed_at: assignment.completed_at
        )
        |> Repo.update()
        |> case do
          {:ok, _profile} -> :ok
          {:error, reason} -> Repo.rollback(reason)
        end

      {:error, reason} ->
        Repo.rollback(reason)
    end
  end

  defp sync_intake_status!(_ctx, _assignment), do: :ok

  defp update_form_assignment_transaction(ctx, assignment, attrs) do
    case assignment |> FormAssignment.update_changeset(attrs) |> Repo.update() do
      {:ok, updated} ->
        sync_intake_status!(ctx, updated)
        updated

      {:error, changeset} ->
        Repo.rollback(changeset)
    end
  end

  defp create_check_in_schedule_transaction(ctx, client, template, attrs) do
    schedule =
      case ctx.business_id |> CheckInSchedule.insert_changeset(client.id, template.id, attrs) |> Repo.insert() do
        {:ok, schedule} -> schedule
        {:error, changeset} -> Repo.rollback(changeset)
      end

    if Date.compare(schedule.next_due_on, Date.utc_today()) in [:lt, :eq] do
      process_due_schedule(schedule, client, template, Date.utc_today())
    end

    reload_check_in_schedule(schedule)
  end

  defp generate_due_check_in(schedule_id, today, counts) do
    case Repo.transaction(fn -> generate_due_check_in_transaction(schedule_id, today) end) do
      {:ok, :generated} -> increment_count(counts, 0)
      {:ok, :inactive} -> increment_count(counts, 1)
      {:ok, :noop} -> counts
      {:error, _reason} -> counts
    end
  end

  defp send_check_in_reminders(assignments, reminder_type) do
    Enum.reduce(assignments, {0, 0}, &send_check_in_reminder(&1, reminder_type, &2))
  end

  defp send_check_in_reminder(%FormAssignment{client: %Client{email: email}} = assignment, type, counts)
       when is_binary(email) do
    name = [assignment.client.first_name, assignment.client.last_name] |> Enum.filter(&is_binary/1) |> Enum.join(" ")
    email_message = reminder_email(type, email, name, assignment.id)

    case Easy.MailerDelivery.deliver_sync(email_message, metadata: %{assignment_id: assignment.id}) do
      {:ok, _response} ->
        case stamp_reminder(assignment, type) do
          {:ok, _assignment} -> increment_count(counts, 0)
          {:error, _changeset} -> increment_count(counts, 1)
        end

      {:error, _reason} ->
        increment_count(counts, 1)
    end
  end

  defp send_check_in_reminder(_assignment, _type, counts), do: increment_count(counts, 1)

  defp reminder_email(:due, email, name, assignment_id),
    do: Easy.Emails.check_in_due_email(email, name, assignment_id)

  defp reminder_email(:overdue, email, name, assignment_id),
    do: Easy.Emails.check_in_overdue_email(email, name, assignment_id)

  defp stamp_reminder(assignment, type) do
    field = if type == :due, do: :due_reminder_sent_at, else: :overdue_reminder_sent_at
    assignment |> Ecto.Changeset.change([{field, DateTime.utc_now(:second)}]) |> Repo.update()
  end

  defp include_assignment_client(query) do
    from(assignment in query,
      join: client in Client,
      on: client.id == assignment.client_id and client.business_id == assignment.business_id,
      preload: [client: client]
    )
  end

  defp generate_due_check_in_transaction(schedule_id, today) do
    schedule =
      CheckInSchedule
      |> where([schedule], schedule.id == ^schedule_id)
      |> lock("FOR UPDATE")
      |> Repo.one()

    process_locked_schedule(schedule, today)
  end

  defp process_locked_schedule(%CheckInSchedule{active: true} = schedule, today) do
    if Date.compare(schedule.next_due_on, today) in [:lt, :eq] do
      with {:ok, client} <- fetch_client(schedule.business_id, schedule.client_id),
           {:ok, template} <- fetch_form_template(schedule.business_id, schedule.form_template_id) do
        process_due_schedule(schedule, client, template, today)
      else
        {:error, reason} -> Repo.rollback(reason)
      end
    else
      :noop
    end
  end

  defp process_locked_schedule(_schedule, _today), do: :noop

  defp process_due_schedule(schedule, %Client{status: :active} = client, template, today) do
    now = DateTime.utc_now(:second)

    schedule.business_id
    |> FormAssignment.for_schedule(schedule.id)
    |> FormAssignment.open()
    |> Repo.update_all(set: [status: :missed, completed_at: nil, updated_at: now])

    attrs = %{purpose: :check_in, status: :assigned, due_date: schedule.next_due_on}

    case FormAssignment.insert_scheduled_changeset(
           schedule.business_id,
           client.id,
           template.id,
           schedule.id,
           attrs
         )
         |> Repo.insert() do
      {:ok, _assignment} ->
        advance_schedule(schedule, today)
        :generated

      {:error, changeset} ->
        Repo.rollback(changeset)
    end
  end

  defp process_due_schedule(schedule, _inactive_client, _template, today) do
    advance_schedule(schedule, today)
    :inactive
  end

  defp advance_schedule(schedule, today) do
    {next_due_on, active} = advance_beyond_today(schedule, today)

    case schedule |> CheckInSchedule.update_changeset(%{next_due_on: next_due_on, active: active}) |> Repo.update() do
      {:ok, updated} -> updated
      {:error, changeset} -> Repo.rollback(changeset)
    end
  end

  defp advance_beyond_today(%CheckInSchedule{frequency: :once} = schedule, _today),
    do: CheckInSchedule.advance(schedule)

  defp advance_beyond_today(schedule, today) do
    {next_due_on, active} = CheckInSchedule.advance(schedule)

    if Date.compare(next_due_on, today) == :gt do
      {next_due_on, active}
    else
      advance_beyond_today(%{schedule | next_due_on: next_due_on}, today)
    end
  end

  defp due_schedules(today) do
    CheckInSchedule
    |> CheckInSchedule.active()
    |> CheckInSchedule.due_on_or_before(today)
    |> select([schedule], schedule.id)
    |> Repo.all()
  end

  defp increment_count({generated, inactive}, 0), do: {generated + 1, inactive}
  defp increment_count({generated, inactive}, 1), do: {generated, inactive + 1}

  defp ensure_check_in_template(%FormTemplate{purpose: :check_in}), do: :ok
  defp ensure_check_in_template(_template), do: {:error, :invalid_check_in_template}

  defp get_check_in_schedule(business_id, schedule_id) do
    CheckInSchedule
    |> CheckInSchedule.for_business(business_id)
    |> Repo.get(schedule_id)
    |> ok_or_not_found()
  end

  defp reload_check_in_schedule(schedule) do
    CheckInSchedule
    |> CheckInSchedule.for_business(schedule.business_id)
    |> CheckInSchedule.include_template(schedule.business_id)
    |> Repo.get(schedule.id)
  end

  defp schedule_has_assignments?(business_id, schedule_id) do
    business_id
    |> FormAssignment.for_schedule(schedule_id)
    |> Repo.exists?()
  end

  defp ensure_schedule_unused(business_id, schedule_id) do
    if schedule_has_assignments?(business_id, schedule_id),
      do: {:error, :schedule_has_assignments},
      else: :ok
  end

  # Defensive against malformed stored templates: a non-list `questions` or a non-map question
  # is skipped rather than crashing the submission transaction (which would surface as a 500).
  # New templates can't reach here malformed — FormTemplate changesets validate structure.
  defp apply_profile_mappings!(ctx, client_id, sections, answers, submission) do
    sections |> List.wrap() |> Enum.each(&apply_section_mappings!(&1, ctx, client_id, answers, submission))
  end

  defp apply_section_mappings!(%{} = section, ctx, client_id, answers, submission) do
    section
    |> Map.get("questions", [])
    |> List.wrap()
    |> Enum.each(&apply_question_mapping!(&1, ctx, client_id, answers, submission))
  end

  defp apply_section_mappings!(_section, _ctx, _client_id, _answers, _submission), do: :ok

  defp apply_question_mapping!(%{} = question, ctx, client_id, answers, submission) do
    mapping = Map.get(question, "profile_mapping")
    answer = Map.get(answers, Map.get(question, "id"))

    if mapping && not is_nil(answer),
      do: apply_profile_mapping!(ctx, client_id, mapping, answer, submission)
  end

  defp apply_question_mapping!(_question, _ctx, _client_id, _answers, _submission), do: :ok

  defp apply_profile_mapping!(
         ctx,
         client_id,
         %{"kind" => "core", "section" => section, "field" => field},
         answer,
         _submission
       )
       when is_binary(field) and field != "" do
    with {:ok, section_key} <- core_profile_section(section),
         {:ok, profile} <- get_or_create_profile(ctx, client_id) do
      current = Map.get(profile, section_key) || %{}
      attrs = %{Atom.to_string(section_key) => Map.put(current, field, answer)}

      case update_profile(ctx, client_id, attrs) do
        {:ok, _profile} -> :ok
        {:error, reason} -> Repo.rollback(reason)
      end
    else
      {:error, reason} -> Repo.rollback(reason)
    end
  end

  defp apply_profile_mapping!(
         ctx,
         client_id,
         %{"kind" => "custom_field", "field_key" => field_key},
         answer,
         submission
       )
       when is_binary(field_key) and field_key != "" do
    case get_profile_field_by_key(ctx.business_id, field_key) do
      {:ok, field} ->
        actor = %{type: "client", id: client_id, submission_id: submission.id}

        case upsert_profile_field_value(ctx, client_id, field.id, answer, actor) do
          {:ok, _value} -> :ok
          {:error, reason} -> Repo.rollback(reason)
        end

      {:error, reason} ->
        Repo.rollback(reason)
    end
  end

  defp apply_profile_mapping!(_ctx, _client_id, _mapping, _answer, _submission) do
    Repo.rollback(invalid_profile_mapping_error())
  end

  defp core_profile_section("general"), do: {:ok, :general}
  defp core_profile_section("nutrition"), do: {:ok, :nutrition}
  defp core_profile_section("training"), do: {:ok, :training}
  defp core_profile_section("lifestyle"), do: {:ok, :lifestyle}
  defp core_profile_section(_), do: {:error, invalid_profile_mapping_error()}

  defp answers_from_attrs(%{answers: answers}) when is_map(answers), do: {:ok, answers}

  defp answers_from_attrs(%{answers: _answers}) do
    {:error, :invalid_answers}
  end

  defp answers_from_attrs(_attrs) do
    {:error, :answers_required}
  end

  defp ensure_assignment_submittable(%FormAssignment{status: status}) when status in [:assigned, :in_progress] do
    :ok
  end

  defp ensure_assignment_submittable(_assignment) do
    {:error, :assignment_not_submittable}
  end

  defp invalid_profile_mapping_error do
    :invalid_profile_mapping
  end

  defp get_client(%Ctx{} = ctx) do
    Client
    |> Client.for_business(ctx.business_id)
    |> Client.for_user(ctx.user_id)
    |> Repo.one()
    |> ok_or_not_found()
  end

  defp fetch_client(business_id, client_id) do
    Client
    |> Client.for_business(business_id)
    |> Repo.get(client_id)
    |> ok_or_not_found()
  end

  defp fetch_form_template(business_id, template_id) do
    FormTemplate
    |> FormTemplate.for_business(business_id)
    |> Repo.get(template_id)
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

  defp get_or_create_default_intake_template(%Ctx{} = ctx) do
    FormTemplate
    |> FormTemplate.for_business(ctx.business_id)
    |> where([t], t.purpose == :intake and t.status == :active)
    |> order_by([t], asc: t.inserted_at, asc: t.id)
    |> limit(1)
    |> Repo.one()
    |> case do
      nil ->
        create_form_template(ctx, %{
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
      nil ->
        attrs = %{
          "name" => "Weekly check-in",
          "purpose" => "check_in",
          "status" => "active",
          "sections" => DefaultCheckIn.sections(),
          "system_version" => DefaultCheckIn.system_version()
        }

        ctx.business_id
        |> FormTemplate.insert_system_changeset("weekly_check_in", attrs)
        |> Repo.insert(
          on_conflict: :nothing,
          conflict_target: {:unsafe_fragment, "(business_id, system_key) WHERE system_key IS NOT NULL"}
        )

        {:ok, default_check_in_template(ctx.business_id)}

      template ->
        evolve_default_check_in_template(template)
    end
  end

  defp evolve_default_check_in_template(%FormTemplate{system_version: version} = template)
       when is_integer(version) and version >= 2,
       do: {:ok, template}

  defp evolve_default_check_in_template(template) do
    sections = add_default_photo_question(template.sections)

    template
    |> FormTemplate.system_content_changeset(sections, DefaultCheckIn.system_version())
    |> Repo.update()
  end

  defp add_default_photo_question(sections) do
    photo_question =
      DefaultCheckIn.sections()
      |> Enum.flat_map(& &1["questions"])
      |> Enum.find(&(&1["id"] == "progress-photos"))

    if Enum.any?(sections, fn section ->
         Enum.any?(Map.get(section, "questions", []), &(&1["id"] == "progress-photos"))
       end) do
      sections
    else
      append_question_to_body(sections, photo_question)
    end
  end

  defp append_question_to_body(sections, question) do
    if Enum.any?(sections, &(&1["title"] == "Body")) do
      Enum.map(sections, fn
        %{"title" => "Body"} = section ->
          Map.update(section, "questions", [question], &(&1 ++ [question]))

        section ->
          section
      end)
    else
      [%{"title" => "Body", "questions" => [question]} | sections]
    end
  end

  defp default_check_in_template(business_id) do
    FormTemplate
    |> FormTemplate.for_business(business_id)
    |> FormTemplate.with_system_key("weekly_check_in")
    |> Repo.one()
  end

  defp get_form_assignment(business_id, assignment_id) do
    FormAssignment
    |> FormAssignment.for_business(business_id)
    |> include_form_template(business_id)
    |> Repo.get(assignment_id)
    |> ok_or_not_found()
  end

  defp get_form_submission(business_id, submission_id) do
    FormSubmission
    |> FormSubmission.for_business(business_id)
    |> Repo.get(submission_id)
    |> ok_or_not_found()
  end

  defp review_form_submission_once(%FormSubmission{reviewed_at: nil} = submission, user_id) do
    submission
    |> FormSubmission.review_changeset(user_id, DateTime.utc_now(:second))
    |> Repo.update()
  end

  defp review_form_submission_once(%FormSubmission{} = submission, _user_id), do: {:ok, submission}

  defp form_template_has_assignments?(business_id, template_id) do
    FormAssignment
    |> FormAssignment.for_business(business_id)
    |> where([a], a.form_template_id == ^template_id)
    |> Repo.exists?()
  end

  defp include_form_template(query, business_id) do
    query
    |> join(:inner, [a], t in FormTemplate, on: t.id == a.form_template_id and t.business_id == ^business_id)
    |> preload([_a, t], form_template: t)
  end

  defp include_submission_reviews(query, business_id) do
    submissions =
      FormSubmission
      |> FormSubmission.for_business(business_id)
      |> FormSubmission.newest()

    preload(query, form_submissions: ^submissions)
  end

  defp put_latest_submission_reviews(assignments), do: Enum.map(assignments, &put_latest_submission_review/1)

  defp put_latest_submission_review(nil), do: nil

  defp put_latest_submission_review(%FormAssignment{form_submissions: submissions} = assignment)
       when is_list(submissions) do
    %{assignment | latest_submission_reviewed_at: submissions |> List.first() |> submission_reviewed_at()}
  end

  defp put_latest_submission_review(%FormAssignment{} = assignment), do: assignment

  defp submission_reviewed_at(nil), do: nil
  defp submission_reviewed_at(submission), do: submission.reviewed_at

  defp safe_actor_atom(type) when is_atom(type), do: type
  defp safe_actor_atom("coach"), do: :coach
  defp safe_actor_atom("client"), do: :client
  defp safe_actor_atom("system"), do: :system
  defp safe_actor_atom(_), do: :system

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
