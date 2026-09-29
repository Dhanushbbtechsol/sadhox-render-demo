# System Patterns

- **Architecture Authority**: The architecture is managed by `better-fullstack`. The `bts.jsonc` file is the source of truth for the stack. Do not bypass the generator for core architectural changes.
- **Frontend**: React with Vite. Uses Shadcn UI for components and Tailwind CSS for styling. State is managed via Zustand.
- **Backend**: NestJS for routing and dependency injection.
- **Monorepo Structure**: 
  - `apps/web`: Frontend React application.
  - `apps/server`: NestJS backend.
  - `packages/db`: Drizzle ORM and Postgres schemas.
- **Ponytail Rule**: Favor simple, boring code. Avoid over-engineering. Write the least amount of code to solve the problem.
