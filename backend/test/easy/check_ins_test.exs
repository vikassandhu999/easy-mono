defmodule Easy.CheckInsTest do
  use Easy.DataCase, async: true

  alias Easy.CheckIns
  alias Easy.Forms.CheckInSchedule
  alias Easy.Forms.FormAssignment

  test "deleting a used schedule preserves its assignment history" do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
    template = insert(:form_template, business: coach.business, purpose: :check_in)
    ctx = trainer_ctx(coach)

    assert {:ok, schedule} =
             CheckIns.create_check_in_schedule_for_client(ctx, client.id, %{
               form_template_id: template.id,
               frequency: :once,
               next_due_on: Date.utc_today()
             })

    before = Repo.get!(CheckInSchedule, schedule.id)
    assert [assignment] = Repo.all(FormAssignment.for_schedule(coach.business_id, schedule.id))
    refute before.active
    assert {:error, :schedule_has_assignments} = CheckIns.delete_check_in_schedule(ctx, schedule.id)
    assert Repo.get!(CheckInSchedule, schedule.id) == before
    assert Repo.get!(FormAssignment, assignment.id) == assignment
  end

  test "schedule operations conceal hidden clients and foreign tenants without changing schedules" do
    coach = insert(:coach)
    colleague = insert(:coach, business: coach.business)
    outsider = insert(:coach)
    client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
    template = insert(:form_template, business: coach.business, purpose: :check_in)
    attrs = %{form_template_id: template.id, frequency: :weekly, next_due_on: Date.add(Date.utc_today(), 7)}

    assert {:ok, schedule} = CheckIns.create_check_in_schedule_for_client(trainer_ctx(coach), client.id, attrs)
    before = Repo.get!(CheckInSchedule, schedule.id)

    for ctx <- [trainer_ctx(colleague), trainer_ctx(outsider)] do
      assert {:error, :not_found} = CheckIns.list_check_in_schedules_for_client(ctx, client.id)
      assert {:error, :not_found} = CheckIns.create_check_in_schedule_for_client(ctx, client.id, attrs)
      assert {:error, :not_found} = CheckIns.update_check_in_schedule(ctx, schedule.id, %{active: false})
      assert {:error, :not_found} = CheckIns.delete_check_in_schedule(ctx, schedule.id)
      assert Repo.get!(CheckInSchedule, schedule.id) == before
      assert [^before] = Repo.all(CheckInSchedule.for_client(coach.business_id, client.id))
    end

    assert {:ok, [visible]} = CheckIns.list_check_in_schedules_for_client(owner_ctx(coach.business), client.id)
    assert visible.id == schedule.id
    assert visible.form_template.id == template.id
  end
end
