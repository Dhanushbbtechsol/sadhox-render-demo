# Database tables and columns

Source: `apps/server/src/database/schema/index.ts` (PostgreSQL, Drizzle). Timestamps are `timestamptz`. `id` columns are UUID, generated unless noted. Diagram: [schema-diagram.md](./schema-diagram.md).

## Relationships

Enforced foreign keys. Cardinality is from the parent row to the child row. `no action` is the database default when `on delete` is omitted.

| From | To | Column | Cardinality | On delete |
| --- | --- | --- | --- | --- |
| `users` | `users` | `reports_to_id` | one manager, many reports | set null |
| `users` | `refresh_tokens` | `user_id` | one user, many tokens | cascade |
| `users` | `projects` | `manager_id` | one manager, many projects | restrict |
| `projects` | `project_members` | `project_id` | one project, many members | cascade |
| `users` | `project_members` | `user_id` | one user, many memberships | cascade |
| `projects` | `modules` | `project_id` | one project, many modules | cascade |
| `users` | `audit_log` | `actor_id` | one actor, many rows | set null |
| `users` | `incidents` | `reporter_id` | one reporter, many incidents | no action |
| `users` | `incidents` | `assigned_to` | one assignee, many incidents | set null |
| `projects` | `incidents` | `project_id` | one project, many incidents | set null |
| `modules` | `incidents` | `module_id` | one module, many incidents | set null |
| `users` | `problems` | `assigned_to` | one assignee, many problems | set null |
| `projects` | `problems` | `project_id` | one project, many problems | set null |
| `modules` | `problems` | `module_id` | one module, many problems | set null |
| `problems` | `problem_incidents` | `problem_id` | one problem, many links | cascade |
| `incidents` | `problem_incidents` | `incident_id` | one incident, one link | cascade |
| `service_catalog` | `service_requests` | `catalog_id` | one catalog item, many requests | no action |
| `users` | `service_requests` | `requester_id` | one requester, many requests | no action |
| `users` | `service_requests` | `approver_id` | one approver, many requests | set null |
| `users` | `service_requests` | `assignee_id` | one assignee, many requests | set null |
| `projects` | `service_requests` | `project_id` | one project, many requests | set null |
| `modules` | `service_requests` | `module_id` | one module, many requests | set null |
| `users` | `changes` | `created_by` | one author, many changes | set null |
| `users` | `changes` | `approved_by` | one approver, many changes | set null |
| `projects` | `changes` | `project_id` | one project, many changes | set null |
| `modules` | `changes` | `module_id` | one module, many changes | set null |
| `users` | `assets` | `owner_id` | one owner, many assets | set null |
| `assets` | `asset_assignments` | `asset_id` | one asset, many assignments | cascade |
| `users` | `asset_assignments` | `from_owner_id` | one user, many prior owners | set null |
| `users` | `asset_assignments` | `to_owner_id` | one user, many new owners | set null |
| `users` | `asset_assignments` | `assigned_by` | one user, many assignment events | set null |
| `users` | `comments` | `author_id` | one author, many comments | no action |
| `users` | `notifications` | `user_id` | one user, many notifications | cascade |
| `knowledge_categories` | `knowledge_articles` | `category_id` | one category, many articles | restrict |
| `users` | `knowledge_articles` | `author_id` | one author, many articles | restrict |
| `knowledge_articles` | `ticket_knowledge_links` | `article_id` | one article, many links | cascade |

`problem_incidents` is the only many-to-many join. `incident_id` is unique, so each incident belongs to at most one problem, and a problem can group many incidents. `project_members` is a composite primary key of `project_id` and `user_id`.

Shared shape on ticket tables: `incidents`, `problems`, `service_requests`, and `changes` each point at `projects` and `modules`. `incidents.priority` uses the same `priority_level` enum as `sla_rules.priority` (unique) and `escalation_rules.priority` (primary key). Those two rule tables have no foreign key.

