---
name: react-icons v5 icon name changes
description: Several Si icons were removed or renamed in react-icons v5; this file lists the known missing ones and their replacements used in PerformanceOS AI.
---

## Rule
Always verify a `Si*` export exists before using it. react-icons v5 removed many brand icons.

**Why:** The project uses react-icons@5.6.0. In v5, `SiLinkedin` and `SiMicrosoftbing` no longer exist as named exports in `react-icons/si`. Using them causes a Vite runtime error: "does not provide an export named 'SiXxx'".

**How to apply:** Before adding any `Si*` icon, check it exists:
```js
node --input-type=module -e "
import { readFileSync } from 'fs';
const c = readFileSync('artifacts/performance-os/node_modules/react-icons/si/index.mjs','utf8');
const e = [...c.matchAll(/export function (Si\w+)/g)].map(m=>m[1]);
console.log(e.filter(x => /yourterm/i.test(x)).join(', '));
"
```

## Known replacements (PerformanceOS AI)
| Wanted | Use instead |
|--------|-------------|
| `SiLinkedin` | `Linkedin` from `lucide-react` |
| `SiMicrosoftbing` | `Globe` from `lucide-react` |

## Icons confirmed to exist in react-icons v5 (for this project)
- `SiGoogleads`
- `SiMeta`
- `SiGoogleanalytics`
- `SiGoogletagmanager`
- `SiGooglesearchconsole`
