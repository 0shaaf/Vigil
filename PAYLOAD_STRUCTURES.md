# Vigil Payload & Schema Architecture

This document specifies the exact structure of payloads, database entities, server actions, route handlers, and inter-function interfaces within the Vigil Sentinel System.

---

## 1. Architectural Overview & Lifecycle

```
[ Operator Dashboard / Check-In ]
        │
        ▼ (Heartbeat / Re-arm)
[ Supabase: switches ] ─── (Timer Expiry) ───► [ Cron: GET /api/revalidate ]
        │                                                │
        │                                                ▼
        │                                     [ processSwitchEscalation ]
        │                                                │
        ├────────────────────────────────────────────────┼──────────────────────────────┐
        ▼                                                ▼                              ▼
 [ Infrastructure Lockdown ]                 [ Priority Waterfall Email ]       [ Google Drive Sharing ]
 (executeLockdownWebhook)                    (Resend API + Ack Token)           (grantDriveFileAccess)
        │                                                │                              │
        ▼                                                ▼                              ▼
 [ Webhook Endpoint ]                        [ Contact Recipient ]              [ Drive Assets Shared ]
                                                         │
                                                         ▼ (One-Click Link)
                                             [ GET /api/ack/[token] ] ──► Status: RESOLVED
```

---

## 2. Server Action Payloads

### `createSwitch(payload)`
- **Location:** `app/actions/switches.js`
- **Input Payload:**
```typescript
interface CreateSwitchPayload {
  name: string;                          // Sentinel name (e.g. "Primary Infrastructure Watcher")
  criticality?: "OPERATIONAL" | "HIGH" | "CRITICAL" | "STANDBY";
  purpose?: "PERSONAL" | "INFRASTRUCTURE" | "FINANCIAL" | "LEGAL";
  description?: string;
  check_in_interval: {
    months?: number | string;            // Default: 0
    days?: number | string;              // Default: 0
    hours?: number | string;             // Default: 0
    minutes?: number | string;           // Default: 0
  };
  actions?: {
    email?: boolean;                     // Default: true
    modules?: {
      beacon?: boolean;                  // Release stored briefings & documents
      data_release?: boolean;            // Data release module
      purge?: boolean;                   // Purge local artifacts
      lockdown?: boolean;                // Outbound kill-switch HTTP webhook
    };
    data_releases?: Array<any>;
    purge_config?: any;
    lockdown_config?: {
      webhook_url: string;               // Outbound URL called upon trip
      http_method: "POST" | "PUT" | "DELETE" | "GET";
      auth_header?: string;              // E.g. "Bearer secret_token"
      payload_json?: string;             // Stringified JSON custom payload
    } | null;
  };
  contacts?: Array<{
    id?: number | string;
    contact_id?: number | string;
    priority_score?: number | string;    // Higher = notified earlier in waterfall (e.g. 1-100)
    trust_score?: number | string;       // Clearance level (0-100)
  }>;
  beacon_rows?: Array<{
    content: string;                     // Secret briefing or disclosure text
    trust_required: number;              // Clearance required (0-100), or -1 for single-recipient
    target_contact_id?: string | null;   // Required if trust_required === -1
    file_metadata?: Array<{
      id: string;                        // Google Drive File ID
      name: string;                      // File name
      mimeType: string;                  // MIME type
      webViewLink: string;               // View/Download URL
      size?: string;                     // Size in bytes
    }>;
  }>;
}
```
- **Return Value:**
```typescript
Promise<SwitchRecord> // The newly inserted row from the 'switches' table
```

---

### `getSwitchById(switchId)`
- **Location:** `app/actions/switches.js`
- **Input:** `switchId: string` (UUID)
- **Return Value:**
```typescript
Promise<{
  id: string;
  usr_id: string;
  name: string;
  criticality: string;
  purpose: string;
  status: "ARMED" | "ESCALATING" | "RESOLVED" | "EXHAUSTED" | "STANDBY";
  last_check_in: string;                 // ISO 8601 timestamp
  check_in_interval: {
    months: number;
    days: number;
    hours: number;
    minutes: number;
  };
  actions: {
    email: boolean;
    modules: {
      beacon: boolean;
      data_release: boolean;
      purge: boolean;
      lockdown: boolean;
    };
    data_releases: Array<any>;
    purge_config: any;
    lockdown_config: any;
    lockdown_executed: boolean;
    lockdown_executed_at: string | null;
  };
  created_at: string;
  switch_contacts: Array<{
    id: number;
    priority_score: number;
    trust_score: number;
    contact_id: number;
    status: "pending" | "notified" | "acked" | "timed_out" | null;
    notified_at: string | null;
    acknowledged_at: string | null;
    contacts: {
      id: number;
      contact_name: string;
      email: string;
    };
  }>;
  info_to_release: Array<{
    id: number;
    content: string;
    trust_required: number;
    target_contact_id: string | null;
    file_metadata: Array<{
      id: string;
      name: string;
      mimeType: string;
      webViewLink: string;
      size?: string;
    }>;
  }>;
} | null>
```

