# Plan de rediseño universitario

Spec: `docs/university-ui-spec.md`.

## Global Constraints

Existing profile, save, rejected-evidence, lifecycle, update and security contracts remain unchanged. No server, dependencies, telemetry, fake data or external fonts. Public code/installers and release publication are already authorized. Root is the only committer. Work in the existing feature checkout. Do not read or operate old outputs/ABRIR ACADEMIA.html, run blocked updater-download probe, or retry deletion of prior denied directories. Do not start actual VM/containers as part of UI checks.

## Task 1: Sistema visual universitario

Own only new `src/renderer/campus-design.css`. Read the spec first. Implement the complete coherent blue/burgundy university design across the static shell, new CampusUI class contract and existing hub classes. Use valid defined theme tokens, polished light/dark/high-contrast variants, consistent sans UI and editorial heading hierarchy, cards, forms, buttons, details, badges, tables, warnings, readable content. Responsive drawer breakpoint 1023 CSS px; app integration owns behavior. Ensure focus mode, reduced motion, text sizes, spacing, print and [hidden] remain correct. Avoid overly broad rules that hide hub content or override semantic status. Coordinate new CSS classes with Task 2. Pure visual work needs meaningful native verification, not CSS string mirror tests. Self-review and report to this plan workspace/task-1-report.md. No commit, no subagents.

## Task 2: Navegación, inicio y aula

Own `src/renderer/campus-ui.js`, `src/renderer/app.js`, `src/renderer/index.html`, and new focused `tests/campus-ui.test.cjs`. Read spec first. Write and run failing behavioral tests before implementing new navigation/presentation behavior. Implement classic university iconography, grouped navigation preserving all 25 destinations plus aliases, session disclosure state, real current location, real dashboard data, differentiated launch areas, course cards and classroom index/context. Integrate using existing render/openLesson/navigate flows, without changing persistence and other native/business contracts. Link CSS last and CampusUI script before app.js. Provide menu close/scrim/Escape/focus-return with no offscreen tab stops, responsive 1023 breakpoint and focus preference compatibility. Coordinate shared classes with Task 1. Dashboard must avoid duplicated primary resume panels. Do not delete existing rich content or direct links. Run focused app-renderer/professional/search and new tests; report commands, counts and red-green proof to workspace/task-2-report.md. No commit, no subagents.

## Task 3: Integración, evaluación y entrega

Root integrates first two tasks and independently reviews their diffs against spec, runs appropriate full tests and native accessibility/layout/keyboard checks across representative app routes and preferences, fixes only observed defects, and obtains independent whole-branch review. Add concise user guide and verification evidence document. Use GitHub PR/CI/release workflow already authorized, verify resulting release and installers then place final versioned installer in outputs with a short Spanish start guide. Preserve all existing outputs. Final report clearly states changes, verification, access to updated app and any material limitation.
