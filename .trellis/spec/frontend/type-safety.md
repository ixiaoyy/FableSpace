# Frontend Type Safety

## Compiler Reality

`apps/web/tsconfig.json` uses TypeScript with `isolatedModules`,
`moduleResolution: "Bundler"`, and `noEmit`; `strict` is currently `false`.
Do not claim strict mode coverage. New code should still use precise boundary
types and avoid widening the existing legacy `any` debt.

## Type Ownership

- Define API response/request types beside their client in `app/lib/`.
  `lib/story-worlds.ts` and `lib/admin-content.ts` are the references.
- Route-only loader/action types stay in the route module.
- Reusable component props may export a named type; one-use props are commonly
  typed inline.
- Import types with `import type` when no runtime value is required.
- Do not add a Character Schema field just to satisfy frontend routing. Stable
  route metadata belongs in `lib/character-routes.ts`.

## Boundary Patterns

- Use `satisfies` to check registries/configuration without losing literal
  inference:

  ```ts
  export const CHARACTER_ROUTES = [...] as const satisfies readonly CharacterRoute[]
  ```

- Use discriminated unions for closed states and action types, as in
  `StoryAccessState` and `StoryPageAction`.
- Use `Record<Union, Value>` for exhaustive label/projection maps.
- Use `unknown` for parsed/untrusted payloads and narrow before property access.
- Centralize API-envelope narrowing in `lib/api-client.ts`; feature components
  must not cast raw fetch results.

There is no Zod or other frontend runtime schema library. Runtime checks are
focused at existing boundaries: API envelope shape, route registry lookup,
query values against fetched PlayerRoles, image payload normalization, and
admin field parsing.

## Assertions

Type assertions are acceptable only after a nearby structural check or for a
closed `Object.keys` projection. Do not use `as any`, double assertions, or
non-null assertions to bypass a contract.

The index-signature `any` boundary from the old Space client has been removed.
Do not recreate it in StoryWorld clients or homepage projections.

## Contract Sync

Frontend unions and field optionality must match `docs/WORLD_SCHEMA.md` and the
actual API projection. Do not invent fields, relax enums, expose `player_id`,
or render internal `affinity`.

Run `npm --prefix .\apps\web run typecheck` for every type or API-client change.
