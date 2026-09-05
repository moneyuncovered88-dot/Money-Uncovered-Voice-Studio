# Shared contract

The frontend (TypeScript) and backend (Python) share a small set of domain
definitions — status enums, chunk statuses, output formats, and the API response
shapes. To keep the MVP simple (and avoid coupling a Python service to a JS build
step), these are **mirrored**, not code-shared:

- **TypeScript source of truth:** `apps/web/types/domain.ts` and `apps/web/types/api.ts`
- **Python source of truth:** `apps/api/app/models/enums.py` and `apps/api/app/schemas/*`

## Rule
When you change a status value, enum, or API field on one side, update the other.
The values are plain strings and are asserted in both `apps/api/tests` and the
frontend types, so drift surfaces quickly.

## Future option
If the contract grows, generate the TypeScript types from the FastAPI **OpenAPI**
schema (`/openapi.json`) as a build step, and this folder can host the generated
output. Not needed for the MVP.
