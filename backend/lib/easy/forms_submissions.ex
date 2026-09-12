defmodule Easy.Forms.Submissions do
  alias Easy.ClientAccess
  alias Easy.ClientAccount
  alias Easy.Ctx
  alias Easy.CursorPage
  alias Easy.FormAnswers
  alias Easy.Forms.FormAssignment
  alias Easy.Forms.FormSubmission
  alias Easy.Forms.Photos
  alias Easy.Repo
  alias Easy.WeightEntries

  @type submit_error ::
          :not_found | :assignment_not_submittable | FormAnswers.validation_error() | Ecto.Changeset.t()

  @spec submit_client_assignment(Ctx.t(), String.t(), map()) ::
          {:ok, FormSubmission.t()} | {:error, FormAnswers.parse_error() | submit_error()}
  def submit_client_assignment(%Ctx{} = ctx, assignment_id, attrs) do
    with {:ok, answers} <- FormAnswers.from_attrs(attrs),
         {:ok, client} <- ClientAccount.get_client_account(ctx),
         {:ok, assignment} <- get_client_assignment(ctx, assignment_id) do
      submit(ctx, client, assignment, answers)
    end
  end

  defp submit(ctx, client, assignment, answers) do
    with :ok <- ensure_assignment_submittable(assignment),
         :ok <- FormAnswers.validate(assignment.form_template.sections, answers),
         :ok <- Photos.validate(ctx, client.id, assignment.form_template.sections, answers) do
      submit_assignment_transaction(ctx, client, assignment, answers)
    end
  end

  @spec list(Ctx.t(), String.t()) ::
          {:ok, [FormSubmission.t()]} | {:error, :not_found}
  def list(%Ctx{} = ctx, assignment_id) do
    with {:ok, assignment} <- get_form_assignment(ctx.business_id, assignment_id),
         :ok <- ClientAccess.authorize_client_id(ctx, assignment.client_id) do
      submissions =
        FormSubmission
        |> FormSubmission.for_assignment(ctx.business_id, assignment_id)
        |> FormSubmission.newest()
        |> Repo.all()
        |> then(&Photos.attach_submissions(ctx, &1))

      {:ok, submissions}
    end
  end

  @spec get_for_client(Ctx.t(), String.t(), String.t()) ::
          {:ok, FormSubmission.t()} | {:error, :not_found}
  def get_for_client(%Ctx{} = ctx, client_id, submission_id) do
    with :ok <- ClientAccess.authorize_client_id(ctx, client_id) do
      FormSubmission
      |> FormSubmission.for_client(ctx.business_id, client_id)
      |> FormSubmission.include_form_assignment()
      |> Repo.get(submission_id)
      |> ok_or_not_found()
    end
  end

  @spec list_unreviewed_check_ins(Ctx.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), submissions: [FormSubmission.t()]}}
  def list_unreviewed_check_ins(%Ctx{} = ctx, opts \\ []) do
    base = FormSubmission.awaiting_check_in_review(ctx)

    submissions =
      base
      |> FormSubmission.include_review_context(ctx.business_id)
      |> FormSubmission.oldest()
      |> Easy.Utils.paginate(opts)
      |> Repo.all()
      |> then(&Photos.attach_submissions(ctx, &1))

    {:ok, %{count: Repo.aggregate(base, :count, :id), submissions: submissions}}
  end

  @spec review(Ctx.t(), String.t()) ::
          {:ok, FormSubmission.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def review(%Ctx{} = ctx, submission_id) do
    with {:ok, submission} <- get_form_submission(ctx.business_id, submission_id),
         :ok <- ClientAccess.authorize_client_id(ctx, submission.client_id),
         {:ok, reviewed} <- review_form_submission_once(submission, ctx.user_id) do
      {:ok, Photos.attach_submission(ctx, reviewed)}
    end
  end

  @spec list_check_in_submissions(Ctx.t(), keyword()) ::
          {:ok, CursorPage.t(FormSubmission.t())} | {:error, :invalid_cursor}
  def list_check_in_submissions(%Ctx{} = ctx, opts \\ []) do
    base =
      visible_check_ins(ctx)
      |> FormSubmission.for_review_client(Keyword.get(opts, :client_id))
      |> FormSubmission.for_reviewed(Keyword.get(opts, :reviewed))
      |> FormSubmission.for_review_search(Keyword.get(opts, :search))

    limit = CursorPage.limit(opts)

    with {:ok, query} <- CursorPage.query(base, Keyword.get(opts, :cursor) || "start", limit) do
      rows =
        query
        |> FormSubmission.include_review_context(ctx.business_id)
        |> Repo.all()
        |> then(&Photos.attach_submissions(ctx, &1))

      {:ok, CursorPage.finish(rows, limit, Repo.aggregate(base, :count, :id))}
    end
  end

  @spec get_check_in_submission(Ctx.t(), String.t()) :: {:ok, FormSubmission.t()} | {:error, :not_found}
  def get_check_in_submission(%Ctx{} = ctx, id) do
    result = ctx |> visible_check_ins() |> FormSubmission.include_review_context(ctx.business_id) |> Repo.get(id)

    with {:ok, submission} <- ok_or_not_found(result) do
      {:ok, Photos.attach_submission(ctx, submission)}
    end
  end

  defp visible_check_ins(ctx) do
    FormSubmission
    |> FormSubmission.for_business(ctx.business_id)
    |> FormSubmission.for_check_ins()
    |> FormSubmission.for_visible_clients(ctx)
  end

  defp submit_assignment_transaction(ctx, client, assignment, answers) do
    with {:ok, submission} <- Repo.transact(fn -> submit_assignment(ctx, client, assignment, answers) end) do
      {:ok, Photos.attach_submission(ctx, submission)}
    end
  end

  defp submit_assignment(ctx, client, assignment, answers) do
    template = assignment.form_template
    submitted_at = DateTime.utc_now(:second)

    attrs = %{
      "question_snapshot" => template.sections,
      "answers" => answers,
      "submitted_at" => submitted_at
    }

    with {:ok, submission} <- insert_submission(ctx.business_id, client.id, assignment.id, attrs),
         {:ok, _entries} <- WeightEntries.record_form_submission(ctx, client, submission),
         {:ok, _client} <- update_required_services_from_intake(ctx, client, assignment, submission),
         {:ok, _assignment} <- complete_assignment(assignment, submission),
         {:ok, :recorded} <- ClientAccount.record_client_activity(ctx, submitted_at) do
      {:ok, submission}
    end
  end

  defp insert_submission(business_id, client_id, assignment_id, attrs) do
    business_id
    |> FormSubmission.insert_changeset(client_id, assignment_id, :client, client_id, attrs)
    |> Repo.insert()
  end

  defp update_required_services_from_intake(ctx, client, %FormAssignment{purpose: :intake}, submission) do
    services = FormAnswers.required_services(submission.question_snapshot, submission.answers)
    ClientAccount.update_client_required_services(ctx, client, services)
  end

  defp update_required_services_from_intake(_ctx, client, _assignment, _submission), do: {:ok, client}

  defp complete_assignment(assignment, submission) do
    assignment |> FormAssignment.complete_changeset(submission.submitted_at) |> Repo.update()
  end

  defp ensure_assignment_submittable(assignment) do
    if FormAssignment.open?(assignment), do: :ok, else: {:error, :assignment_not_submittable}
  end

  defp get_form_assignment(business_id, assignment_id) do
    FormAssignment
    |> FormAssignment.for_business(business_id)
    |> Repo.get(assignment_id)
    |> ok_or_not_found()
  end

  defp get_client_assignment(ctx, assignment_id) do
    FormAssignment
    |> FormAssignment.for_client(ctx.business_id, ctx.client_id)
    |> FormAssignment.include_form_template(ctx.business_id)
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

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