Columns that correlate by convention and are not foreign keys:

| Column | Correlates to |
| --- | --- |
| `comments.ticket_id` + `comments.ticket_type` | `incidents`, `problems`, `service_requests`, or `changes`, chosen by `ticket_type` (`incident`, `problem`, `service_request`, `change`) |
| `ticket_knowledge_links.ticket_id` + `ticket_knowledge_links.ticket_type` | same four ticket tables, plus `knowledge_articles` via `article_id` |
| `assets.linked_ticket_id` | a ticket id with no `ticket_type` and no foreign key |
| `audit_log.entity_id` + `audit_log.entity_type` | the row named by `entity_type` |

## Enums

| Enum | Values |
| --- | --- |
| `user_role` | Admin, Agent, EndUser, Manager |
| `incident_status` | New, Assigned, InProgress, Resolved, Closed |
| `priority_level` | P1, P2, P3, P4 |
| `impact_urgency` | High, Medium, Low |
| `problem_status` | Open, Investigating, KnownError, Resolved, Closed |
| `request_status` | Draft, Submitted, PendingApproval, Approved, Rejected, InFulfillment, Fulfilled, Closed |
| `request_urgency` | Low, Medium, High |
| `change_type` | Standard, Normal, Emergency |
| `change_status` | Draft, PendingApproval, Submitted, Approved, Scheduled, Implementing, Implemented, Completed, Closed, Failed, RolledBack, Cancelled |
| `asset_type` | Hardware, Software |
| `asset_status` | Active, InRepair, Retired |
| `ticket_type` | incident, problem, service_request, change |
| `knowledge_article_status` | Draft, Published |

## users

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| `id` | uuid | no | primary key |
| `email` | varchar(255) | no | unique |
| `password_hash` | varchar(255) | no | |
| `role` | user_role | no | default EndUser |
| `name` | varchar(255) | no | |
| `reports_to_id` | uuid | yes | FK `users.id`, on delete set null |
| `created_at` | timestamptz | no | default now |
| `updated_at` | timestamptz | no | default now |

## refresh_tokens

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| `id` | uuid | no | primary key |
| `user_id` | uuid | no | FK `users.id`, on delete cascade |
| `token_hash` | varchar(255) | no | |
| `expires_at` | timestamptz | no | |
| `revoked` | boolean | no | default false |
| `created_at` | timestamptz | no | default now |

## projects

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| `id` | uuid | no | primary key |
| `name` | varchar(255) | no | |
| `manager_id` | uuid | no | FK `users.id`, on delete restrict |
| `created_at` | timestamptz | no | default now |

## project_members

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| `project_id` | uuid | no | PK, FK `projects.id`, on delete cascade |
| `user_id` | uuid | no | PK, FK `users.id`, on delete cascade |

## modules

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| `id` | uuid | no | primary key |
| `project_id` | uuid | no | FK `projects.id`, on delete cascade |
| `name` | varchar(255) | no | |

## audit_log

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| `id` | uuid | no | primary key |
| `actor_id` | uuid | yes | FK `users.id`, on delete set null |
| `action` | varchar(128) | no | |
| `entity_type` | varchar(64) | no | |
| `entity_id` | uuid | yes | no foreign key |
| `diff` | jsonb | yes | |
| `created_at` | timestamptz | no | default now |

## incident_categories

Admin-managed ticket category taxonomy (2026-10-13). Seeded from the Phase 7 name map; runtime CRUD via Admin Categories.

| Column | Type | Notes |
|--------|------|--------|
| id | uuid PK | |
| name | varchar(64) unique | e.g. Hardware |
| is_active | boolean | |
| created_at / updated_at | timestamptz | |

## incident_subcategories