---

### `updateSwitch(switchId, updatePayload)`
- **Location:** `app/actions/switches.js`
- **Input:**
  - `switchId: string`
  - `updatePayload: Partial<CreateSwitchPayload>`
- **Return Value:** `Promise<SwitchRecord>`

---

### `rearmSwitch(switchId)`
- **Location:** `app/actions/switches.js`
- **Input:** `switchId: string`
- **Side Effects:**
  - Sets `status = 'ARMED'`
  - Sets `last_check_in = NOW()`
  - Resets `actions.lockdown_executed = false` and `actions.lockdown_executed_at = null`
  - Resets all linked `switch_contacts` to `status = 'pending'`, `ack_token = null`
  - Appends `CHECKIN_PULSE` to `escalation_logs`
- **Return Value:** `Promise<SwitchRecord>`

---

### `removeSwitch(swId)`
- **Location:** `app/actions/switches.js`
- **Input:** `swId: string`
- **Return Value:** `Promise<{ success?: boolean; error?: string }>`

---

### `triggerHeartbeat()`
- **Location:** `app/actions/switches.js`
- **Input:** None (evaluates current authenticated session)
- **Side Effects:** Bulk updates `last_check_in = NOW()` across ALL switches owned by the user.
- **Return Value:** `Promise<{ success?: boolean; error?: string }>`

---

### `checkInSingleSwitch(swId)`
- **Location:** `app/actions/switches.js`
- **Input:** `swId: string`
- **Side Effects:** Updates `last_check_in = NOW()` for target switch owned by user.
- **Return Value:** `Promise<{ success?: boolean; error?: string }>`

---

### `getContacts()`
- **Location:** `app/actions/contacts.js`
- **Input:** None (reads authenticated session)
- **Return Value:**
```typescript
Promise<{
  data: Array<{
    id: number;
    contact_name: string;
    email: string;
    created_at: string;
    switch_contacts: Array<{ switch_id: string }>;
  }>;
  error: string | null;
}>
```

---

### `createContact(payload)`
- **Location:** `app/actions/contacts.js`
- **Input Payload:**
```typescript
interface CreateContactPayload {
  contact_name: string; // Trimmed name
  email: string;        // Lowercase trimmed email
}
```
- **Return Value:**
```typescript
Promise<{ success?: boolean; contact?: ContactRecord; error?: string }>
```

---

### `deleteContact(contactId)`
- **Location:** `app/actions/contacts.js`
- **Input:** `contactId: number | string`
- **Return Value:** `Promise<{ success?: boolean; error?: string }>`

---

### `buildSwitchPayload(formData, infoRows)`
- **Location:** `app/actions/payloads.js`
- **Input:**
  - `formData: Object` (form state with `name`, `contactsIncluded: string[]`, `contactMetrics: Record<id, { priority, trust }>`, `months`, `days`, `hours`)
  - `infoRows: Array` (briefing disclosures)
- **Return Value:**
```typescript
{
  name: string;
  contacts: Array<{
    contact_id: number;
    priority_score: number;
    trust_score: number;
  }>;
  check_in_interval: {
    months: number;
    days: number;
    hours: number;
  };
  info_to_release: Array<any>;
}
```

---

## 3. Database Entity Schemas (Supabase PostgreSQL)

### `switches`
| Column | Type | Constraints / Description |
|---|---|---|
| `id` | `uuid` | Primary Key, `default: gen_random_uuid()` |
| `usr_id` | `uuid` | Foreign key to `auth.users.id` |
| `name` | `text` | Display name of the switch |
| `criticality` | `text` | Enum: `OPERATIONAL`, `HIGH`, `CRITICAL`, `STANDBY` |
| `purpose` | `text` | Enum: `PERSONAL`, `INFRASTRUCTURE`, `FINANCIAL`, `LEGAL` |
| `status` | `text` | Enum: `ARMED`, `ESCALATING`, `RESOLVED`, `EXHAUSTED`, `STANDBY` |
| `last_check_in` | `timestamptz` | Timestamp of latest operator pulse |
| `check_in_interval`| `jsonb` | `{ months: number, days: number, hours: number, minutes: number }` |
| `actions` | `jsonb` | Execution configuration (see below) |
| `description` | `text` | Optional documentation |
| `created_at` | `timestamptz` | Auto-generated timestamp |

