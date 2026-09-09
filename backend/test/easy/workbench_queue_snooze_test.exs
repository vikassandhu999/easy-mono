defmodule Easy.Workbench.QueueSnoozeTest do
  use Easy.SchemaCase

  alias Easy.Workbench
  alias Easy.Workbench.QueueSnooze

  test "snooze writes reject hidden and foreign clients without inserting rows" do
    trainer = insert(:coach)
    assigned = insert(:coach, business: trainer.business)
    hidden = insert(:client, business: trainer.business, creator: assigned, assigned_coach: assigned)
    foreign = insert(:client)
    attrs = %{queue: :quiet, snoozed_until: Date.add(Date.utc_today(), 1)}

    for client_id <- [hidden.id, foreign.id, Ecto.UUID.generate()] do
      assert {:error, :not_found} = Workbench.snooze_queue_for_client(trainer_ctx(trainer), client_id, attrs)
    end

    refute Repo.exists?(QueueSnooze)
    assert {:ok, snooze} = Workbench.snooze_queue_for_client(owner_ctx(trainer.business), hidden.id, attrs)
    assert snooze.client_id == hidden.id
    assert snooze.business_id == trainer.business_id
  end

  test "trusted identities override request fields" do
    client = insert(:client)
    today = Date.utc_today()

    assert {:ok, snooze} =
             client.business_id
             |> QueueSnooze.insert_changeset(client.id, %{
               "business_id" => Ecto.UUID.generate(),
               "client_id" => Ecto.UUID.generate(),
               "queue" => "quiet",
               "snoozed_until" => Date.to_iso8601(today)
             })
             |> Repo.insert()

    assert snooze.business_id == client.business_id
    assert snooze.client_id == client.id
    assert snooze.queue == :quiet
    assert snooze.snoozed_until == today
  end

  test "missing identities and editable fields return required errors" do
    assert {:error, changeset} = nil |> QueueSnooze.insert_changeset(nil, %{}) |> Repo.insert()

    for field <- [:business_id, :client_id, :queue, :snoozed_until] do
      assert errors_on(changeset)[field] == ["can't be blank"]
    end
  end

  test "missing references return changeset errors" do
    client = insert(:client)
    attrs = %{queue: :expiring, snoozed_until: Date.utc_today()}

    for {business_id, client_id, field} <- [
          {Ecto.UUID.generate(), client.id, :business_id},
          {client.business_id, Ecto.UUID.generate(), :client_id}
        ] do
      assert {:error, changeset} = business_id |> QueueSnooze.insert_changeset(client_id, attrs) |> Repo.insert()
      assert errors_on(changeset)[field] == ["does not exist"]
    end
  end
end
