defmodule EasyWeb.TrainingControllerBoundaryTest do
  use ExUnit.Case, async: true

  @training_controllers [
    "lib/easy_web/controllers/coaches/training_plan_controller.ex",
    "lib/easy_web/controllers/clients/training_plan_controller.ex",
    "lib/easy_web/controllers/coaches/client_plan_controller.ex",
    "lib/easy_web/controllers/coaches/training_schedule_controller.ex",
    "lib/easy_web/controllers/coaches/workout_controller.ex",
    "lib/easy_web/controllers/coaches/workout_element_controller.ex",
    "lib/easy_web/controllers/coaches/workout_session_controller.ex",
    "lib/easy_web/controllers/clients/workout_session_controller.ex",
    "lib/easy_web/controllers/coaches/performed_set_controller.ex",
    "lib/easy_web/controllers/clients/performed_set_controller.ex",
    "lib/easy_web/controllers/coaches/exercise_controller.ex",
    "lib/easy_web/controllers/clients/exercise_controller.ex",
    "lib/easy_web/controllers/coaches/muscle_controller.ex",
    "lib/easy_web/controllers/coaches/equipment_controller.ex"
  ]

  @pure_training_controllers [
    "lib/easy_web/controllers/coaches/training_plan_controller.ex",
    "lib/easy_web/controllers/clients/training_plan_controller.ex",
    "lib/easy_web/controllers/coaches/training_schedule_controller.ex",
    "lib/easy_web/controllers/coaches/workout_controller.ex",
    "lib/easy_web/controllers/coaches/workout_element_controller.ex",
    "lib/easy_web/controllers/coaches/workout_session_controller.ex",
    "lib/easy_web/controllers/clients/workout_session_controller.ex",
    "lib/easy_web/controllers/coaches/performed_set_controller.ex",
    "lib/easy_web/controllers/clients/performed_set_controller.ex",
    "lib/easy_web/controllers/coaches/exercise_controller.ex",
    "lib/easy_web/controllers/clients/exercise_controller.ex"
  ]

  test "training controllers do not call Repo directly" do
    for path <- @training_controllers do
      source = File.read!(Path.join(File.cwd!(), path))

      refute source =~ "alias Easy.Repo", path
      refute source =~ ~r/\bRepo\./, path
    end
  end

  test "training controllers do not perform client or coach lookups" do
    for path <- @pure_training_controllers do
      source = File.read!(Path.join(File.cwd!(), path))

      refute source =~ "alias Easy.Clients", path
      refute source =~ "alias Easy.Coaches", path
      refute source =~ ~r/\bClient(Read|s)?\.\w+\(/, path
      refute source =~ ~r/\bCoaches\.\w+\(/, path
    end
  end
end
