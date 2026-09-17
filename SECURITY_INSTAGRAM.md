# Mingree Instagram OAuth Security & Anti-Abuse Architecture

This document describes the security model, risk evaluation engine, and anti-farming safeguards protecting Mingree's Instagram OAuth integration.

---

## 1. Core Security Guarantees & Assumptions

### 1.1 One-to-One Identity Binding (No Multi-Account Duplication)
- **Rule**: Exactly one official Instagram identity (`instagramUserId` and username issued by Meta) can be linked to exactly one Mingree creator account at any given time.
- **Enforcement**:
  - The server verifies each connection attempt against `instagram_identities.json`.
  - If an Instagram identity is already bound to a different Mingree user ID, connection is rejected with `LINK_REJECTED_DUPLICATE`.

### 1.2 Account Reclaim & Hijack Prevention
- **Rule**: If Mingree Creator A unlinks or disconnects their Instagram account, another user (Creator B) **cannot** immediately register or claim that Instagram handle.
- **Enforcement**:
  - All historical ownership bindings are recorded in `historicalMingreeUserIds`.
  - Reconnecting a previously unlinked Instagram identity requires authentication with the original Mingree account.
  - Ownership transfers across different Mingree accounts must be authorized via the Admin Security Console.

### 1.3 Anti-Farming & Rate Limiting
- **Rule**: Prevent automated scripts and click farms from rapidly generating sessions or rotating accounts.
- **Enforcement**:
  - **Rate Limit**: Maximum of 6 Instagram OAuth connection attempts per 15-minute sliding window per IP and per Mingree User ID.
  - **Churn Cooldown**: A 3-minute cooldown is enforced between unlinking and re-linking the same account to eliminate automated churn.
  - **Failure Backoff**: 3 consecutive failed or rejected attempts trigger a temporary 10–15 minute lockout.

---

## 2. Bot & Suspicious Account Detection (Risk Scoring)

The server analyzes authentic Meta Graph API v21.0 metadata (`followers_count`, `media_count`, `account_type`, `username` entropy, historical velocity) and computes a **Risk Score (0–100)**:

| Risk Score | Assessment | Action | Description |
| :--- | :--- | :--- | :--- |
| **0 – 39** | **LOW** | **Approved** | Normal creator activity. Genuine modest follower counts (500–2,000) with authentic media are passed cleanly. |
| **40 – 69** | **MEDIUM** | **Approved with Monitoring** | Minor flags (e.g. newly created business profile or low initial posts). Logged in security audit trail without blocking creator. |
| **70 – 100** | **HIGH** | **Blocked** | Severe bot signals (empty shell profile with 10k+ bought followers, automated bot username patterns, or impossible follower surge bursts). |

### Risk Factors Evaluated
1. **Empty Shell / Zero Media**:
   - `followers >= 5,000` with `0` public media posts: **+45 risk points** (classic bought-follower shell).
   - `followers >= 2,000` with `0` public media posts: **+30 risk points**.
   - Low follower counts (500–1,500) with 0–1 media: **+10 risk points** (does *not* block genuine new creators).
2. **Suspicious Automated Username Patterns**:
   - Auto-generated trailing digits (e.g. `user_92837492`): **+25 risk points**.
   - Hexadecimal / random hash username structures: **+35 risk points**.
   - Known test/bot prefixes: **+40 risk points**.
3. **Follower Burst & Velocity Anomalies**:
   - Unnatural follower surge (`>15,000` follower increase in `<6 hours`): **+35 risk points**.
4. **Frequent Disconnect Churn**:
   - Disconnecting and reconnecting `>3 times`: **+20 risk points**.

---

## 3. Decision Audit Logging

All security evaluations and decisions are logged persistently in `security_audit_logs.json` with:
- Unique Event ID & ISO Timestamp
- Mingree User ID & Instagram Username / Meta User ID
- Calculated Risk Score & Specific Triggered Flags
- Follower Count & Media Count
- Client IP Address & User-Agent
- Final Decision (`ALLOW`, `BLOCK`, or `MONITOR`)

Administrators can inspect live logs and manage account bindings directly from the **Admin Dashboard > Security Logs**.
