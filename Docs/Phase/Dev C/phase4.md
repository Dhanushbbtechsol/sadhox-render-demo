# Dev C — Phase 4: QA, Security Pass & Deploy (Week 4 / Days 16–20)

**Goal:** Security audits, chart performance tuning, cross-browser validation, and production go-live.

---

- **Day 16: Cross-Module QA Walkthrough**
  - Create asset → Link asset to an incident created by Dev A → Change asset status → Verify mutation logged in Audit Log viewer → Verify asset link visible on incident.
  - Verify email notifications sent via Resend render cleanly across email clients (Gmail, Outlook).

- **Day 17: Security Audit & Route Protection**
  - Validate that `@Roles('Admin')` strictly prevents non-admins from triggering asset deletions or accessing financial asset data.
  - Verify SQL query safety against SQL injection on dynamic search and filter inputs.

- **Day 18: Performance Tuning & Polish**
  - Ensure dashboard queries respond within < 200ms by validating indexes on foreign keys and status columns in PostgreSQL.
  - Mobile responsiveness review for Admin tablet view.

- **Day 19: Staging Seed Data Validation**
  - Populate staging database with 100+ assets and historical ticket logs to ensure dashboard charts display realistic, aesthetic distributions.

- **Day 20: Production Go-Live**
  - Verify production Admin Dashboard metrics and Asset Register on Vercel connected to Railway/Render.
  - Hand over verified system metrics to stakeholders. **🚀 Shipped.**

---

## Interfaces & Dependencies

| Dependency | Provider | Requirement |
|---|---|---|
| `/auth/*` & `@Roles('Admin')` | Dev D | Required to protect `/admin/*` and write operations on `/assets`. |
| `audit_log` Table | Dev D | Data source for the Admin Audit Log viewer. |
| `MailService` Queue | Dev D | Consumes Dev C's HTML email templates for background dispatch. |
| Incidents & Requests | Devs A & B | Foreign keys for asset-ticket associations and aggregate counts. |

---

**← Previous:** [Phase 3](file:///d:/Projects/Sadhox/Docs/Phase/Dev%20C/phase3.md)
