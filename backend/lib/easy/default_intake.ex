defmodule Easy.DefaultIntake do
  @sections [
    %{
      "title" => "About you & goals",
      "questions" => [
        %{
          "id" => "primary-goal",
          "label" => "What's your primary goal?",
          "type" => "select",
          "required" => true,
          "options" => ["Lose weight", "Build muscle", "Get fitter", "Sport performance"]
        },
        %{
          "id" => "success-3-months",
          "label" => "What does success look like in 3 months?",
          "type" => "text",
          "required" => true
        },
        %{
          "id" => "target-weight",
          "label" => "Target weight (kg)",
          "type" => "number",
          "required" => false
        }
      ]
    },
    %{
      "title" => "Training",
      "questions" => [
        %{
          "id" => "experience",
          "label" => "How long have you been training?",
          "type" => "select",
          "required" => true,
          "options" => ["I'm new", "Less than a year", "1–3 years", "3+ years"]
        },
        %{
          "id" => "days-per-week",
          "label" => "How many days a week can you train?",
          "type" => "select",
          "required" => true,
          "options" => ["2", "3", "4", "5", "6"]
        },
        %{
          "id" => "equipment",
          "label" => "What equipment do you have access to?",
          "type" => "select",
          "required" => true,
          "options" => ["Full gym", "Home basics (dumbbells, bands)", "Bodyweight only"]
        },
        %{
          "id" => "injuries",
          "label" => "Any injuries or movements to avoid?",
          "type" => "text",
          "required" => false
        }
      ]
    },
    %{
      "title" => "Nutrition",
      "questions" => [
        %{
          "id" => "dietary-preference",
          "label" => "Dietary preference",
          "type" => "select",
          "required" => true,
          "options" => ["No restrictions", "Vegetarian", "Eggetarian", "Vegan", "Other"]
        },
        %{
          "id" => "allergies",
          "label" => "Any food allergies or intolerances?",
          "type" => "text",
          "required" => false
        },
        %{
          "id" => "meals-per-day",
          "label" => "How many meals do you eat a day?",
          "type" => "select",
          "required" => true,
          "options" => ["2", "3", "4", "5+"]
        },
        %{
          "id" => "typical-day",
          "label" => "Walk us through what you eat on a normal day",
          "type" => "text",
          "required" => true
        }
      ]
    },
    %{
      "title" => "Lifestyle",
      "questions" => [
        %{
          "id" => "daily-activity",
          "label" => "How active is your day-to-day?",
          "type" => "select",
          "required" => true,
          "options" => ["Desk job", "On my feet part of the day", "Physically demanding"]
        },
        %{
          "id" => "sleep",
          "label" => "How much do you sleep on average?",
          "type" => "select",
          "required" => true,
          "options" => ["Under 6 hours", "6–7 hours", "7–8 hours", "8+ hours"]
        },
        %{
          "id" => "stress",
          "label" => "Stress levels lately?",
          "type" => "select",
          "required" => true,
          "options" => ["Low", "Moderate", "High"]
        },
        %{
          "id" => "anything-else",
          "label" => "Anything else your coach should know?",
          "type" => "text",
          "required" => false
        }
      ]
    }
  ]

  @spec sections() :: [map()]
  def sections, do: @sections
end
