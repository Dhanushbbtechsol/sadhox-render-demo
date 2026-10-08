# Dev A — Phase 7: EndUser Incidents replaces My Portal

**Design:** [../phase7.md](../phase7.md)

- Sidebar: EndUser gets **Incidents** → `/incidents`. Remove **My Portal**.
- Route: EndUser may open `/incidents` (own rows only — server already scopes lists). `/incidents/:id` for EndUser is the current portal detail (read-only). Redirect `/portal` and `/portal/incidents/:id`.
- Report form: category + subcategory from Dev D’s map. Problems stay unreachable for EndUser.
