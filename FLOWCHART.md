# FincWin — User Journey Flowcharts

## 1. Marketing Funnel

```mermaid
flowchart TD
    A([Discovery]) --> B{Channel}
    B -->|Organic search| C[landing.html]
    B -->|Paid ad — debt focus| D[v3.html]
    B -->|Paid ad — anxiety focus| E[v2.html]
    B -->|Paid ad — wealth focus| F[v4.html]
    B -->|Direct link| C

    C --> G{User intent}
    D --> G
    E --> G
    F --> G

    G -->|Wants more detail| H[features.html]
    G -->|Ready to buy| I[pricing.html]
    G -->|Just wants the app| J[index.html]

    H --> I
    I --> K{Decision}

    K -->|Try free first| J
    K -->|Buy Starter $49| L[Lemon Squeezy Checkout]
    K -->|Buy Pro $89| L
    K -->|Buy Lifetime $149| L

    L --> M[Email: licence key delivered]
    M --> N[signin.html?key=XXXX]
    N --> O[/api/activate]
    O --> P{Activation result}
    P -->|Success| J
    P -->|Error| N

    J --> Q([App — core experience])
```

---

## 2. App Internal Flow

```mermaid
flowchart TD
    A([App loads — index.html]) --> B{PIN set?}

    B -->|Yes| C[PIN entry screen]
    B -->|No| D{Licence in localStorage?}

    C --> E{PIN correct?}
    E -->|Yes| D
    E -->|No| F[Show error, retry]
    F --> C

    D -->|Yes — key exists| G[/api/validate — daily check]
    D -->|No — free tier| H[Dashboard — Free features]

    G --> I{Valid?}
    I -->|Yes| J[Dashboard — Full feature set]
    I -->|No| K[Licence invalid screen]
    K --> L[signin.html — re-activate]

    H --> M{Tab navigation}
    J --> M

    M -->|Expenses tab| N[Expense Tracker]
    M -->|Budget tab| O[Envelope View]
    M -->|Loans tab| P[Loan Payoff Tracker]
    M -->|Savings tab| Q[Savings Goals]
    M -->|Analytics tab| R[Spending Heatmap + DTI]
    M -->|AI Coach tab| S{Plan check}

    S -->|Pro or Lifetime| T[AI Coach interface]
    S -->|Starter / Free| U[Upgrade prompt]

    N --> V[Add expense modal]
    N --> W[Bulk Add modal]
    O --> X[Set envelope amounts]
    O --> Y[View fill status per category]
    P --> Z[Enter loan details]
    P --> AA[View amortisation schedule]
    P --> AB[Model extra payments]
    Q --> AC[Set savings goal]
    Q --> AD[Log contribution]
```

---

## 3. Licence Validation Flow

```mermaid
flowchart TD
    A([App loads]) --> B[Read localStorage]
    B --> C{fw_license_key exists?}

    C -->|No| D[Free tier mode — limited features]
    C -->|Yes| E{fw_last_validated timestamp?}

    E -->|Not set or > 24 hours ago| F[POST /api/validate]
    E -->|Within last 24 hours| G[Use cached validation — full access]

    F --> H{API response}

    H -->|valid: true| I[Set fw_last_validated = now]
    I --> J[Unlock plan features based on fw_plan]
    J --> K([Dashboard — full access])

    H -->|valid: false — reason: key_expired| L[Show: Your licence has expired]
    H -->|valid: false — reason: instance_deactivated| M[Show: This device was deactivated]
    H -->|valid: false — reason: too_many_instances| N[Show: Device limit reached]
    H -->|Network error| O[Grace period: use last known state for 48h]

    L --> P[Link to pricing.html]
    M --> Q[Link to signin.html — re-activate]
    N --> R[Link to account.html — manage devices]
    O --> K

    G --> J
```

---

## 4. Account Management Flow

```mermaid
flowchart TD
    A([account.html]) --> B{Authenticated?}

    B -->|No| C[Redirect to signin.html]
    C --> D[Sign in with email + password]
    D --> E{Auth success?}
    E -->|No| F[Show error]
    F --> D
    E -->|Yes| A

    B -->|Yes| G[Account dashboard]

    G --> H{Section}

    H -->|Plan details| I[Show current plan]
    I --> J{Plan type}
    J -->|Starter| K[Show upgrade options to Pro / Lifetime]
    J -->|Pro or Lifetime| L[Show active plan details + key]

    H -->|Manage devices| M[List active device activations]
    M --> N[Show: name, activated date, last seen]
    N --> O{Action}
    O -->|Deactivate a device| P[POST /api/deactivate]
    P --> Q[Device slot freed]
    Q --> M
    O -->|View only| M

    H -->|Licence key| R[Display masked key: XXXX-XXXX-XXXX-XXXX]
    R --> S[Copy to clipboard button]

    H -->|Delete account| T[Confirmation prompt]
    T -->|Confirmed| U[Delete account + all server-side records]
    U --> V[Redirect to landing.html]
    T -->|Cancelled| G

    K --> W[Link to pricing.html]
```

---

## 5. Bulk Add Flow (in-app)

```mermaid
flowchart TD
    A([User clicks Bulk Add]) --> B[Bulk Add modal opens]
    B --> C{Type selector}

    C -->|Expenses| D[Expense rows: name, amount, frequency, category]
    C -->|Savings| E[Savings rows: name, amount, frequency]
    C -->|Loans| F[Loan rows: name, balance, rate, min payment]

    D --> G[Validate all rows]
    E --> G
    F --> G

    G --> H{Validation}
    H -->|Errors| I[Highlight invalid fields]
    I --> D

    H -->|All valid| J[Save all to localStorage]
    J --> K[Update envelope spend totals]
    K --> L[Recalculate DTI]
    L --> M[Close modal — return to dashboard]
    M --> N([Dashboard refreshed with new data])
```

---

## 6. Google Drive Backup Flow (Pro / Lifetime)

```mermaid
flowchart TD
    A([User enables Drive backup]) --> B[Google OAuth consent screen]
    B --> C{Permission granted?}
    C -->|Denied| D[Backup disabled — data stays local only]
    C -->|Granted| E[Access token stored in localStorage]

    E --> F{Backup trigger}
    F -->|Manual: user clicks Backup Now| G[Encrypt data client-side]
    F -->|Auto: daily at app load| G

    G --> H[Derive encryption key from licence key via PBKDF2]
    H --> I[Encrypt all localStorage data with AES-GCM]
    I --> J[Upload encrypted blob to Google Drive — FincWin folder]
    J --> K{Upload success?}
    K -->|Yes| L[Update fw_last_backup timestamp]
    K -->|No| M[Show error: Backup failed — retry]

    L --> N([Backup complete])

    O([User restores from backup]) --> P[Google OAuth — grant read access]
    P --> Q[List backups from Drive folder]
    Q --> R[User selects backup to restore]
    R --> S[Download encrypted blob]
    S --> T[Prompt for licence key — used as decryption key source]
    T --> U[Decrypt with AES-GCM]
    U --> V{Decryption success?}
    V -->|Yes| W[Write all data to localStorage]
    V -->|No| X[Show error: Wrong key or corrupted backup]
    W --> Y([App loaded with restored data])
```
