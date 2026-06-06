<!--
Reference for the design-systems skill. Sources:
- W3C Design Tokens Community Group format spec: https://design-tokens.github.io/community-group/format/
- Brad Frost, "Atomic Design" (2016): https://atomicdesign.bradfrost.com/
- Nathan Curtis, EightShapes design-system writing
- Style Dictionary (Amazon): https://amzn.github.io/style-dictionary/
-->

# Token architecture — design-systems reference

## The W3C format

The Design Tokens Community Group (DTCG) format is the emerging standard. Use it.

A token is an object with `$value`, `$type`, optional `$description`, optional `$extensions`.

```jsonc
{
  "color.background.primary": {
    "$value": "#FFFFFF",
    "$type": "color",
    "$description": "Default page background"
  }
}
```

References use brace syntax: `{path.to.token}`.

```jsonc
{
  "color.text.primary": {
    "$value": "{color.neutral.900}",
    "$type": "color"
  }
}
```

Supported `$type` values: `color`, `dimension`, `fontFamily`, `fontWeight`, `duration`, `cubicBezier`, `number`, `strokeStyle`, `border`, `transition`, `shadow`, `gradient`, `typography`.

## 3-tier structure (recommended default)

### Why 3 tiers, not 2

A 2-tier system (primitives + components) is OK at small scale but breaks at multi-theme. Aliases give you one place to swap an entire visual mode (light → dark, default → high-contrast) without touching components.

### Tier 1: Primitives

The palette + scale. Named by **what they are**, not **what they do**. Bigger numbers = more of the property (deeper color, larger spacing).

```jsonc
{
  "color": {
    "blue": {
      "50":  { "$value": "#EFF6FF", "$type": "color" },
      "100": { "$value": "#DBEAFE", "$type": "color" },
      "500": { "$value": "#3B82F6", "$type": "color" },
      "900": { "$value": "#1E3A8A", "$type": "color" }
    }
  },
  "spacing": {
    "0":  { "$value": "0",    "$type": "dimension" },
    "1":  { "$value": "4px",  "$type": "dimension" },
    "2":  { "$value": "8px",  "$type": "dimension" },
    "4":  { "$value": "16px", "$type": "dimension" },
    "8":  { "$value": "32px", "$type": "dimension" }
  },
  "fontSize": {
    "xs":  { "$value": "12px", "$type": "dimension" },
    "sm":  { "$value": "14px", "$type": "dimension" },
    "base": { "$value": "16px", "$type": "dimension" },
    "lg":  { "$value": "18px", "$type": "dimension" },
    "2xl": { "$value": "24px", "$type": "dimension" }
  }
}
```

**Rule:** primitives are not used directly in component code. ESLint rule should flag `text-blue-500` in component files (allowing only in alias definitions).

### Tier 2: Aliases (semantic)

Named by **role / intent**, not appearance. This is the layer components consume.

```jsonc
{
  "color.text.primary":    { "$value": "{color.neutral.900}", "$type": "color" },
  "color.text.secondary":  { "$value": "{color.neutral.600}", "$type": "color" },
  "color.text.disabled":   { "$value": "{color.neutral.400}", "$type": "color" },
  "color.text.inverse":    { "$value": "{color.neutral.50}",  "$type": "color" },

  "color.background.canvas":    { "$value": "{color.neutral.50}",  "$type": "color" },
  "color.background.surface":   { "$value": "{color.neutral.100}", "$type": "color" },
  "color.background.elevated":  { "$value": "{color.neutral.50}",  "$type": "color" },

  "color.border.default":  { "$value": "{color.neutral.200}", "$type": "color" },
  "color.border.focus":    { "$value": "{color.blue.500}",    "$type": "color" },

  "color.interactive.default": { "$value": "{color.blue.500}", "$type": "color" },
  "color.interactive.hover":   { "$value": "{color.blue.600}", "$type": "color" },
  "color.interactive.active":  { "$value": "{color.blue.700}", "$type": "color" }
}
```

```jsonc
{
  "spacing.inline.tight": { "$value": "{spacing.1}", "$type": "dimension" },
  "spacing.inline.cozy":  { "$value": "{spacing.2}", "$type": "dimension" },
  "spacing.inline.loose": { "$value": "{spacing.4}", "$type": "dimension" },

  "spacing.stack.tight":  { "$value": "{spacing.2}", "$type": "dimension" },
  "spacing.stack.cozy":   { "$value": "{spacing.4}", "$type": "dimension" },
  "spacing.stack.loose":  { "$value": "{spacing.8}", "$type": "dimension" }
}
```

### Tier 3: Component (sparingly)

When alias semantics don't fit, components get their own tokens. A clean DS minimizes this layer — too many component tokens defeats the alias system.

