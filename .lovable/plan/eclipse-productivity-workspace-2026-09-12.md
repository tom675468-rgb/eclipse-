# Eclipse Productivity Workspace

## Goal
Build a polished, responsive dark-mode productivity app at `/` with four working views: dashboard, tasks, notes, and daily reflection.

## What will be built
- A collapsible desktop sidebar and compact mobile navigation with clear active states.
- A top status bar showing profile, level, animated XP, streak, and today’s focus time.
- A dashboard with performance metrics, a weekly activity chart, streak history, daily focus, and recent tasks.
- A task workspace with status columns, priorities, add-task controls, completion feedback, and immediate XP rewards.
- A notes workspace with searchable pages, editable titles and structured content blocks.
- A daily debrief flow for wins, habits, day score, reflection, and bonus XP.
- Responsive layouts, refined hover/focus states, subtle motion, and reduced-motion support.

## Technical approach
- Keep the experience frontend-only, with shared React state so XP, completed tasks, notes, and debrief progress update instantly during the session.
- Use the existing TanStack route at `/`, existing shadcn controls, Lucide icons, and Recharts.
- Define the full Eclipse palette, typography, shadows, and glass treatments as semantic tokens in the global design system.
- Add route-specific page metadata and replace the placeholder content completely.
- Verify the page visually at desktop and mobile sizes and check interactive flows and diagnostics.
