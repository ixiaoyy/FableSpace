# Engagement UI Boundary

> Frontend contract for space-local soft currency, gift, and bonus-voucher UI.

## Scope / Trigger

Use this when changing:

- `frontend/app/lib/engagement.ts`
- `frontend/app/components/SpaceEngagementPanel.tsx`
- `frontend/app/components/GiftPanel.tsx`
- `frontend/app/components/BonusDrawCTA.tsx`
- `frontend/app/components/EngagementHUD.tsx`
- `frontend/app/routes/space.tsx`
- `frontend/scripts/engagement-panel-test.mjs`
- `frontend/scripts/playwright-engagement-panel-check.mjs`

This boundary is visitor-facing UI only. It must not introduce:

- platform wallet language
- recharge / settlement / transfer UI
- public visitor-to-visitor social gifting
- backend field assumptions that are not documented in `docs/WORLD_SCHEMA.md`

## Service Signatures

```ts
getVisitorEngagement(spaceId: string, userId?: string) -> Promise<VisitorEngagement>
getEngagementConfig(spaceId: string, userId?: string) -> Promise<EngagementConfig>
claimEngagementReward(spaceId: string, sessionId: string, userId?: string) -> Promise<EarnCoinsResult>
sendGift(spaceId: string, characterId: string, giftId: string, userId?: string) -> Promise<SendGiftResult>
redeemVoucher(spaceId: string, userId?: string) -> Promise<RedeemVoucherResult>
```

`userId` must be forwarded through `jsonInit(..., userId)` / `readApiJson(..., { userId })`, or backend identity checks on `/me`, `/send`, and `/redeem` will fail.

## Normalization Contract

Backend gift catalog may return:

```json
{ "id": "warm_tea", "name": "一杯热茶", "icon": "🍵", "price": 10 }
```

Frontend must normalize this to:

```ts
{
  id: "warm_tea",
  name: "一杯热茶",
  description: "店主确认的空间礼物。",
  price: 10,
  affinity_delta: 0,
  cooldown_hours: 0,
  emoji: "🍵"
}
```

Rules:

- prefer `emoji`
- fallback to backend `icon`
- if backend omits description, use a safe owner-confirmed fallback copy

## Route/UI Contract

### Space route placement

`frontend/app/routes/space.tsx` must mount `SpaceEngagementPanel` inside the folded public sidecar area, not inside the core chat composer.

Current contract:

```tsx
<SpaceChatWorkbench
  publicPanel={
    <div className="space-y-4">
      <SpecialSpaceTypeCard space={space} />
      <SpaceEngagementPanel space={space} currentUserId={currentUserId} />
      <SpaceShareCard space={space} />
      ...
    </div>
  }
/>
```

The workbench wraps this under the `DetailSection` titled `更多空间功能`, so Playwright/UI checks must expand that details section before expecting engagement content to be visible.

### Panel content

`SpaceEngagementPanel` must show:

- current space-local balance
- today earned amount
- voucher count
- gift target selector using space characters
- clear copy that currency is space-local, non-recharge, non-transferable

If there are no characters, show a fallback empty-state message instead of crashing.

### Gift panel

`GiftPanel` must:

- fetch config using the same `userId`
- show normalized gift catalog items
- use `coinLabel` in insufficient-balance copy
- re-trigger parent refresh after a successful send

### Voucher CTA

`BonusDrawCTA` must:

- use the same `userId`
- show disabled/insufficient states without crashing
- re-trigger parent refresh after successful redeem

## Validation & Error Matrix

| Case | Expected |
| --- | --- |
| Backend returns `icon` instead of `emoji` | UI still shows gift icon |
| No `description` from backend | fallback description is shown |
| `userId` omitted on `/engagement/me` | backend rejects; service call must support explicit `userId` |
| Space has no characters | panel shows no-NPC fallback |
| Public detail section is collapsed | panel exists under `更多空间功能`; Playwright expands first |
| Gift sent successfully | result message shown and parent progress refresh runs |
| Voucher redeemed successfully | result message shown and parent progress refresh runs |
| Narrow/mobile viewport | no obvious horizontal overflow |

## Good / Base / Bad Cases

Good:

- Visitor opens a space, expands `更多空间功能`, sees balance + gift + voucher sections, and can target an NPC.
- Mocked backend returns `icon`, and the UI still renders the correct emoji.

Base:

- The panel loads with default coin label `纪念币` while data is still syncing.

Bad:

- Calling engagement endpoints without forwarding `userId`.
- Treating engagement currency like a platform wallet or paid recharge.
- Hardcoding gift fields so backend `icon` payloads render blank.
- Writing Playwright assertions against folded content without expanding the detail section first.

## Tests Required

```powershell
node .\frontend\scripts\engagement-panel-test.mjs
npm --prefix .\frontend run typecheck
npm --prefix .\frontend run build
node .\frontend\scripts\playwright-engagement-panel-check.mjs
```

Playwright must emit:

- `D:\work\ai-\.trellis\tasks\05-06-space-soft-currency-gifts-design\artifacts\playwright\desktop-engagement-panel.png`
- `D:\work\ai-\.trellis\tasks\05-06-space-soft-currency-gifts-design\artifacts\playwright\mobile-engagement-panel.png`
- `D:\work\ai-\.trellis\tasks\05-06-space-soft-currency-gifts-design\artifacts\playwright\report.md`
