defmodule Easy.Repo.TrainingSeeds do
  alias Easy.Repo
  alias Easy.Training.Library.{MuscleGroup, Muscle, Equipment}
  import Ecto.Query

  def run do
    seed_muscle_groups_and_muscles()
    seed_equipment()
  end

  defp seed_muscle_groups_and_muscles do
    data = [
      {"Chest", "Pectoral muscles", [
        {"Pectoralis Major", "Large chest muscle"},
        {"Pectoralis Minor", "Small chest muscle under the major"},
        {"Serratus Anterior", "Muscle on the side of the chest"}
      ]},
      {"Back", "Muscles of the back", [
        {"Latissimus Dorsi", "Large back muscle (lats)"},
        {"Trapezius", "Upper back and neck muscle (traps)"},
        {"Rhomboids", "Middle back muscles"},
        {"Erector Spinae", "Lower back muscles"},
        {"Teres Major", "Muscle above the lats"}
      ]},
      {"Shoulders", "Deltoid muscles", [
        {"Anterior Deltoid", "Front shoulder"},
        {"Lateral Deltoid", "Side shoulder"},
        {"Posterior Deltoid", "Rear shoulder"},
        {"Rotator Cuff", "Stabilizing shoulder muscles"}
      ]},
      {"Arms", "Biceps and Triceps", [
        {"Biceps Brachii", "Front of upper arm"},
        {"Brachialis", "Muscle under the biceps"},
        {"Triceps Brachii", "Back of upper arm"},
        {"Forearms", "Lower arm muscles"}
      ]},
      {"Legs", "Lower body muscles", [
        {"Quadriceps", "Front thigh muscles"},
        {"Hamstrings", "Back thigh muscles"},
        {"Gluteus Maximus", "Main buttock muscle"},
        {"Gluteus Medius", "Side hip muscle"},
        {"Calves", "Lower leg muscles (Gastrocnemius & Soleus)"},
        {"Adductors", "Inner thigh muscles"},
        {"Abductors", "Outer hip muscles"}
      ]},
      {"Core", "Abdominal and lower back muscles", [
        {"Rectus Abdominis", "Six-pack muscle"},
        {"Obliques", "Side abdominal muscles"},
        {"Transverse Abdominis", "Deep core muscle"}
      ]},
      {"Full Body", "Compound movements involving multiple groups", []}
    ]

    for {group_name, group_desc, muscles} <- data do
      # Create or get Muscle Group
      group =
        case Repo.get_by(MuscleGroup, name: group_name) do
          nil ->
            Repo.insert!(%MuscleGroup{
              name: group_name,
              description: group_desc
            })
          existing ->
            existing
        end

      # Create Muscles
      for {muscle_name, muscle_desc} <- muscles do
        case Repo.get_by(Muscle, name: muscle_name) do
          nil ->
            Repo.insert!(%Muscle{
              name: muscle_name,
              description: muscle_desc,
              muscle_group_id: group.id
            })
          _ ->
            :ok
        end
      end
    end

    IO.puts("✓ Seeded Muscle Groups and Muscles")
  end

  defp seed_equipment do
    equipment_list = [
      {"Barbell", "Long bar for loading weight plates"},
      {"Dumbbell", "Hand-held weights"},
      {"Kettlebell", "Ball-shaped weight with a handle"},
      {"Machine", "Fixed resistance machine"},
      {"Cable", "Cable pulley system"},
      {"Bodyweight", "No equipment, just body weight"},
      {"Smith Machine", "Barbell fixed within steel rails"},
      {"EZ Bar", "Curved barbell for better grip"},
      {"Resistance Band", "Elastic bands for resistance"},
      {"Medicine Ball", "Weighted ball"},
      {"Plate", "Weight plate"},
      {"Bench", "Flat, incline, or decline bench"},
      {"Pull-up Bar", "Bar for pull-ups"},
      {"Dip Station", "Bars for dips"},
      {"Leg Press", "Machine for leg press"},
      {"Leg Extension", "Machine for leg extensions"},
      {"Leg Curl", "Machine for leg curls"},
      {"Lat Pulldown", "Machine for lat pulldowns"},
      {"Seated Row", "Machine for seated rows"},
      {"Cardio Machine", "Treadmill, bike, rower, etc."}
    ]

    for {name, desc} <- equipment_list do
      case Repo.get_by(Equipment, name: name) do
        nil ->
          Repo.insert!(%Equipment{
            name: name,
            description: desc
          })
        _ ->
          :ok
      end
    end

    IO.puts("✓ Seeded Equipment")
  end
end