#### `switches.actions` JSONB Schema:
```json
{
  "email": true,
  "modules": {
    "beacon": true,
    "data_release": false,
    "purge": false,
    "lockdown": true
  },
  "data_releases": [],
  "purge_config": null,
  "lockdown_config": {
    "webhook_url": "https://api.yourdomain.com/emergency-shutdown",
    "http_method": "POST",
    "auth_header": "Bearer secret_key",
    "payload_json": "{\"command\": \"lockdown\"}"
  },
  "lockdown_executed": false,
  "lockdown_executed_at": null
}
```

---

### `contacts`
| Column | Type | Description |
|---|---|---|
| `id` | `bigint` | Primary Key |
| `usr_id` | `uuid` | Foreign key to `auth.users.id` |
| `contact_name` | `text` | Recipient full name |
| `email` | `text` | Notification email address |
| `created_at` | `timestamptz` | Record creation time |

---

### `switch_contacts` (Junction Table)
| Column | Type | Description |
|---|---|---|
| `id` | `bigint` | Primary Key |
| `switch_id` | `uuid` | References `switches.id` |
| `contact_id` | `bigint` | References `contacts.id` |
| `priority_score` | `integer` | Waterfall tier (Higher = notified first) |
| `trust_score` | `integer` | Clearance rating (0–100) |
| `status` | `text` | `pending`, `notified`, `acked`, `timed_out`, or `null` |
| `ack_token` | `text` | Unique UUID generated on email dispatch |
| `notified_at` | `timestamptz` | Timestamp when escalation email was sent |
| `acknowledged_at`| `timestamptz`| Timestamp when recipient clicked acknowledgment link |

---

### `info_to_release` (Beacon Disclosures)
| Column | Type | Description |
|---|---|---|
| `id` | `bigint` | Primary Key |
| `switch_id` | `uuid` | References `switches.id` |
| `content` | `text` | Secret message or instruction |
| `trust_required` | `integer` | Minimum trust required (0-100), or `-1` for specific target |
| `target_contact_id` | `text` / `bigint` | Designated recipient ID if `trust_required === -1` |
| `file_metadata` | `jsonb` | Array of Google Drive file references |

#### `info_to_release.file_metadata` Item:
```json
{
  "id": "1A2B3C4D_google_file_id",
  "name": "master_keys.enc",
  "mimeType": "application/octet-stream",
  "webViewLink": "https://drive.google.com/file/d/...",
  "size": "4096"
}
```

---

### `escalation_logs` (Audit Trail)
| Column | Type | Description |
|---|---|---|
| `id` | `bigint` | Primary Key |
| `usr_id` | `uuid` | Switch owner user ID |
| `switch_id` | `uuid` | Target switch ID |
| `event_type` | `text` | `TRIP_WARNING`, `TRIGGER_FIRED`, `PAYLOAD_DISPATCHED`, `ESCALATION_TIMEOUT`, `CHECKIN_PULSE`, `LOCKDOWN_WEBHOOK` |
| `channel` | `text` | `EMAIL`, `SYSTEM`, `DASHBOARD`, `EMAIL_ACK`, `WEBHOOK` |
| `recipient_email`| `text` | Recipient email if applicable |
| `trust_tier` | `integer` | Trust tier or priority score |
| `status` | `text` | `SUCCESS` or `FAILED` |
| `details` | `text` | Human-readable audit narrative |
| `execution_metadata` | `jsonb` | Arbitrary diagnostic metadata (ack tokens, HTTP codes, etc.) |
| `created_at` | `timestamptz` | Event creation timestamp |

---

### `user_integrations` (OAuth Credentials)
| Column | Type | Description |
|---|---|---|
| `id` | `bigint` | Primary Key |
| `usr_id` | `uuid` | Foreign key to `auth.users.id` |
| `provider` | `text` | Provider identifier: `"google_drive"` |
| `access_token` | `text` | Short-lived OAuth 2.0 access token |
| `refresh_token` | `text` | Permanent offline OAuth refresh token |
| `token_expiry` | `timestamptz` | Expiration date of current access token |
| `scopes` | `text[]` | Array of authorized Google OAuth scopes |
| `account_email`| `text` | Connected Google account email address |
| `updated_at` | `timestamptz` | Timestamp of last token refresh |

---

## 4. API Route Specifications

### `GET /api/ack/[token]`
- **Purpose:** Public endpoint clicked by a recipient when an incident email is received.
- **Request Parameters:**
  - Route Param: `token: string` (UUID from `switch_contacts.ack_token`)
- **Response:**
  - `200 OK`: HTML response confirming incident acknowledgment. Transitions switch to `RESOLVED` and cancels remaining pending waterfall tiers.
  - `404 Not Found`: HTML response indicating security token expired or invalid.
  - `410 Gone`: HTML response indicating acknowledgment window timed out.

---

