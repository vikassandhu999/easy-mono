defmodule Easy.Repo.Migrations.UpdateOneTimeTokens do
  use Ecto.Migration

  def up do
    # Add metadata field for flexible context storage
    alter table(:one_time_tokens) do
      add :metadata, :map, default: "{}"
    end

    # Drop old constraint with outdated token types
    drop constraint(:one_time_tokens, :valid_token_type)

    # Create new constraint with all token types
    create constraint(:one_time_tokens, :valid_token_type,
             check: """
             token_type IN (
               'authentication',
               'invitation_acceptance',
               'phone_verification',
               'email_verification',
               'coach_invitation',
               'account_deletion',
               'business_transfer',
               'payment_confirmation',
               'session_verification',
               'mfa_setup',
               'mfa_login'
             )
             """
           )
  end

  def down do
    # Remove metadata field
    alter table(:one_time_tokens) do
      remove :metadata
    end

    # Drop new constraint
    drop constraint(:one_time_tokens, :valid_token_type)

    # Restore old constraint
    create constraint(:one_time_tokens, :valid_token_type,
             check:
               "token_type IN ('signup_verification', 'signin_verification', 'password_reset')"
           )
  end
end
