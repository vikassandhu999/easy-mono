defmodule Easy.CoachingAccessTest do
  use Easy.DataCase, async: true

  alias Easy.{Chat, ClientAccount, Ctx}
  alias Easy.CoachingTerms.CoachingTerm
  alias Easy.Nutrition.PlanReader
  alias Easy.Training.Execution
  alias Easy.Training.PlanReader, as: TrainingReader

  test "ended coaching retains workout and message history" do
    client = insert(:client)
    ctx = %Ctx{business_id: client.business_id, user_id: client.user_id, client_id: client.id}
    assert {:ok, session} = Execution.start_client_session(ctx, nil, %{})
    assert {:ok, message} = Chat.send_client_message(ctx, %{body: "Saved history"})

    Repo.update_all(from(t in CoachingTerm, where: t.client_id == ^client.id), set: [ends_on: Date.add(Date.utc_today(), -1)])

    assert {:ok, %{id: id}} = ClientAccount.get_accepted_client(ctx)
    assert id == client.id
    assert {:ok, %{sessions: [%{id: session_id}]}} = Execution.list_client_sessions(ctx)
    assert session_id == session.id
    assert {:ok, %{messages: [%{id: message_id, body: "Saved history"}]}} = Chat.list_client_messages(ctx)
    assert message_id == message.id
  end

  test "coverage waits for a term, ends with coaching, and a returning client can receive a new plan" do
    client = insert(:client, terms: [])
    coach_ctx = Ctx.new(client.business_id, client.coach.user_id, client.coach_id, false)
    ctx = %Ctx{business_id: client.business_id, user_id: client.user_id, client_id: client.id}
    today = Date.utc_today()
    start_date = Date.add(today, -14)
    created_at = DateTime.new!(start_date, ~T[00:00:00], "Etc/UTC")
    attrs = [client: client, business: client.business, start_date: start_date, inserted_at: created_at]
    training = insert(:training_plan, attrs)
    nutrition = insert(:plan, attrs)
    assert {:ok, nil} = TrainingReader.resolve_client_coverage(ctx, today)
    assert {:ok, nil} = PlanReader.resolve_client_coverage(ctx, today)

    term = insert(:coaching_term, client_id: client.id, starts_on: start_date)
    assert {:ok, %{plan: %{id: training_id}}} = TrainingReader.resolve_client_coverage(ctx, today)
    assert training_id == training.id
    assert {:ok, %{plan: %{id: nutrition_id}}} = PlanReader.resolve_client_coverage(ctx, today)
    assert nutrition_id == nutrition.id

    Repo.update!(change(term, ends_on: Date.add(today, -1)))
    insert(:coaching_term, client_id: client.id, starts_on: today)
    assert {:ok, nil} = TrainingReader.resolve_client_coverage(ctx, today)
    assert {:ok, nil} = PlanReader.resolve_client_coverage(ctx, today)
    assert {:ok, %{lifecycle: :ended}} = TrainingReader.get_plan(coach_ctx, training.id)
    assert {:ok, %{lifecycle: :ended}} = PlanReader.get_plan(coach_ctx, nutrition.id)

    training_template = insert(:training_plan, business: client.business)
    nutrition_template = insert(:plan, business: client.business)
    assert {:ok, new_training} = Easy.Training.Programming.assign_template_to_client(coach_ctx, client.id, training_template.id, %{start_date: today})
    assert {:ok, new_nutrition} = Easy.Nutrition.Programming.assign_template_to_client(coach_ctx, client.id, nutrition_template.id, %{start_date: today})
    assert new_training.lifecycle == :current
    assert new_nutrition.lifecycle == :current
    assert Repo.get!(Easy.Training.TrainingPlan, training.id).end_date == nil
    assert Repo.get!(Easy.Nutrition.Plan, nutrition.id).end_date == nil
  end
end