| Column | Type | Notes |
|--------|------|--------|
| id | uuid PK | |
| category_id | uuid FK → incident_categories | cascade delete |
| name | varchar(128) | unique per category |
| min_priority | priority_level nullable | floor on ticket create/update; drives Response time via `sla_rules` |
| is_active | boolean | |
| created_at / updated_at | timestamptz | |

## incidents

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| `id` | uuid | no | primary key |
| `title` | varchar(255) | no | |
| `description` | text | no | |
| `category` | varchar(64) | no | default Other |
| `subcategory` | varchar(128) | no | default Other |
| `priority` | priority_level | no | default P3 |
| `impact` | impact_urgency | no | default Medium |
| `urgency` | impact_urgency | no | default Medium |
| `status` | incident_status | no | default New |
| `assigned_to` | uuid | yes | FK `users.id`, on delete set null |
| `reporter_id` | uuid | no | FK `users.id` |
| `project_id` | uuid | yes | FK `projects.id`, on delete set null |
| `module_id` | uuid | yes | FK `modules.id`, on delete set null |
| `sla_due_at` | timestamptz | yes | |
| `sla_breached` | boolean | no | default false |
| `sla_warned` | boolean | no | default false |
| `resolution_notes` | text | yes | |
| `resolved_at` | timestamptz | yes | |
| `closed_at` | timestamptz | yes | |
| `created_at` | timestamptz | no | default now |
| `updated_at` | timestamptz | no | default now |

## problems

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| `id` | uuid | no | primary key |
| `title` | varchar(255) | no | |
| `description` | text | no | |
| `root_cause` | text | yes | |
| `known_error` | boolean | no | default false |
| `status` | problem_status | no | default Open |
| `assigned_to` | uuid | yes | FK `users.id`, on delete set null |
| `project_id` | uuid | yes | FK `projects.id`, on delete set null |
| `module_id` | uuid | yes | FK `modules.id`, on delete set null |
| `created_at` | timestamptz | no | default now |
| `updated_at` | timestamptz | no | default now |

## problem_incidents

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| `problem_id` | uuid | no | PK, FK `problems.id`, on delete cascade |
| `incident_id` | uuid | no | PK, unique, FK `incidents.id`, on delete cascade |
| `created_at` | timestamptz | no | default now |

## service_catalog

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| `id` | uuid | no | primary key |
| `name` | varchar(255) | no | |
| `description` | text | no | |
| `department` | varchar(128) | no | |
| `subcategory` | varchar(128) | yes | |
| `form_fields` | jsonb | no | default `[]` |
| `is_active` | boolean | no | default true |
| `created_at` | timestamptz | no | default now |
| `updated_at` | timestamptz | no | default now |

## service_requests

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| `id` | uuid | no | primary key |
| `catalog_id` | uuid | no | FK `service_catalog.id` |
| `requester_id` | uuid | no | FK `users.id` |
| `approver_id` | uuid | yes | FK `users.id`, on delete set null |
| `title` | varchar(255) | no | |
| `description` | text | yes | |
| `justification` | text | no | default empty string |
| `urgency` | request_urgency | no | default Medium |
| `fields` | jsonb | no | default `{}` |
| `status` | request_status | no | default Draft |
| `assignee_id` | uuid | yes | FK `users.id`, on delete set null |
| `approved_at` | timestamptz | yes | |
| `rejection_reason` | text | yes | |
| `fulfillment_notes` | text | yes | |
| `fulfilled_at` | timestamptz | yes | |
| `project_id` | uuid | yes | FK `projects.id`, on delete set null |
| `module_id` | uuid | yes | FK `modules.id`, on delete set null |
| `created_at` | timestamptz | no | default now |
| `updated_at` | timestamptz | no | default now |

