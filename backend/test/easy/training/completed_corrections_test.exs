defmodule Easy.Training.CompletedCorrectionsTest do
  use Easy.DataCase, async: true

  alias Easy.Chat
  alias Easy.ClientAccount
  alias Easy.Ctx
  alias Easy.Training.{Execution, PerformedSets}

  test "completed facts can be corrected with the current revision while identity and prescription remain frozen" do
    client = insert(:client)
    ctx = %Ctx{business_id: client.business_id, client_id: client.id, user_id: client.user_id}
    {:ok, started} = Execution.start_client_session(ctx, nil, %{})
    {:ok, set} = PerformedSets.create_client_performed_set(ctx, started.id, %{exercise_name: "Squat", reps: "8"})
    {:ok, completed} = Execution.complete_client_session(ctx, started.id, %{})
    assert {:ok, corrected} = PerformedSets.update_client_performed_set(ctx, set.id, %{expected_revision: completed.revision, reps: "10", exercise_name: "Front squat"})
    assert corrected.id == set.id
    assert corrected.reps == "10"
    assert corrected.exercise_name == "Front squat"
    assert {:ok, latest} = Execution.get_client_session(ctx, completed.id)
    assert latest.revision == completed.revision + 1
    assert latest.closed_at == completed.closed_at
    assert latest.date == completed.date
    assert latest.prescription_snapshot == completed.prescription_snapshot
    assert latest.state == :completed
    assert {:error, %Ecto.Changeset{action: :stale_revision}} = PerformedSets.update_client_performed_set(ctx, set.id, %{expected_revision: completed.revision, reps: "99"})
    assert {:ok, _} = PerformedSets.delete_client_performed_set(ctx, set.id, %{expected_revision: latest.revision})
    assert {:ok, %{performed_sets: []} = removed} = Execution.get_client_session(ctx, completed.id)
    assert {:ok, _} = PerformedSets.create_client_performed_set(ctx, completed.id, %{expected_revision: removed.revision, exercise_name: "Squat", reps: "12"})
  end

  test "a 4000-character note saves and publishes when the workout is completed" do
    client = insert(:client)
    ctx = %Ctx{business_id: client.business_id, client_id: client.id, user_id: client.user_id}
    note = String.duplicate("a", 4000)
    assert {:ok, started} = Execution.start_client_session(ctx, nil, %{})
    assert {:ok, saved} = Execution.update_client_session(ctx, started.id, %{notes: note})
    assert saved.notes == note
    assert saved.state == :active
    assert {:ok, %{messages: []}} = Chat.list_client_messages(ctx)

    assert {:ok, completed} = Execution.complete_client_session(ctx, started.id, %{})
    assert completed.notes == note
    assert completed.state == :completed
    assert {:ok, %{messages: [message]}} = Chat.list_client_messages(ctx)
    assert message.body == note
    assert message.embed_type == :training_session
    assert message.embed_id == completed.id
  end

  test "a 4001-character note is rejected on save and completion without losing the draft" do
    client = insert(:client)
    ctx = %Ctx{business_id: client.business_id, client_id: client.id, user_id: client.user_id}
    assert {:ok, started} = Execution.start_client_session(ctx, nil, %{notes: "Saved draft"})
    invalid = %{notes: String.duplicate("a", 4001)}

    assert {:error, save_error} = Execution.update_client_session(ctx, started.id, invalid)
    assert errors_on(save_error).notes == ["should be at most 4000 character(s)"]
    assert {:error, completion_error} = Execution.complete_client_session(ctx, started.id, invalid)
    assert errors_on(completion_error).notes == ["should be at most 4000 character(s)"]
    assert {:ok, unchanged} = Execution.get_client_session(ctx, started.id)
    assert unchanged.state == :active
    assert unchanged.notes == "Saved draft"
    assert unchanged.revision == started.revision
    assert unchanged.closed_at == nil
    assert {:ok, %{messages: []}} = Chat.list_client_messages(ctx)
  end

  test "a late workout date is editable before and after sharing without changing its publication time" do
    client = insert(:client)
    ctx = %Ctx{business_id: client.business_id, client_id: client.id, user_id: client.user_id}
    {:ok, %{local_date: today}} = ClientAccount.get_client_calendar(ctx)
    occurred_on = Date.add(today, -3)
    {:ok, started} = Execution.start_client_session(ctx, nil, %{})
    assert {:ok, saved} = Execution.update_client_session(ctx, started.id, %{date: occurred_on})
    assert saved.date == occurred_on
    assert saved.started_at == started.started_at
    assert saved.closed_at == nil
    assert {:ok, completed} = Execution.complete_client_session(ctx, started.id, %{date: Date.add(today, -4)})
    assert completed.date == Date.add(today, -4)
    assert {:ok, corrected} = Execution.update_client_session(ctx, started.id, %{expected_revision: completed.revision, date: occurred_on})
    assert corrected.date == occurred_on
    assert corrected.closed_at == completed.closed_at
    assert corrected.started_at == started.started_at
    assert corrected.prescription_snapshot == started.prescription_snapshot
    assert {:ok, recorded} = Execution.get_client_session(ctx, completed.id)
    assert recorded.date == occurred_on
    assert recorded.closed_at == completed.closed_at
    assert {:error, %Ecto.Changeset{action: :stale_revision}} = Execution.update_client_session(ctx, started.id, %{expected_revision: completed.revision, date: today})
  end

  test "workout occurrence dates reject future client-local days, malformed input, and clearing" do
    client = insert(:client, timezone: "Pacific/Kiritimati")
    ctx = %Ctx{business_id: client.business_id, client_id: client.id, user_id: client.user_id}
    {:ok, %{local_date: today}} = ClientAccount.get_client_calendar(ctx)
    {:ok, started} = Execution.start_client_session(ctx, nil, %{})
    assert {:ok, _} = Execution.update_client_session(ctx, started.id, %{date: Date.add(today, -1)})
    assert {:ok, current} = Execution.update_client_session(ctx, started.id, %{date: today})
    assert current.date == today

    for date <- [Date.add(today, 1), "not-a-date", nil] do
      assert {:error, %Ecto.Changeset{} = error} = Execution.update_client_session(ctx, started.id, %{date: date})
      assert errors_on(error).date
      assert {:error, %Ecto.Changeset{}} = Execution.complete_client_session(ctx, started.id, %{date: date})
      assert {:ok, unchanged} = Execution.get_client_session(ctx, started.id)
      assert unchanged.date == today
      assert unchanged.revision == current.revision
      assert unchanged.state == :active
    end
  end

  test "a resubmitted date is checked against the client's current local day after a timezone change" do
    client = insert(:client, timezone: "Pacific/Kiritimati")
    ctx = %Ctx{business_id: client.business_id, client_id: client.id, user_id: client.user_id}
    {:ok, started} = Execution.start_client_session(ctx, nil, %{})
    Repo.update!(change(client, timezone: "Pacific/Honolulu"))
    assert {:error, %Ecto.Changeset{} = error} = Execution.update_client_session(ctx, started.id, %{date: started.date})
    assert errors_on(error).date == ["cannot be in the future"]
  end
end
