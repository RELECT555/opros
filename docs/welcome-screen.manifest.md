# Welcome screen change manifest

## Ownership and reuse

Повторная проверка, исправления, применение скиллов и ограничения: `docs/welcome-screen-review.md`.

- Page: existing `SurveyPage` loads questions and composes `WelcomeScreen`; it supplies real topic titles.
- Feature: `WelcomeScreen` selects classic or canvas presentation. Extracted `WelcomeCanvasBlock`, `WelcomeCanvasBlockEditor`, `welcomeCanvasLayout` and `useWelcomeCanvasGestures` retain existing canvas behavior.
- Component: `WelcomeIntro` owns public welcome presentation and the start interaction, with no fetching or authentication logic.
- Feature: `SurveyFormEntry` owns focus on the first question after welcome exits and the narrow-screen form toolbar wrap. Welcome no longer queries form DOM or uses a focus timer.
- Tokens: `survey/src/ui/tokens.css`; styling uses the existing plain CSS approach. Existing survey theme remains the color input.
- Import search found decorative components but no reusable Button/Card primitive in this repository. The CTA is a native button; the outline is semantic `aside`/`ol`. No additional UI package was required. No dependency changes.
- Fixtures: `survey/src/fixtures/welcomeSurvey.ts`, dynamically imported only by the explicit local fixture path. Never embedded in a page/component.

## Skills applied and scope

Applied: ui-skills-root, ui-ux-pro-max, design-system, ui-styling, shadcn, accessibility, fixing-accessibility, make-interfaces-feel-better, frontend-design, design-taste-frontend, clean, minimal, professional, corporate, sleek, spacious, contemporary, 21st-ui-review, 21st-ui-build, vercel-react-best-practices, vercel-composition-patterns, best-practices, performance, core-web-vitals, mobile-native.

Follow-up: fixing-motion-performance used for retaining the existing Three.js animation and fixing static-frame repaint after viewport resize. Restored full dotted-wave opacity; replaced gray text-mixed background with an accent-mixed background following user feedback.

Actual in-app browser inspection confirmed `prefers-reduced-motion: reduce`, explaining the static wave in the user's window. Added `BackgroundMotionToggle` and shared `useBackgroundMotion` subscription: explicit local on/off choice overrides the OS preference for the background only. No saved choice preserves the system default. The control is keyboard-accessible, pressed-state announced, and at least 44px high. Other Motion transitions still honor the OS preference.

The common guidance used here is theme-derived tokens, semantic composition, readable typography, limited decoration, responsive layout, keyboard focus, touch targets and reduced motion. Style preset palettes and fonts were not substituted for the product's existing identity. There is no new data fetching or global state.

Not applied: ask-sonner (no toast changes); pick-ui-library (no library selection required). No broad framework/library migration, performance benchmark or device-hardware acceptance is implied.

Tool limits: 21st search required an authenticated CLI session and could not run; deterministic `21st review` was available. The UI Skills CLI category inventory was available; the local UI/UX Python search could not run because Python was unavailable. Local skill guidance was used instead. Context7 Motion documentation was checked for reduced motion.

## Local QA route

From `survey`, run PowerShell:

```powershell
$env:VITE_ENABLE_UI_FIXTURES='true'
npm run dev -- --host 127.0.0.1 --port 5175 --strictPort
```

Open `http://127.0.0.1:5175/s/__preview_crm`. All of DEV build, explicit flag, loopback hostname and reserved slug are required. Fixture submission throws before any request. Regular surveys use the real API; no database rows or auth state are modified.

## States and checks

- CTA: default, pointer hover, active, visible keyboard focus and disabled styling; no request is made by Start, so loading/error states belong to the existing page/form. No new overlays.
- Desktop and phone: shared grid, stacked outline, full-width mobile CTA, balanced heading and scrolling content. UIMax also captures tablet.
- The real `/crm` API was unavailable (`Failed to fetch`); visual/interaction acceptance uses the local fixture. Production API submission and authenticated canvas editing are not accepted by this change.
- Full lint reports 17 existing errors, including state-in-effect/ref rules in administration/editor code and SurveyPage. Targeted lint is used to isolate the new components. Build has the existing large-chunk warning.
- Automated a11y checks do not establish screen-reader or real-device acceptance.