```jsonc
{
  "button.primary.background.default": { "$value": "{color.interactive.default}", "$type": "color" },
  "button.primary.background.hover":   { "$value": "{color.interactive.hover}",   "$type": "color" },
  "button.primary.background.active":  { "$value": "{color.interactive.active}",  "$type": "color" },
  "button.primary.background.disabled":{ "$value": "{color.neutral.200}",         "$type": "color" }
}
```

**Rule of thumb:** if a third component is about to need this token, promote it to alias. If only one component needs it, leave at component-level.

## Mode variants (dark mode, themes)

The clean pattern: **alias mappings change**, primitives stay constant.

```jsonc
{
  "$themes": {
    "light": {
      "color.background.canvas":  { "$value": "{color.neutral.50}",  "$type": "color" },
      "color.text.primary":       { "$value": "{color.neutral.900}", "$type": "color" }
    },
    "dark": {
      "color.background.canvas":  { "$value": "{color.neutral.900}", "$type": "color" },
      "color.text.primary":       { "$value": "{color.neutral.50}",  "$type": "color" }
    }
  }
}
```

At runtime, `data-theme="dark"` on the root flips the alias resolution. Components reference `var(--color-text-primary)` and get the correct value automatically.

## Naming conventions

### What works

- **Role-based aliases** — `text.primary`, `background.canvas`, `interactive.hover`
- **Numeric scales for primitives** — `blue.500`, `spacing.4` (predictable interpolation)
- **Component prefix for tier 3** — `button.primary.*`

### What doesn't work

- Aliases named by appearance — `color.lightGray` instead of `color.text.muted`
- Spacing tied to pixels — `spacing.16px` becomes a lie if the system rebases
- Components referencing primitives — `Button` using `color.blue.500` directly

## Multi-brand structure

If the DS supports multiple brands, the primitive layer forks:

```
tokens/
├── primitives/
│   ├── brand-a.json
│   └── brand-b.json
├── aliases.json              ← shared
└── components/
    └── button.json           ← shared
```

The build produces brand-specific bundles by combining `aliases` with the chosen `primitives` set. Aliases + components stay shared.

## Build pipeline

The tokens JSON is the source. The build emits platform-specific outputs.

**Common tool: Style Dictionary** (Amazon, free + open). Reads DTCG format, emits CSS / SCSS / JS / Swift / Kotlin / XAML / Android XML.

```js
// style-dictionary.config.js
module.exports = {
  source: ["tokens/**/*.json"],
  platforms: {
    css: { transformGroup: "css", buildPath: "build/css/",
           files: [{ destination: "tokens.css", format: "css/variables" }]},
    js:  { transformGroup: "js",  buildPath: "build/js/",
           files: [{ destination: "tokens.js",  format: "javascript/es6" }]},
  },
};
```

Output (CSS):

```css
:root {
  --color-text-primary: #18181B;
  --color-background-canvas: #FAFAFA;
  --spacing-stack-cozy: 16px;
}

[data-theme="dark"] {
  --color-text-primary: #FAFAFA;
  --color-background-canvas: #18181B;
}
```

Components consume `var(--color-text-primary)` — never the hex.

**Alternative tooling:**

- **Tokens Studio for Figma** (free + paid) — design-side authoring; exports to DTCG JSON.
- **Theo** (Salesforce) — Style Dictionary's predecessor; less maintained.
- **Custom scripts** — for small systems, a 50-line Node script reads JSON and writes CSS works fine.

## Common token-system mistakes

1. **Components reference primitives.** `bg-blue-500` in a Button component. Fix: alias the color, ESLint the rule.
2. **No `$type` declared.** Tools can't validate or transform without types. Always declare.
3. **Reference cycles.** `text.primary` → `text.dark` → `text.primary`. Style Dictionary catches these; check.
4. **Inconsistent units.** Some spacing in `px`, some in `rem`. Pick one for primitives; convert at the platform boundary.
5. **Dark mode as a re-themed component.** Each component implements its own dark variant. Should be one alias swap.
6. **No semantic versioning.** Token names + values change between releases without notice. Treat token packages as APIs: SemVer them.

## Audit checklist

When auditing existing tokens, walk this list:

- [ ] 3 tiers present (primitives / aliases / components)?
- [ ] Aliases use semantic names (intent), not appearance?
- [ ] Components reference aliases, not primitives? (ESLint enforced?)
- [ ] Dark mode is a mode variant, not duplicated components?
- [ ] DTCG format with `$value` + `$type`?
- [ ] Build pipeline (Style Dictionary or equiv) emits platform outputs?
- [ ] Tokens are SemVer'd?
- [ ] Documentation explains when to use which alias?
- [ ] Adoption tracked (% inline hex vs token-resolved)?

A "no" on any line is a finding. The first 4 are the highest-leverage to fix.
