<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- User data persists per account in the `user_state` table (one JSON row per key) via `useCloudState` in src/lib/cloud-state.tsx — simple, schema-free saves for evolving user-owned shapes.
- Training and strength share one top-level workspace with internal tabs, so athlete data stays contextual and the main navigation remains compact.
- A persisted global tracking start date scopes calendar, nutrition, session, and strength statistics so historical comparisons share one timeline.
- All first-run content states are empty and cleanup recognizes only the retired sample signatures — real user entries must never be seeded or erased.
- Deep Work owns the 24-hour daily agenda (hour-row click opens an anchored popup with start/end times; 1 s long-press to move, bottom handle to resize, 15-minute snapping) — planning and focus stay in one workspace.
- Numeric rotary and stepper controls always expose direct keyboard entry, while preserving tactile gestures — long ranges must remain fast to edit.
- Mobile uses a five-destination bottom dock with the full navigation in the side menu — this prevents horizontal overflow and hidden page content.
- Every saved strength performance triggers a 3.8-second full-screen rank reveal that is dismissible from any touch, click, or keyboard action — feedback is immediate without trapping the athlete.
- Horizontal option groups and dense week/history views use touch-scroll containers; rotary drums capture all touch (touch-action none, vertical drag) and grid children carry min-w-0 — otherwise phones block the dials and wide children overflow panels.
- Authentication loading, error, and sign-in shells use the same `100dvh` and full-width constraints as the signed-in app, preventing mobile viewport mode changes during session restoration.
- Display and theme preferences persist per account; physical phones always override restored preferences with the full-width mobile shell before session restoration, while non-phone devices may request the 1180px desktop viewport and themes remain token-driven.
- Startup shows one shared launch screen (route pendingComponent + AuthGate loading) and the saved theme is applied by an inline head script — the opening must never flash blank, spinner, sign-in or another theme.
- The AI coach lives at /coach/$threadId under the pathless `_shell` layout (AuthGate + EclipseApp mounted once); threads persist as UIMessage[] in `coach_threads` and the server rebuilds athlete context from `user_state` on each turn — real per-thread URLs without remounting the app.
