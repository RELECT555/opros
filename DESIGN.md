# Survey welcome

The public survey welcome uses the configured survey colors and the existing Askly mark. Its job is to explain the survey and make starting it easy.

- `survey/src/ui/tokens.css` owns the welcome roles. Derive backgrounds, text and borders from the survey theme; use the configured accent for the primary action. The lighter welcome background is intentional user feedback, not a change to the question form theme.
- Header, content and footer share a 1120px grid. A two-column introduction and real question outline become one column below 900px. The primary action precedes the outline on phones.
- Use one primary action, a clear heading and short body copy. No decorative status dots, added gradients, glows, or claims about security. Keep configured custom survey text.
- Question counts and outline titles come from survey data. Do not maintain a separate marketing question list. Only the original CRM template copy gets refreshed at render time.
- Use native buttons, visible keyboard focus, adequate contrast, touch feedback and reduced-motion handling. The decorative Three.js surface is hidden from assistive technology and becomes static for reduced motion.
- New public welcome components live in `survey/src/ui/survey`. Existing canvas rendering remains in feature components. Do not import the unrelated CRM repository's legacy UI kit.
- Preserve the visible animated dotted wave at full container opacity. Lift the welcome background with the survey accent, not pale text: the user rejected a flat gray background. Reduced motion keeps a visible static wave, including after resizing.
- The footer's background-motion toggle allows an explicit saved user choice to override the system motion preference. Without a saved choice, honor reduced motion. This setting affects the decorative background only.

The page intentionally uses a static Askly wordmark rather than opening the promotional product modal. The existing product modal is retained for canvas screens and other consumers.
