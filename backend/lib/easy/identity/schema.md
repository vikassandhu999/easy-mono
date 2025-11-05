```
┌─────────────────────────────────────────────┐
│                    users                     │
├─────────────────────────────────────────────┤
│ id (PK, binary_id)                          │
│ email (unique)                              │
│ phone (unique)                              │
│ email_confirmed_at                          │
│ phone_confirmed_at                          │
│ encrypted_password                          │
│ raw_user_meta_data (jsonb)                  │
│ inserted_at, updated_at                     │
└─────────────────────────────────────────────┘
              ↑              ↑
              │              │
    ┌─────────┘              └──────────┐
    │                                   │
┌───┴────────────────────────┐  ┌──────┴──────────────────────┐
│   one_time_tokens          │  │      user_sessions          │
├────────────────────────────┤  ├─────────────────────────────┤
│ id (PK)                    │  │ id (PK)                     │
│ user_id (FK) ───────────── │  │ user_id (FK) ──────────────│
│ token_type                 │  │ refresh_token (unique)      │
│ secret                     │  │ expires_at                  │
│ expires_at                 │  │ refreshed_at                │
│ used, used_at              │  │ revoked_at                  │
│ relates_to_email           │  │ last_activity_at            │
│ relates_to_phone           │  │ device_name, device_type    │
│ attempt_count              │  │ user_agent, ip              │
│ last_attempt_at            │  │ inserted_at, updated_at     │
└────────────────────────────┘  └─────────────────────────────┘
```
