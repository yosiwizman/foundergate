# Lane H — Navigation & Panel State

The deck-style sidebar switches panels locally via simple tab state (no page reload, no backend):
Truth Dashboard · Preview · Evidence · Decisions · Ask Guide · Files · Technical view.

- Nav items are real `<button>` elements (keyboard reachable; visible focus ring).
- Active nav shows `aria-current="page"` and the deck's active style.
- Display-only / view-only tags remain visible on their nav items.
- No fake backend is involved in navigation.

Verified by Lane K: clicking a nav item shows its panel and hides the others; active state updates.
Accessibility confirmed in Lane L (axe 0 serious/critical across all panels).
