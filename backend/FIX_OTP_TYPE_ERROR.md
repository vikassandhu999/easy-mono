# Fix: OTP Type Casting and Return Value Errors

## Problems Fixed

### Problem 1: Type Casting Error

**Error Message:**
```
(Ecto.Query.CastError) value `:login` in `where` cannot be cast to type :string in query
```

**Root Cause:**
The `type` field in the `one_time_tokens` table is defined as `:string` in the database schema, but the code was passing atoms (`:login`, `:registration`) instead of strings.

### Problem 2: BadMapError

**Error Message:**
```
(BadMapError) expected a map, got: "853afe30-d7b9-4a89-b076-a9077fa2fd0c"
```

**Root Cause:**
The `Accounts.generate_otp/2` function was returning `{:ok, token_uuid}` (just a string), but the controller expected `{:ok, %{token_id: ..., expires_at: ...}}` (a map with structured data).

## Fixes Applied

### Fix 1: Type Casting Error

**File:** `lib/easy_web/controllers/auth_controller.ex`

**Function:** `map_type_to_otp_type/1` (lines 467-469)

**Before (Incorrect):**
```elixir
defp map_type_to_otp_type("registration"), do: :registration
defp map_type_to_otp_type("login"), do: :login
defp map_type_to_otp_type(_), do: :login
```

**After (Fixed):**
```elixir
defp map_type_to_otp_type("registration"), do: "registration"
defp map_type_to_otp_type("login"), do: "login"
defp map_type_to_otp_type(_), do: "login"
```

### Fix 2: BadMapError

**File:** `lib/easy/accounts.ex`

**Function:** `generate_otp/2` (line 50) and `generate_new_otp/3` (line 137)

**Before (Incorrect):**
```elixir
# In generate_otp/2
{:ok, recent_token.token}  # Returns just UUID string

# In generate_new_otp/3
{:ok, token_uuid}  # Returns just UUID string
```

**After (Fixed):**
```elixir
# In generate_otp/2
{:ok, %{token_id: recent_token.token, expires_at: recent_token.expires_at}}

# In generate_new_otp/3
{:ok, %{token_id: token.token, expires_at: token.expires_at}}
```

## Why This Happened

1. The HTTP request receives `"type": "login"` as a string
2. The controller mapped it to an atom `:login` 
3. The atom was passed to `Accounts.generate_otp/2`
4. Inside `Accounts.generate_otp/2`, it calls `get_recent_token/3`
5. The query tries to compare `t.type == ^:login` where `t.type` is a `:string` field
6. Ecto cannot cast the atom `:login` to a string in the query → **Error!**

## Database Schema

From `lib/easy/accounts/one_time_token.ex`:

```elixir
schema "one_time_tokens" do
  field :token, :binary_id
  field :code, :string
  field :type, :string      # ← This is a string, not an atom!
  field :email, :string
  field :expires_at, :utc_datetime
  field :used_at, :utc_datetime
  field :attempts, :integer, default: 0
  field :metadata, :map
  
  belongs_to :user, Easy.Accounts.User
  
  timestamps()
end
```

## Query That Was Failing

From `lib/easy/accounts.ex` (line 84):

```elixir
def get_recent_token(email, type, within_seconds \\ 60) do
  cutoff_time = DateTime.add(DateTime.utc_now(), -within_seconds, :second)

  from(t in OneTimeToken,
    where:
      t.email == ^email and
        t.type == ^type and  # ← This comparison failed when type was :login (atom)
        is_nil(t.used_at) and
        t.inserted_at > ^cutoff_time and
        t.expires_at > ^DateTime.utc_now(),
    order_by: [desc: t.inserted_at],
    limit: 1
  )
  |> Repo.one()
end
```

## Testing

After the fix, the following request should work:

```bash
POST /api/auth/send-otp
Content-Type: application/json

{
  "email": "asyncnavi@gmail.com",
  "type": "login"
}
```

Expected response:
```json
{
  "token_id": "550e8400-e29b-41d4-a716-446655440000",
  "expires_at": "2025-11-10T18:06:28Z",
  "status": "pending_verification"
}
```

## Prevention

To prevent this type of error in the future:

1. **Type Consistency**: Always ensure that data types match between:
   - Database schema (`:string` in Ecto schema)
   - Query parameters (strings, not atoms)
   - API requests (JSON strings)

2. **Early Conversion**: Convert types as early as possible in the request lifecycle

3. **Type Specs**: Use `@spec` annotations to document expected types:
   ```elixir
   @spec map_type_to_otp_type(String.t()) :: String.t()
   defp map_type_to_otp_type("registration"), do: "registration"
   ```

4. **Tests**: Add tests that verify the full request flow, not just individual functions

## Related Files

- `lib/easy_web/controllers/auth_controller.ex` - Controller with the fix
- `lib/easy/accounts.ex` - Accounts context with the query
- `lib/easy/accounts/one_time_token.ex` - Schema definition

## Complete Error Flow

### Error 1: Type Casting
1. Request: `{"type": "login"}` (string) ✅
2. Controller maps: `"login"` → `:login` (atom) ❌
3. Query: `t.type == ^:login` where `t.type` is `:string` ❌
4. **Result:** Ecto.Query.CastError

**After Fix:**
1. Request: `{"type": "login"}` (string) ✅
2. Controller maps: `"login"` → `"login"` (string) ✅
3. Query: `t.type == ^"login"` where `t.type` is `:string` ✅
4. **Result:** Success!

### Error 2: BadMapError
1. `Accounts.generate_otp/2` returns: `{:ok, "uuid-string"}` ❌
2. Controller tries: `result.token_id` ❌
3. **Result:** BadMapError (can't access `.token_id` on a string)

**After Fix:**
1. `Accounts.generate_otp/2` returns: `{:ok, %{token_id: "uuid", expires_at: datetime}}` ✅
2. Controller accesses: `result.token_id` ✅
3. **Result:** Success!

## Status

✅ **BOTH ISSUES FIXED**
- Changed return values from atoms to strings in `map_type_to_otp_type/1`
- Changed `generate_otp/2` to return a map with `token_id` and `expires_at` instead of just a UUID string
