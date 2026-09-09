defmodule Easy.Forms.CheckInInputTest do
  use Easy.DataCase, async: true

  alias Easy.CheckIns
  alias Easy.Forms.CheckInSchedule

  setup do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
    %{coach: coach, client: client, ctx: trainer_ctx(coach)}
  end

  test "creation accepts both key formats and stamps trusted identities", %{coach: coach, client: client, ctx: ctx} do
    for key_format <- [:atoms, :strings] do
      template = insert(:form_template, business: coach.business, purpose: :check_in)

      attrs = %{
        form_template_id: template.id,
        frequency: :weekly,
        active: false,
        next_due_on: Date.add(Date.utc_today(), 7),
        business_id: Ecto.UUID.generate(),
        client_id: Ecto.UUID.generate()
      }

      attrs = if key_format == :strings, do: Jason.decode!(Jason.encode!(attrs)), else: attrs
      assert {:ok, schedule} = CheckIns.create_check_in_schedule_for_client(ctx, client.id, attrs)
      assert schedule.business_id == ctx.business_id
      assert schedule.client_id == client.id
      assert schedule.form_template_id == template.id
      assert schedule.active
    end
  end

  test "invalid references return errors and foreign templates remain inaccessible", %{client: client, ctx: ctx} do
    for attrs <- [%{}, %{form_template_id: nil}, %{"form_template_id" => "invalid"}] do
      assert {:error, %Ecto.Changeset{} = changeset} =
               CheckIns.create_check_in_schedule_for_client(ctx, client.id, attrs)

      assert Map.has_key?(errors_on(changeset), :form_template_id)
    end

    foreign_template = insert(:form_template, purpose: :check_in)

    assert {:error, :not_found} =
             CheckIns.create_check_in_schedule_for_client(ctx, client.id, %{
               form_template_id: foreign_template.id,
               frequency: :weekly,
               next_due_on: Date.add(Date.utc_today(), 7)
             })

    assert Repo.aggregate(CheckInSchedule.for_business(ctx.business_id), :count) == 0
  end
end
