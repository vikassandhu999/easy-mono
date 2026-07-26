# Dev-only, idempotent seed: the data the design frames need in order to be
# MATCHABLE against `design-handoff/refs/*.png`. Companion to
# dev_client_states.exs (lifecycle states) and dev_rich_client.exs (a data-rich
# client); this one fills the gaps those two leave:
#
#   1. Image BLOBS for progress-photo attachments. `dev_client_states.exs` inserts
#      attachment rows and never uploaded an object for them, so CD-PH / CD-CS /
#      CD-OV / CD-CI drew placeholder tiles for a client who had "submitted" nine
#      photos. Also prints the MinIO clock skew when there is one — see below, it
#      looks exactly like a permissions error and is not one.
#   2. A landing page + prospects, so the dashboard's `New lead` row exists at all.
#      Prospects can only be created through a landing page (`landing_page_id` is
#      required), and dev had none.
#
#   cd backend && mix run priv/repo/dev_screen_data.exs
#
# Owner-only screens (CD-DT's coach name, the Change-coach picker, ST Team) are NOT
# seeded: they depend on WHO is logged in, not on data. The script prints the owner
# it found so you can log in as them.

import Ecto.Query

alias Easy.Attachments.Attachment
alias Easy.Clients.Client
alias Easy.Landing.{LandingPage, LandingProgram, Prospect}
alias Easy.Orgs.Business
alias Easy.Repo
alias Easy.Storage

rich_id = "f9e0ba52-2974-45b9-bf29-ffc3e081f7bd"
rich = Repo.get!(Client, rich_id)
business = Repo.get!(Business, rich.business_id)

# ── 1. Progress-photo blobs ────────────────────────────────────────────────────
#
# A solid-colour PNG, built here rather than committed as a binary: three
# distinguishable images with nothing to keep in the repo. PNG (not JPEG) because
# it is the one raster format a few lines of `:zlib` can emit correctly, and the
# attachment content type is only used for the `image/*` check.
png = fn {r, g, b}, size ->
  chunk = fn type, data ->
    <<byte_size(data)::32, type::binary, data::binary, :erlang.crc32(type <> data)::32>>
  end

  header = <<137, 80, 78, 71, 13, 10, 26, 10>>
  ihdr = chunk.("IHDR", <<size::32, size::32, 8, 2, 0, 0, 0>>)
  row = <<0>> <> :binary.copy(<<r, g, b>>, size)
  idat = chunk.("IDAT", :zlib.compress(:binary.copy(row, size)))
  header <> ihdr <> idat <> chunk.("IEND", "")
end

# Muted studio-ish tones so a progress-photo grid reads as photos, not as a test card.
palette = [{198, 205, 214}, {214, 203, 192}, {193, 201, 193}]

# A presigned URL is signed with THIS machine's clock and checked against MinIO's.
# When the container's clock has drifted (Docker Desktop after the host sleeps), every
# signature is either "not valid yet" or "has expired" and MinIO answers a bare
# `403 AccessDenied` — which reads like a credentials problem and is not one. Say so
# here rather than letting ten XML error bodies scroll past.
skew =
  case Req.get("http://localhost:9000/minio/health/live", retry: false) do
    {:ok, %{headers: %{"date" => [date | _]}}} ->
      # `:httpd_util` is in OTP's inets — an RFC1123 parser without a new dependency.
      case :httpd_util.convert_request_date(String.to_charlist(date)) do
        {{_y, _m, _d}, {_hh, _mm, _ss}} = erl ->
          DateTime.diff(DateTime.utc_now(), DateTime.from_naive!(NaiveDateTime.from_erl!(erl), "Etc/UTC"))

        _ ->
          0
      end

    _ ->
      0
  end

if abs(skew) > 60 do
  IO.puts("""

  ! MinIO's clock is #{div(abs(skew), 60)} min #{if skew > 0, do: "BEHIND", else: "AHEAD OF"} this machine.
    Every presigned URL will 403 (`Request is not valid yet` / `has expired`) — in the
    app too, not only here. It is Docker Desktop's VM clock, not the container's, so
    `docker compose restart` does NOT move it (measured). Restart Docker Desktop,
    then re-run this script.
  """)
end