### `GET /api/auth/google`
- **Purpose:** Initiates Google OAuth consent screen for Drive access.
- **Query Params:** None (uses active Supabase user session)
- **Response:** `302 Redirect` to `https://accounts.google.com/o/oauth2/v2/auth` with `state = user.id`.

---

### `GET /api/auth/callback`
- **Purpose:** Handles Google OAuth authorization code redirect.
- **Query Params:**
  - `code`: Authorization code from Google
  - `state`: User ID for CSRF validation
  - `error`: OAuth error code if denied
- **Response:** `302 Redirect` to `/dashboard?integration=google_connected` or `/dashboard?error=...`

---

### `GET /api/drive/files`
- **Purpose:** Returns list of user's Google Drive files for asset attachment.
- **Query Params:**
  - `q`: Optional search keyword filter
- **Response:**
```json
{
  "files": [
    {
      "id": "1g9m...",
      "name": "credentials.pdf",
      "mimeType": "application/pdf",
      "webViewLink": "https://drive.google.com/file/d/1g9m.../view",
      "iconLink": "https://drive-thirdparty.googleusercontent.com/16/type/video/mp4",
      "size": "1048576",
      "modifiedTime": "2026-10-06T12:00:00.000Z"
    }
  ]
}
```

---

### `GET /api/revalidate` (Cron Daemon Endpoint)
- **Purpose:** Background worker evaluating countdown timers and advancing escalation waterfalls.
- **Request Headers:**
  - `Authorization: Bearer <CRON_SECRET>` or `x-cron-secret: <CRON_SECRET>`
- **Response Payload:**
```json
{
  "success": true,
  "timestamp": "2026-10-06T19:00:00.000Z",
  "summary": {
    "armedEvaluated": 12,
    "warningsSent": 1,
    "newlyTripped": 1,
    "escalatingEvaluated": 3
  }
}
```

---

### `POST | PUT | DELETE /api/text-webhook`
- **Purpose:** Test endpoint for simulating and inspecting kill-switch webhook destinations.
- **Outbound Webhook Payload (sent by Vigil):**
```json
{
  "your_custom_key": "custom_value",
  "_vigil_event": {
    "switch_id": "0a1b2c3d-...",
    "switch_name": "Main Server Sentinel",
    "criticality": "CRITICAL",
    "triggered_at": "2026-10-06T19:00:00.000Z"
  }
}
```
- **Response:**
```json
{
  "status": "TERMINATION_ACKNOWLEDGED",
  "message": "Test kill-switch webhook processed successfully.",
  "received_at": "2026-10-06T19:00:00.000Z",
  "meta": {
    "method": "POST",
    "has_auth": true,
    "switch_id": "0a1b2c3d-...",
    "switch_name": "Main Server Sentinel"
  }
}
```

---

## 5. Internal Functions & Library Interfaces

### `processSwitchEscalation(supabase, sw)`
- **Location:** `app/lib/escalations.js`
- **Arguments:**
  - `supabase`: Admin or server Supabase client
  - `sw`: Switch record object
- **Behavior:**
  1. Triggers lockdown webhook if configured and not yet executed (`executeLockdownWebhook`).
  2. Checks if any contact is already `acked` (if so, marks switch `RESOLVED` and halts).
  3. Checks timestamps for `notified` contacts. If `elapsed >= ACK_TIMEOUT_MS` (1 min), marks as `timed_out` and logs `ESCALATION_TIMEOUT`.
  4. If contacts are still in `notified` status within window, returns `{ status: "WAITING_FOR_ACK" }`.
  5. If no pending contacts remain, marks switch `EXHAUSTED`.
  6. Identifies highest `priority_score` among remaining pending contacts.
  7. Resolves Google Drive access permissions for attached assets.
  8. Sends formatted email with disclosure messages via Resend.
  9. Updates contacted users to `status = "notified"` with a new `ack_token`.
- **Return Value:**
```typescript
Promise<{
  status: "NO_CONTACTS" | "HALTED_ACKNOWLEDGED" | "WAITING_FOR_ACK" | "EXHAUSTED" | "BATCH_DISPATCHED";
  priority?: number;
  count?: number;
}>
```

---

### `executeLockdownWebhook(supabase, sw)`
- **Location:** `app/lib/webhook.js`
- **Arguments:**
  - `supabase`: Supabase client
  - `sw`: Switch record
- **Behavior:**
  1. Checks `sw.actions.modules.lockdown` and `sw.actions.lockdown_config.webhook_url`.
  2. Immediately sets `lockdown_executed: true` to guarantee single execution (idempotency).
  3. Sends HTTP request (`POST`, `PUT`, `DELETE`, `GET`) with 10-second timeout.
  4. Records `LOCKDOWN_WEBHOOK` entry in `escalation_logs`.
- **Return Value:**
```typescript
Promise<{ success?: boolean; status?: number; error?: string; skipped?: boolean }>
```
