defmodule Easy.Training.TrainingSetRequestTest do
  use Easy.DataCase, async: true

  alias Easy.Ctx
  alias Easy.Training.{Execution, PerformedSets, TrainingSetRequest}

  setup do
    client = insert(:client)
    ctx = %Ctx{business_id: client.business_id, user_id: client.user_id, client_id: client.id}
    {:ok, session} = Execution.start_client_session(ctx, nil, %{})
    attrs = %{request_id: Ecto.UUID.generate(), exercise_name: "Sprint"}
    {:ok, set} = PerformedSets.create_client_performed_set(ctx, session.id, attrs)
    {:ok, identity} = TrainingSetRequest.identity(attrs)
    %{ctx: ctx, client: client, session: session, set: set, identity: identity}
  end

  test "the database rejects a duplicate request identity", ctx do
    assert {:error, changeset} = ctx.set |> TrainingSetRequest.insert_changeset(ctx.identity) |> Repo.insert()
    assert errors_on(changeset).request_id == ["has already been taken"]
  end

  test "the database rejects a request pointing at another session's set", ctx do
    {:ok, _} = Execution.complete_client_session(ctx.ctx, ctx.session.id, %{})
    {:ok, next} = Execution.start_client_session(ctx.ctx, nil, %{})

    assert {:error, changeset} =
             ctx.set
             |> TrainingSetRequest.insert_changeset(ctx.identity)
             |> put_change(:training_session_id, next.id)
             |> Repo.insert()

    assert errors_on(changeset).performed_set_id == ["does not exist"]
  end

  test "the database rejects a request pointing at another business's set", ctx do
    client = insert(:client)
    actor = %Ctx{business_id: client.business_id, user_id: client.user_id, client_id: client.id}
    {:ok, session} = Execution.start_client_session(actor, nil, %{})

    assert {:error, changeset} =
             ctx.set
             |> TrainingSetRequest.insert_changeset(ctx.identity)
             |> put_change(:business_id, client.business_id)
             |> put_change(:training_session_id, session.id)
             |> Repo.insert()

    assert errors_on(changeset).performed_set_id == ["does not exist"]
  end
end
