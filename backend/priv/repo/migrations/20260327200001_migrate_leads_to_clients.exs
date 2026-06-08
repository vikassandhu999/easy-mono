defmodule Easy.Repo.Migrations.MigrateLeadsToClients do
  use Ecto.Migration

  def up do
    # Migrate unconverted leads (new, contacted) as pending clients
    execute("""
    INSERT INTO clients (id, email, first_name, phone, instagram_handle, notes,
                         status, intake_answers, offer_id, source, business_id,
                         payment_amount, payment_currency, program_name,
                         inserted_at, updated_at)
    SELECT gen_random_uuid(), l.email, l.name, l.phone, l.instagram_handle, l.notes,
           'pending', l.intake_answers, l.offer_id, l.source, l.business_id,
           o.price, COALESCE(o.currency, 'INR'), o.name,
           l.inserted_at, l.updated_at
    FROM leads l
    LEFT JOIN offers o ON o.id = l.offer_id
    WHERE l.status IN ('new', 'contacted')
      AND l.client_id IS NULL
    """)

    # Migrate rejected leads as pending clients with archived override
    execute("""
    INSERT INTO clients (id, email, first_name, phone, instagram_handle, notes,
                         status, status_override, intake_answers, offer_id, source,
                         business_id,
                         payment_amount, payment_currency, program_name,
                         inserted_at, updated_at)
    SELECT gen_random_uuid(), l.email, l.name, l.phone, l.instagram_handle, l.notes,
           'pending', 'archived', l.intake_answers, l.offer_id, l.source, l.business_id,
           o.price, COALESCE(o.currency, 'INR'), o.name,
           l.inserted_at, l.updated_at
    FROM leads l
    LEFT JOIN offers o ON o.id = l.offer_id
    WHERE l.status = 'rejected'
      AND l.client_id IS NULL
    """)

    # Enrich already-converted leads' clients with intake data they're missing
    execute("""
    UPDATE clients c
    SET intake_answers = l.intake_answers,
        offer_id = l.offer_id,
        source = COALESCE(c.source, l.source),
        instagram_handle = COALESCE(c.instagram_handle, l.instagram_handle),
        notes = COALESCE(c.notes, l.notes),
        program_name = COALESCE(c.program_name, o.name),
        payment_amount = COALESCE(c.payment_amount, o.price),
        payment_currency = COALESCE(c.payment_currency, o.currency, 'INR')
    FROM leads l
    LEFT JOIN offers o ON o.id = l.offer_id
    WHERE l.client_id = c.id
      AND l.status = 'converted'
    """)

    # Migrate existing invited clients to pending status
    execute("UPDATE clients SET status = 'pending' WHERE status = 'invited'")
  end

  def down do
    # Revert pending clients back to invited where they came from invites
    execute(
      "UPDATE clients SET status = 'invited' WHERE status = 'pending' AND source = 'invite'"
    )

    # Remove intake data from converted leads' clients
    execute("""
    UPDATE clients c
    SET intake_answers = '{}',
        offer_id = NULL,
        program_name = NULL,
        payment_amount = NULL,
        payment_currency = 'INR'
    FROM leads l
    WHERE l.client_id = c.id
      AND l.status = 'converted'
    """)

    # Delete clients that were migrated from leads (non-converted)
    execute("""
    DELETE FROM clients
    WHERE source = 'storefront'
      AND invitation_token IS NULL
      AND creator_id IS NULL
    """)
  end
end
