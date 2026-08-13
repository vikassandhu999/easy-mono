defmodule Easy.WorkbenchPersistenceTest do
  use Easy.SchemaCase

  alias Easy.Chat.Conversation
  alias Easy.Clients.Client

  describe "client workbench facts" do
    test "uses canonical required services and a microsecond join timestamp" do
      assert %Client{}.required_services == []

      changeset =
        Ecto.Changeset.cast(
          %Client{},
          %{
            "joined_at" => "2026-08-13T09:30:00.123456Z",
            "required_services" => ["training", "nutrition"]
          },
          [:joined_at, :required_services]
        )

      assert changeset.valid?
      assert Ecto.Changeset.get_change(changeset, :joined_at) == ~U[2026-08-13 09:30:00.123456Z]
      assert Ecto.Changeset.get_change(changeset, :required_services) == [:training, :nutrition]
    end
  end

  describe "conversation workbench facts" do
    test "uses a microsecond waiting timestamp" do
      changeset =
        Ecto.Changeset.cast(
          %Conversation{},
          %{"waiting_since" => "2026-08-13T09:30:00.654321Z"},
          [:waiting_since]
        )

      assert changeset.valid?
      assert Ecto.Changeset.get_change(changeset, :waiting_since) == ~U[2026-08-13 09:30:00.654321Z]
    end
  end

  describe "stored workbench facts" do
    test "round-trips defaults and microsecond timestamps" do
      joined_at = ~U[2026-08-13 09:30:00.123456Z]
      waiting_since = ~U[2026-08-13 10:45:00.654321Z]

      default_client = insert(:client)

      classified_client =
        insert(:client,
          joined_at: joined_at,
          required_services: [:training, :nutrition]
        )

      default_conversation = insert(:conversation)
      conversation = insert(:conversation, waiting_since: waiting_since)

      assert Repo.reload(default_client).required_services == []
      assert Repo.reload(default_client).joined_at == nil
      assert Repo.reload(classified_client).required_services == [:training, :nutrition]
      assert Repo.reload(classified_client).joined_at == joined_at
      assert Repo.reload(default_conversation).waiting_since == nil
      assert Repo.reload(conversation).waiting_since == waiting_since
    end

    test "accepts exactly the canonical required-service sets" do
      for services <- [[], [:training], [:nutrition], [:training, :nutrition]] do
        client = insert(:client, required_services: services)
        assert Repo.reload(client).required_services == services
      end
    end

    test "rejects noncanonical required-service ordering" do
      client = insert(:client)

      assert {:error, %Postgrex.Error{postgres: %{code: :check_violation}}} =
               Repo.query(
                 "UPDATE clients SET required_services = $1::varchar[] WHERE id = $2",
                 [["nutrition", "training"], Ecto.UUID.dump!(client.id)]
               )
    end

    test "rejects duplicate required services" do
      client = insert(:client)

      assert {:error, %Postgrex.Error{postgres: %{code: :check_violation}}} =
               Repo.query(
                 "UPDATE clients SET required_services = $1::varchar[] WHERE id = $2",
                 [["training", "training"], Ecto.UUID.dump!(client.id)]
               )
    end

    test "rejects unknown required services" do
      client = insert(:client)

      assert {:error, %Postgrex.Error{postgres: %{code: :check_violation}}} =
               Repo.query(
                 "UPDATE clients SET required_services = $1::varchar[] WHERE id = $2",
                 [["physiotherapy"], Ecto.UUID.dump!(client.id)]
               )
    end

    test "rejects a null required-services set" do
      client = insert(:client)

      assert {:error, %Postgrex.Error{postgres: %{code: :not_null_violation}}} =
               Repo.query(
                 "UPDATE clients SET required_services = NULL WHERE id = $1",
                 [Ecto.UUID.dump!(client.id)]
               )
    end
  end

  describe "workbench indexes" do
    test "use tenant-leading columns and partial predicates" do
      names = [
        "clients_active_subscription_ends_on_index",
        "clients_business_id_assigned_coach_id_index",
        "conversations_waiting_since_index",
        "nutrition_plans_active_client_coverage_index",
        "training_plans_active_client_coverage_index"
      ]

      definitions =
        Repo.query!(
          """
          SELECT indexname, indexdef
          FROM pg_indexes
          WHERE schemaname = current_schema()
            AND indexname = ANY($1::text[])
          """,
          [names]
        ).rows
        |> Map.new(fn [name, definition] -> {name, String.downcase(definition)} end)

      assert definitions |> Map.keys() |> Enum.sort() == names

      assert_index(
        definitions,
        "conversations_waiting_since_index",
        "(business_id, waiting_since, id)",
        ["waiting_since is not null"]
      )

      for name <- [
            "nutrition_plans_active_client_coverage_index",
            "training_plans_active_client_coverage_index"
          ] do
        assert_index(
          definitions,
          name,
          "(business_id, client_id, start_date, end_date)",
          ["status", "active", "client_id is not null"]
        )
      end

      assert_index(
        definitions,
        "clients_active_subscription_ends_on_index",
        "(business_id, subscription_ends_on, id)",
        ["status", "active", "subscription_ends_on is not null"]
      )

      assert definitions["clients_business_id_assigned_coach_id_index"] =~
               "(business_id, assigned_coach_id)"
    end
  end

  describe "workbench database definitions" do
    test "set the intended nullability, defaults, precision, and named constraint" do
      columns =
        Repo.query!("""
        SELECT table_name, column_name, is_nullable, column_default, datetime_precision
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND (table_name, column_name) IN (
            ('clients', 'joined_at'),
            ('clients', 'required_services'),
            ('conversations', 'waiting_since')
          )
        """).rows
        |> Map.new(fn [table, column, nullable, default, precision] ->
          {{table, column}, %{default: default, nullable: nullable, precision: precision}}
        end)

      assert columns[{"clients", "joined_at"}] == %{default: nil, nullable: "YES", precision: 6}

      assert %{
               default: required_services_default,
               nullable: "NO",
               precision: nil
             } = columns[{"clients", "required_services"}]

      assert required_services_default == "ARRAY[]::character varying[]"
      assert columns[{"conversations", "waiting_since"}] == %{default: nil, nullable: "YES", precision: 6}

      assert [[constraint]] =
               Repo.query!("""
               SELECT pg_get_constraintdef(oid)
               FROM pg_constraint
               WHERE conname = 'clients_required_services_check'
               """).rows

      for value <- ["training", "nutrition"] do
        assert constraint =~ value
      end
    end
  end

  defp assert_index(definitions, name, columns, predicate_parts) do
    definition = Map.fetch!(definitions, name)
    assert definition =~ columns

    for part <- predicate_parts do
      assert definition =~ part
    end
  end
end
