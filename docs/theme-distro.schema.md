# theme.distro.json - schema and rules

`theme.distro.json` is the per-tenant override surface that the
superadmin console applies to a `tenants` row when it ships to that buyer
or when the buyer's `/install` runs with `--distro=path/to/file.json`.

The schema is **closed by default for the buyer-visible surface** -
new keys land in `data/studio-brand.json` if they need to ship with
the bundle, but the distro file is a deliberate per-tenant override.

## File location

  - Repo-bundled default: `data/studio-brand.json` (white-label neutral)
  - Studio demo override: `data/theme.distro.json`
  - Per-buyer: any path the operator uploads at `/superadmin/theme` or
    the buyer passes to `install.sh --distro=path/file.json`

## Required keys

| Key | Type | Required | Notes |
| --- | --- | --- | --- |
| `brand_name` | string | yes | Display name. Falls back to tenant.studio_name. Used in `<title>`, header, footer. |
| `tagline` | string | no | Single-line under the brand name in the hero. |
| `palette.ink` | hex | yes | Primary text color. Should pass WCAG AA contrast against `palette.paper`. |
| `palette.paper` | hex | yes | Primary background color. |
| `palette.accent` | hex | yes | Single accent. Caller must NOT introduce a second accent. |

## Optional keys

| Key | Type | Notes |
| --- | --- | --- |
| `palette.muted` | hex | Secondary text color. Must pass WCAG AA against `paper`. |
| `accent_mode` | `'auto'` \| `'light'` \| `'dark'` | Site accent strategy. Defaults to `'auto'` (system preference). |
| `footer_credit` | string | Replaces the built-in `Powered by Etihad Interiors Theme v1.1.0`. |
| `hero.eyebrow` | string | Small caps label above the headline. The taste-skill restricts eyebrows to max 1 per 3 sections; UI code enforces this. |
| `hero.headline` | string | Single sentence. Italic word inside the headline must be `*word*` and use a font where descender clearance is honored. |
| `hero.subtext` | string | 20-word cap enforced at submission. |
| `contact_email` | string | Replaces the studio default. |
| `contact_phone` | string | |
| `studio_address` | string | |
| `calendly_url` | string | https:// only. |
| `instagram_url` | string | https:// only. |
| `year_established` | string | Free-form. Ship digits, e.g. `"2017"`. |
| `residences_delivered` | string | Free-form, e.g. `"60+"`. |
| `default_locales` | string[] | Subset of `["en", "hi", "mr"]`. Business tier only. |
| `tier` | `'personal'` \| `'business'` | Used by the install CLI to override the choice on the install form. |
| `domain` | string | Buyer-served domain. License signs to it. |

## Forbidden keys (rejected at submit)

- `block_overrides[]` - block data must change in `/admin`, not via distro.
- `secret.*` - secrets never ship in distro. Use env.
- `hmac_key` - HMAC keys live in `tenants.hmac_key` only.
- `purchase_code` - that's a per-license field, not a theme field.
- Anything matching `/^x-/i` - reserved for future extension hooks.

## Validation rules

The schema validator (in `scripts/apply-distro.mjs`) checks:

1. JSON parses.
2. All `required` keys present.
3. `palette.*` are 6-digit hex (`/^#[0-9a-fA-F]{6}$/`).
4. `default_locales` entries are in the supported set.
5. `tier` matches the enum.
6. Any `https://` URL field passes `/^https:\/\//`.
7. `palette.ink` vs `palette.paper` and `palette.muted` vs `palette.paper` pass a basic contrast check (>= 4.5:1).
8. `hero.headline` does NOT contain em-dash characters. (CRLF + taste-skill rule.)

## How a distro lands on a tenant

```
$ node scripts/apply-distro.mjs --tenant=studio --file=./data/theme.distro.json
+ distro applied to tenant=studio (id=1)
```

Idempotent. Re-running with a different file replaces the row.

The row is read at request time by `src/lib/tenant-brand.ts`:

```ts
const brand = readBrandFor(domain, slug);
```

If the tenant row or distro row is missing, the renderer falls back to
`data/studio-brand.json`. If that is also missing, the renderer falls
back to built-in `"Your Studio"` defaults.

## Future (v1.2+)

  - `header.logo_media_id` - pull a buyer-uploaded logo from media library.
  - `custom_css_tokens` - per-tenant CSS custom properties injection.
  - `home_block_overrides[]` - per-tenant home page reorder.