image_attachments =
  Repo.all(
    from a in Attachment,
      where: a.client_id == ^rich_id and like(a.content_type, "image/%"),
      order_by: [asc: a.inserted_at]
  )

{uploaded, skipped} =
  image_attachments
  |> Enum.with_index()
  |> Enum.reduce({0, 0}, fn {attachment, index}, {up, skip} ->
    {:ok, %{url: get_url}} = Storage.presign_get(attachment.storage_key)

    # Only upload what is actually missing — re-running must not re-push blobs.
    case Req.get(get_url, retry: false) do
      {:ok, %{status: 200}} ->
        {up, skip + 1}

      _ ->
        body = png.(Enum.at(palette, rem(index, length(palette))), 480)
        {:ok, %{url: put_url}} = Storage.presign_put(attachment.storage_key)

        case Req.put(put_url, body: body, headers: [{"content-type", "image/png"}], retry: false) do
          {:ok, %{status: status}} when status in 200..299 ->
            # The row claimed a size and type it never had; make both true.
            attachment
            |> Ecto.Changeset.change(byte_size: byte_size(body), content_type: "image/png")
            |> Repo.update!()

            {up + 1, skip}

          other ->
            IO.puts("  ! upload failed for #{attachment.storage_key}: #{inspect(other)}")
            {up, skip}
        end
    end
  end)

IO.puts("photo blobs: #{uploaded} uploaded, #{skipped} already present (#{length(image_attachments)} image attachments)")

# ── 2. A landing page and two new leads ───────────────────────────────────────
page =
  Repo.one(from p in LandingPage, where: p.business_id == ^business.id, limit: 1) ||
    Repo.insert!(%LandingPage{
      business_id: business.id,
      slug: "dev-coaching",
      template: :proof_first,
      status: :published,
      eyebrow: "1:1 online coaching",
      headline: "Get strong without guessing",
      subheadline: "Training, nutrition and weekly check-ins, built around your week.",
      coach_intro: "I coach lifters who want a plan they can actually keep to.",
      fit_points: ["You train 3–4 days a week", "You want structure, not a PDF"],
      application_questions: [
        %{"id" => Ecto.UUID.generate(), "label" => "What's your main goal?", "type" => "text", "required" => true}
      ]
    })

# The dashboard's lead row reads `{program} · applied {ago}`, so a lead needs a
# PROGRAM to attach to or the row says "New application" where the ref says
# "12-week transformation".
programs =
  for {name, promise} <- [
        {"12-week transformation", "Drop body fat and keep your strength"},
        {"Strength base", "Squat, press and pull with a plan"}
      ] do
    Repo.one(from p in LandingProgram, where: p.landing_page_id == ^page.id and p.name == ^name) ||
      Repo.insert!(%LandingProgram{
        business_id: business.id,
        landing_page_id: page.id,
        name: name,
        promise: promise,
        audience: "Lifters training 3–4 days a week",
        price_display: "£120 / month"
      })
  end

leads =
  Enum.zip(
    [{"Ella Foster", "ella.foster@example.com"}, {"Tomás Díaz", "tomas.diaz@example.com"}],
    programs
  )

created =
  for {{name, email}, program} <- leads do
    case Repo.one(from p in Prospect, where: p.business_id == ^business.id and p.email == ^email) do
      nil ->
        Repo.insert!(%Prospect{
          business_id: business.id,
          landing_page_id: page.id,
          landing_program_id: program.id,
          name: name,
          email: email,
          status: :new,
          answers: %{"What's your main goal?" => program.promise}
        })

        name

      # Backfill: the first run of this script created leads with no program.
      existing ->
        if is_nil(existing.landing_program_id) do
          existing |> Ecto.Changeset.change(landing_program_id: program.id) |> Repo.update!()
          "#{name} (program backfilled)"
        else
          nil
        end
    end
  end
  |> Enum.reject(&is_nil/1)

IO.puts("landing page: #{page.slug} · new leads created: #{inspect(created)}")

# ── 3. What data cannot fix ───────────────────────────────────────────────────
owner_email = Repo.one(from u in "users", where: u.id == ^Ecto.UUID.dump!(business.owner_id), select: u.email)

IO.puts("""

owner-only screens (CD-DT coach name, Change coach, ST Team) need the OWNER login:
  #{owner_email} · dev OTP 123456
""")
