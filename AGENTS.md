<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This project uses a newer Next.js version with breaking changes.
Before implementing framework-specific code:
- Read relevant docs in `node_modules/next/dist/docs/`
- Check for deprecated APIs
- Do not assume older App Router conventions still apply
<!-- END:nextjs-agent-rules -->

# Package Manager

- Use `pnpm`
- Use `pnpm prisma` instead of `npx prisma`

# Type Safety

- Never use `any`
- Reuse Prisma model types from `@prisma/client`
- Reuse payload types from validation schemas in `@/validation`
- Do not redefine existing data structures

# Validation

API routes must:
- use zod `safeParse`
- return `400` on validation failure
- never trust client-provided IDs

# Shadcn

- Use shadcn components for UI consistency
- Use `pnpm add @shadcn/ui component-name` to install

# Query Keys

- Use `QUERY_KEYS` from `constants/query-keys.ts`
- Never hardcode react-query keys
- Query key params must use object arguments

# Soft Delete

If a model has `deletedAt`:
- all queries must exclude soft-deleted records unless explicitly requested
- create operations must set `deletedAt: null`

# Next.js Structure

When creating pages:
- `page.tsx` must remain a server component
- export simple metadata with just a title
- render a separate client page component for interactive logic

# Forms

Large forms should:
- use `grid-cols-2` on desktop
- use `max-w-3xl`
<SelectValue /> component shows value key from the option, should show label instead via `projectTypes.find((pt) => pt.id === field.value)?.name`

# Preferred Patterns

- Prefer existing patterns over introducing new abstractions
- Follow nearby module conventions before creating new structure
- Prefer feature-local utilities/hooks over global abstractions
- Prefer explicit readable code over clever abstractions

# Avoid

- using em-dashes (—), use regular dashes (-) instead
- premature abstractions
- duplicate schema/type definitions
- hardcoded query keys
- client-heavy page.tsx files

# Reference Implementations

Use these files as canonical patterns:
- Query usage: `constants/query-keys.ts`
- Form structure: `features/projects/components/project-form.tsx`
- Schema validation: `validation/project.ts`

# API Routes

- Use `NextResponse` for all API responses
- Handle errors with try/catch and return appropriate status codes