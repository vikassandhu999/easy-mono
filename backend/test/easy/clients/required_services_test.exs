defmodule Easy.Clients.RequiredServicesTest do
  use Easy.SchemaCase, async: false

  alias Easy.Clients
  alias Easy.Clients.Client

  describe "required-services writes" do
    test "Invite may omit or clear services and normalizes the closed set" do
      coach = insert(:coach)

      omitted = Client.invite_changeset(coach, params_for(:client_attrs))
      assert omitted.valid?
      assert Ecto.Changeset.get_field(omitted, :required_services) == []

      empty =
        Client.invite_changeset(
          coach,
          Map.put(params_for(:client_attrs), "required_services", [])
        )

      assert empty.valid?
      assert Ecto.Changeset.get_field(empty, :required_services) == []

      both =
        Client.invite_changeset(
          coach,
          Map.put(params_for(:client_attrs), "required_services", ["nutrition", "training"])
        )

      assert both.valid?
      assert Ecto.Changeset.get_change(both, :required_services) == [:training, :nutrition]
    end

    test "a supplied coach edit is non-empty and normalizes Training before Nutrition" do
      client = %Client{status: :active, required_services: [:training]}

      empty = Client.update_changeset(client, %{"required_services" => []})
      refute empty.valid?
      assert "must contain at least one service" in errors_on(empty).required_services

      both =
        Client.update_changeset(client, %{
          "required_services" => ["nutrition", "training"]
        })

      assert both.valid?
      assert Ecto.Changeset.get_change(both, :required_services) == [:training, :nutrition]

      empty_existing =
        Client.update_changeset(%Client{status: :active, required_services: []}, %{
          "required_services" => []
        })

      refute empty_existing.valid?
      assert "must contain at least one service" in errors_on(empty_existing).required_services
    end

    test "duplicate and unknown services are rejected" do
      client = %Client{status: :active, required_services: []}

      duplicate =
        Client.update_changeset(client, %{
          "required_services" => ["training", "training"]
        })

      unknown = Client.update_changeset(client, %{"required_services" => ["physio"]})

      refute duplicate.valid?
      refute unknown.valid?
      assert errors_on(duplicate).required_services != []
      assert errors_on(unknown).required_services != []
    end

    test "Invite and profile edits cannot set joined_at" do
      joined_at = DateTime.utc_now(:microsecond)
      coach = insert(:coach)

      invite =
        Client.invite_changeset(
          coach,
          Map.put(params_for(:client_attrs), "joined_at", joined_at)
        )

      update = Client.update_changeset(%Client{status: :active}, %{"joined_at" => joined_at})
      self_update = Client.self_update_changeset(%Client{}, %{"joined_at" => joined_at})

      refute Ecto.Changeset.get_change(invite, :joined_at)
      refute Ecto.Changeset.get_change(update, :joined_at)
      refute Ecto.Changeset.get_change(self_update, :joined_at)
    end

    test "the public Invite and coach-edit paths persist canonical services" do
      business = insert(:business)
      coach = insert(:coach, business: business, user: business.owner)
      ctx = owner_ctx(business)

      invite_attrs =
        :client_attrs
        |> params_for()
        |> Map.put("required_services", ["nutrition", "training"])

      assert {:ok, invited} = Clients.invite_client(ctx, invite_attrs)
      assert invited.required_services == [:training, :nutrition]

      assert {:ok, updated} =
               Clients.update_client(ctx, invited.id, %{
                 "required_services" => ["nutrition"]
               })

      assert updated.required_services == [:nutrition]
      assert Repo.reload(invited).required_services == [:nutrition]
      assert invited.assigned_coach_id == coach.id
    end
  end
end
