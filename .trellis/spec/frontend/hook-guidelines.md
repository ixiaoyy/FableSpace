# Frontend Hook Guidelines

## Current Model

There is no React Query, SWR, Redux, or general client-store layer. React
Router loaders/revalidation own route reads; route-local hooks own interaction
state; focused modules such as `lib/session.ts` own the small caches that must
survive component renders.

## Data Fetching

- Use `clientLoader` plus `useLoaderData<typeof clientLoader>()` for public
  route data. `routes/home.tsx` and `routes/story-world-character.tsx` are the
  references.
- Put the actual request in `app/lib/` and let the loader normalize the page's
  loading/error/empty result.
- Use `useRevalidator()` for an explicit loader retry.
- Protected continuity reads may run in a route callback when they depend on
  authenticated state and browser events. They still call typed `app/lib/`
  functions and must cancel/ignore obsolete generations.
- Do not add polling, background POST retry, or a new data-fetch library
  without an explicit product requirement and approval.

## Custom Hooks

Create a custom hook only when stateful behavior is reused or has a clear
provider/subscription boundary. `hooks/useTheme.tsx` is the reference:

- module constants and pure readers live outside the hook;
- external storage uses `useSyncExternalStore` with stable server/client
  snapshots;
- effects clean up listeners and DOM changes;
- provider values use stable callbacks/memoization;
- the consumer hook fails clearly outside its provider.

Keep one-off reducer/effect logic in its route until another real consumer
exists.

## Effect and Callback Rules

- Every event listener, timer, or subscription added in an effect needs cleanup.
- Guard async work with a request/version ref when route changes or session
  expiry can make responses obsolete.
- Keep dependency arrays accurate; move stable pure helpers outside the
  component instead of suppressing dependencies.
- Refs are for in-flight locks, DOM nodes, or generation tokens, not for
  hidden render state.

## Common Mistakes

- Fetching the same server state in both a loader and an uncoordinated effect.
- Using an effect to copy props into local state without a user-edit boundary.
- Omitting cleanup for storage/session events.
- Turning a single route callback into a generic hook prematurely.
- Retrying an uncertain write from an effect.
