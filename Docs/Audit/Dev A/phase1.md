# Security Audit: Dev A (Phase 1)

## Low / Hardening
### [A07] Missing actual API integration — apps/web/src/lib/mocks/service-catalog.ts
The service catalog is currently using mock data. While secure for now, ensure that when this connects to the real NestJS API, the endpoints enforce access controls (e.g., only authorized users can request items).
