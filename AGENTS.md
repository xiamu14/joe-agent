## Code organization

- Keep every code file under 500 lines. Aim for 200 lines or fewer; as a file approaches 200 lines, extract cohesive responsibilities into separate files and reuse them where appropriate.

## FIX Bug
Fix a bug at its cause, reasoning from first principles and established best practice. Do not patch over the symptom

## File Naming

- Use names that describe a feature or responsibility. Avoid project codenames and brand names for generic files, classes, variables, and log tags.

## UI Rules
Avoid unnecessary secondary labels and descriptions. Let the layout do the explaining.

Like a master of Apple-style copywriting. Following the principles of *Don’t Make Me Think* and *The Non-Designer’s Design Book*, rewrite all menu labels and feature copy in my admin dashboard. Make everything instantly understandable, use everyday language, and avoid jargon. Keep names to 2–4 Chinese characters and descriptions to no more than 20 Chinese characters. Don’t change any functionality. Ask me first if anything is unclear.

## Code Rules
Must use BoardUI component, don't use any html component(ep. form, checkbox, alert).
Must use Tailwind css, don't use css file.

## Style Rules
Don't use multiple borders.
Never use inset shadows (including inset highlights).
Use a compact layout.

## Animation Rules
Use Motion library to build smooth animation for every ux.

## DEBUG
