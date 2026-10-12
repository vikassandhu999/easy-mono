defmodule EasyWeb.RecordCorrectionsContractTest do
  use Easy.ConnCase, async: true

  alias Easy.Clients.Client
  alias Easy.Repo
  alias Easy.Training.TrainingPerformedSet

  setup do
    client = insert(:client, timezone: "Etc/UTC")
    %{client: client, client_conn: authenticate_client(build_conn(), client)}
  end

  test "completed workout corrections and tombstones are visible in history and journal", f do
    session = json_response(post(f.client_conn, "/v1/client/training-sessions", %{}), 201)["data"]
    path = "/v1/client/training-sessions/#{session["id"]}"
    attrs = %{request_id: Ecto.UUID.generate(), exercise_name: "Squat", reps: 5, load_value: 20, load_unit: "kg"}
    set = json_response(post(f.client_conn, path <> "/performed-sets", attrs), 201)["data"]
    done = json_response(post(f.client_conn, path <> "/complete", %{}), 200)["data"]
    set_path = "/v1/client/training-performed-sets/#{set["id"]}"
    corrected = json_response(patch(f.client_conn, set_path, %{reps: 8, expected_revision: done["revision"]}), 200)["data"]
    assert corrected["reps"] == 8
    history = json_response(get(f.client_conn, path), 200)["data"]
    assert history["state"] == "completed"
    assert hd(history["performed_sets"])["reps"] == 8
    assert response(delete(f.client_conn, set_path <> "?expected_revision=#{history["revision"]}"), 204)
    assert json_response(get(f.client_conn, path), 200)["data"]["performed_sets"] == []
    assert %DateTime{} = Repo.get!(TrainingPerformedSet, set["id"]).deleted_at
    assert journal(set["id"]) == [["added", nil, 5], ["changed", 5, 8], ["removed", 8, nil]]

    assert Repo.query!("SELECT DISTINCT changed_by_type,changed_by_id FROM record_changes WHERE client_id=$1", [Ecto.UUID.dump!(f.client.id)]).rows == [
             ["client", Ecto.UUID.dump!(f.client.id)]
           ]
  end

  test "session and performed-set creation retries keep their ids and journal sequence", f do
    request = %{request_id: Ecto.UUID.generate()}
    session = json_response(post(f.client_conn, "/v1/client/training-sessions", request), 201)["data"]
    replay = json_response(post(f.client_conn, "/v1/client/training-sessions", request), 201)["data"]
    assert replay["id"] == session["id"]
    assert Repo.get!(Client, f.client.id).last_change_seq == 1
    attrs = %{request_id: Ecto.UUID.generate(), exercise_name: "Squat", reps: 5}
    path = "/v1/client/training-sessions/#{session["id"]}/performed-sets"
    set = json_response(post(f.client_conn, path, attrs), 201)["data"]
    assert json_response(post(f.client_conn, path, attrs), 201)["data"] == set
    assert Repo.get!(Client, f.client.id).last_change_seq == 2
    assert json_response(post(f.client_conn, path, %{attrs | reps: 6}), 409)["error_code"] == "conflict"
    assert journal(set["id"]) == [["added", nil, 5]]
  end

  defp journal(id), do: Repo.query!("SELECT action,old_value->'reps',new_value->'reps' FROM record_changes WHERE row_id=$1 ORDER BY seq", [Ecto.UUID.dump!(id)]).rows
end
