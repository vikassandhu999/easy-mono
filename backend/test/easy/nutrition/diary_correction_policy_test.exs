defmodule Easy.Nutrition.Diary.CorrectionPolicyTest do
  use ExUnit.Case, async: true
  alias Easy.Clients.Client
  alias Easy.Nutrition.Diary.CorrectionPolicy
  alias Easy.Orgs.Business
  @today ~D[2026-08-26]
  test "past recorded facts remain correctable without a time cutoff" do
    assert CorrectionPolicy.write_eligible?(@today, @today)
    assert CorrectionPolicy.write_eligible?(Date.add(@today, -7), @today)
    assert CorrectionPolicy.write_eligible?(Date.add(@today, -365), @today)
    refute CorrectionPolicy.write_eligible?(Date.add(@today, 1), @today)
    assert :ok = CorrectionPolicy.validate_write(Date.add(@today, -7), @today)

    assert :ok = CorrectionPolicy.validate_write(Date.add(@today, -365), @today)

    assert {:error, :future_date} = CorrectionPolicy.validate_write(Date.add(@today, 1), @today)
  end

  test "switching remains restricted to the current local date" do
    assert :ok = CorrectionPolicy.validate_switch(@today, @today)

    assert {:error, :cannot_switch_past_slot} =
             CorrectionPolicy.validate_switch(Date.add(@today, -1), @today)

    assert {:error, :future_date} = CorrectionPolicy.validate_switch(Date.add(@today, 1), @today)
  end

  test "client timezone wins with Business fallback and local today is calculated from an explicit instant" do
    now = ~U[2026-08-25 18:45:00Z]
    business = %Business{timezone: "Pacific/Kiritimati"}

    assert Client.applied_timezone(%Client{timezone: "UTC", business: business}) ==
             "UTC"

    assert Client.applied_timezone(%Client{timezone: "", business: business}) ==
             "Pacific/Kiritimati"

    assert CorrectionPolicy.local_today("Asia/Kolkata", now) == @today
  end
end