## changes

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| `id` | uuid | no | primary key |
| `title` | varchar(255) | no | |
| `description` | text | yes | |
| `type` | change_type | no | default Normal |
| `scheduled_start` | timestamptz | yes | |
| `scheduled_end` | timestamptz | yes | |
| `rollback_plan` | text | yes | |
| `status` | change_status | no | default Draft |
| `created_by` | uuid | yes | FK `users.id`, on delete set null |
| `approved_by` | uuid | yes | FK `users.id`, on delete set null |
| `approved_at` | timestamptz | yes | |
| `project_id` | uuid | yes | FK `projects.id`, on delete set null |
| `module_id` | uuid | yes | FK `modules.id`, on delete set null |
| `created_at` | timestamptz | no | default now |
| `updated_at` | timestamptz | no | default now |

## assets

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| `id` | uuid | no | primary key |
| `asset_tag` | varchar(64) | no | unique |
| `name` | varchar(255) | no | |
| `type` | asset_type | no | |
| `owner_id` | uuid | yes | FK `users.id`, on delete set null |
| `status` | asset_status | no | default Active |
| `purchase_cost` | numeric(12,2) | yes | |
| `linked_ticket_id` | uuid | yes | no foreign key |
| `serial_number` | varchar(128) | yes | |
| `location` | varchar(128) | yes | |
| `assigned_at` | timestamptz | yes | |
| `created_at` | timestamptz | no | default now |
| `updated_at` | timestamptz | no | default now |

## asset_assignments

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| `id` | uuid | no | primary key |
| `asset_id` | uuid | no | FK `assets.id`, on delete cascade |
| `from_owner_id` | uuid | yes | FK `users.id`, on delete set null |
| `to_owner_id` | uuid | yes | FK `users.id`, on delete set null |
| `assigned_by` | uuid | yes | FK `users.id`, on delete set null |
| `note` | varchar(500) | yes | |
| `created_at` | timestamptz | no | default now |

## comments

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| `id` | uuid | no | primary key |
| `ticket_id` | uuid | no | no foreign key |
| `ticket_type` | ticket_type | no | |
| `author_id` | uuid | no | FK `users.id` |
| `content` | text | no | |
| `deleted_at` | timestamptz | yes | |
| `created_at` | timestamptz | no | default now |

## sla_rules

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| `id` | uuid | no | primary key |
| `priority` | priority_level | no | unique |
| `response_minutes` | integer | no | |
| `resolve_minutes` | integer | no | |
| `created_at` | timestamptz | no | default now |

## escalation_rules

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| `priority` | priority_level | no | primary key |
| `notify_manager` | boolean | no | default true |
| `notify_admin` | boolean | no | default false |

## notifications

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| `id` | uuid | no | primary key |
| `user_id` | uuid | no | FK `users.id`, on delete cascade |
| `type` | varchar(64) | no | |
| `title` | varchar(255) | no | |
| `body` | text | yes | |
| `href` | varchar(512) | yes | |
| `read_at` | timestamptz | yes | |
| `created_at` | timestamptz | no | default now |

## knowledge_categories

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| `id` | uuid | no | primary key |
| `name` | varchar(255) | no | |
| `slug` | varchar(255) | no | unique |
| `description` | text | yes | |
| `created_at` | timestamptz | no | default now |
| `updated_at` | timestamptz | no | default now |

## knowledge_articles

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| `id` | uuid | no | primary key |
| `title` | varchar(255) | no | |
| `slug` | varchar(255) | no | unique |
| `body` | text | no | |
| `status` | knowledge_article_status | no | default Draft |
| `category_id` | uuid | no | FK `knowledge_categories.id`, on delete restrict |
| `author_id` | uuid | no | FK `users.id`, on delete restrict |
| `created_at` | timestamptz | no | default now |
| `updated_at` | timestamptz | no | default now |

## ticket_knowledge_links

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| `id` | uuid | no | primary key |
| `ticket_id` | uuid | no | no foreign key |
| `ticket_type` | ticket_type | no | unique with `ticket_id` and `article_id` |
| `article_id` | uuid | no | FK `knowledge_articles.id`, on delete cascade |
| `created_at` | timestamptz | no | default now |
