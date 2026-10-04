# Fern theme and unlimited member management

## Scope
- Replace the current white/forest palette with a white and Fern green system anchored to `#4F7942`, plus darker Fern shades for text, navigation, active states, charts, shadows, and focus rings across public pages, role dashboards, and admin pages.
- Keep all existing layouts and functionality while making transitions and interactions feel faster through shorter, restrained motion and consistent app-style surfaces.
- Remove the member-per-team setting and every capacity check from member creation and team reassignment. Teams with a leader can accept any number of members.
- Keep the global team-leader cap fixed at three and continue enforcing it server-side.
- Update member administration to show actual counts rather than capacity percentages, preserve search/team/status filters, and paginate large member lists so 50+ accounts remain fast and manageable.
- Update dashboard counts and team summaries to use complete database counts without truncation or capacity assumptions.
- Update business documentation and tests to state unlimited members and exactly three team leaders.

## Technical details
- Centralize the Fern palette in semantic CSS tokens so existing public, dashboard, and admin components inherit the new theme without hardcoded page colors.
- Remove `max_members_per_team` from server validation and admin limits controls; ignore any legacy stored value while leaving historical settings data harmless.
- Add server-side pagination inputs and a total count to the admin member list while keeping unpaginated lightweight team totals for selectors and dashboard summaries.
- Add focused tests for unlimited member creation/reassignment behavior and the three-team-leader rule, then run the relevant tests and confirm the preview build is healthy.
