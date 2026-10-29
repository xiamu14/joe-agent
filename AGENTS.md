## Code organization

- Keep every code file under 500 lines. Aim for 200 lines or fewer; as a file approaches 200 lines, extract cohesive responsibilities into separate files and reuse them where appropriate.

## FIX Bug
Fix a bug at its cause, reasoning from first principles and established best practice. Do not patch over the symptom

## IDs

- Prefer the secure default `nanoid()` for all application-generated IDs. Generate once and reuse across persistence, retries, and rendering. Use another format only when required by an external protocol, ordered cursor, deterministic identity, or compatibility constraint; document the reason.
- Preserve existing IDs during migrations. Update validators and readers before changing generators; accept legacy IDs while their records remain supported.

## File Naming

- Use names that describe a feature or responsibility. Avoid project codenames and brand names for generic files, classes, variables, and log tags.

## UI Rules
Avoid unnecessary secondary labels and descriptions. Let the layout do the explaining.

Like a master of Apple-style copywriting. Following the principles of *Don’t Make Me Think* and *The Non-Designer’s Design Book*, rewrite all menu labels and feature copy in my admin dashboard. Make everything instantly understandable, use everyday language, and avoid jargon. Keep names to 2–4 Chinese characters and descriptions to no more than 20 Chinese characters. Don’t change any functionality. Ask me first if anything is unclear.

## Code Rules
Must use RareUI components (https://www.rareui.com/). Reuse components in `web/src/components/rare-ui/`; don't replace UI controls with raw HTML equivalents (e.g. form, checkbox, alert).
Must use Tailwind css, don't use css file.

## Style Rules
Don't use multiple borders.
Never use inset shadows (including inset highlights).
Use a compact layout.

## Animation Rules
Use Motion library to build smooth animation for every ux.

## DEBUG
