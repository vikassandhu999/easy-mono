defmodule Easy.DefaultCheckInTest do
  use ExUnit.Case, async: true

  alias Easy.DefaultCheckIn

  test "adds Body when absent and preserves other sections" do
    custom = %{"title" => "Coach notes", "questions" => []}
    assert [body, ^custom] = DefaultCheckIn.upgrade_sections([custom])
    assert body["title"] == "Body"
    assert [%{"id" => "progress-photos", "type" => "photo"}] = body["questions"]
    assert DefaultCheckIn.upgrade_sections([body, custom]) == [body, custom]
  end

  test "preserves an existing photo question even outside Body" do
    sections = [
      %{"title" => "Body", "questions" => []},
      %{"title" => "Custom", "questions" => [%{"id" => "progress-photos", "label" => "Custom photos"}]}
    ]

    assert DefaultCheckIn.upgrade_sections(sections) == sections
  end
end
