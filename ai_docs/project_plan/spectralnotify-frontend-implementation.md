# SpectralNotify Frontend Implementation

## Objective

- **Purpose / Goal**: Build a production-ready Task Feed UI for SpectralNotify that provides an intuitive "inbox" experience for monitoring background jobs with real-time updates and comprehensive task details
- **Relevant Architectural Layer(s)**: Frontend (Presentation Layer) - React, TanStack Router, TanStack Query, shadcn/ui

### Features

- **3-Pane Layout**: Left sidebar (filters), middle pane (task list), right pane (task details)
- **Task Filtering**: All Tasks, Live Tasks, Completed, Failed with count badges
- **Search Functionality**: Search tasks by Task ID (prefix/substring matching)
- **Task List View**: Display tasks with ID, status pill, progress bar, last event, relative time
- **Task Detail Panel**: Full event timeline, Live/Poll toggle, Copy Task ID functionality
- **Real-time Updates**: Simulated live updates via polling mechanism
- **Empty States**: User-friendly messages for "No tasks yet" and "No matches"
- **Responsive Design**: Mobile-first approach with responsive breakpoints
- **Dark Theme**: Consistent with SpectralNotify brand (emerald/teal gradient accents)

## Design System Guidelines

### Color Palette (Based on Auth Pages & Concepts)
- **Background**: `bg-gray-900` (dark base)
- **Cards/Surfaces**: `bg-gray-800/50` with `backdrop-blur-xl`
- **Borders**: `border-white/10`
- **Primary Accent**: `emerald-400` to `teal-600` gradient
- **Text Primary**: `text-white`
- **Text Secondary**: `text-gray-400`
- **Active State**: `bg-emerald-600`
- **Failed/Error**: `bg-red-500/10`, `text-red-400`
- **Completed**: `bg-gray-500/10`, `text-gray-400`
- **Progress**: `bg-emerald-500` with gradient

### Typography
- **Headings**: `font-bold tracking-tight`
- **Task IDs**: `font-mono text-sm`
- **Body Text**: `text-sm text-gray-400`
- **Brand**: `Spectral` (white) + `Notify` (emerald-to-teal gradient)

### Component Patterns
- **Glassmorphism**: `bg-gray-800/50 backdrop-blur-xl border-white/10`
- **Hover States**: `hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]`
- **Animations**: Use `motion/react` for smooth transitions
- **Border Radius**: `rounded-xl` for cards, `rounded-lg` for inputs
- **Spacing**: Consistent padding `p-6`, `p-8` for cards
- **Focus States**: `focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20`

### Layout Structure (from Concepts)
- **Sidebar Width**: Fixed ~250px with collapsible option
- **Task List**: Flexible width with max-width constraints
- **Detail Panel**: Flexible width, ~400-500px optimal
- **Gaps**: `gap-4` between panes, `gap-6` within cards

## Stories

- [ ] 🎯 **User Story 1**: As a user, I want to see all my background tasks in a filterable list so I can quickly find and monitor specific jobs
- [ ] 🎯 **User Story 2**: As a user, I want to search for tasks by Task ID so I can locate specific jobs instantly
- [ ] 🎯 **User Story 3**: As a user, I want to see real-time progress updates for active tasks so I know how long they'll take
- [ ] 🎯 **User Story 4**: As a user, I want to view a detailed event timeline for each task so I can debug issues and track execution flow
- [ ] 🎯 **User Story 5**: As a user, I want to copy Task IDs to share with teammates or paste into logs
- [ ] 🎯 **User Story 6**: As a user, I want to filter tasks by status (All/Live/Completed/Failed) so I can focus on relevant jobs
- [ ] 🎯 **User Story 7**: As a user, I want to see count badges on filters so I know how many tasks are in each state
- [ ] 🎯 **User Story 8**: As a user, I want clear empty states when no tasks exist so I understand the system is working

## Tasks / Issues Backlog

> **Tip**: Break tasks into #todo, #wip, #done, or add custom statuses as needed.

### #todo

#### Phase 1: UI Components Foundation
- [ ] 🏹 **Create Badge Component** (`apps/web/src/components/ui/badge.tsx`)
  - Variants: default, active, completed, failed
  - Support for count badges on filters
  - Consistent with design system colors

- [ ] 🏹 **Create Progress Component** (`apps/web/src/components/ui/progress.tsx`)
  - Animated progress bar with percentage
  - Emerald gradient styling
  - Support for indeterminate state

- [ ] 🏹 **Create Empty State Component** (`apps/web/src/components/empty-state.tsx`)
  - Icon support (Inbox icon for empty states)
  - Configurable title and description
  - Call-to-action button option

#### Phase 2: Task-Specific Components
- [ ] 🏹 **Create Task Status Pill Component** (`apps/web/src/components/task-status-pill.tsx`)
  - Status variants: Active, Completed, Failed
  - Dot indicator with appropriate colors
  - Consistent sizing and padding

- [ ] 🏹 **Create Task List Item Component** (`apps/web/src/components/task-list-item.tsx`)
  - Display: Task ID, status pill, progress bar (conditional), last event snippet, relative time
  - Hover state with border highlight (emerald)
  - Click handler to select task
  - Active state styling when selected
  - Glassmorphism card style

- [ ] 🏹 **Create Task Detail Header Component** (`apps/web/src/components/task-detail-header.tsx`)
  - Large Task ID display
  - Status pill
  - Copy ID button with toast confirmation
  - Live/Poll toggle switch
  - Subtitle with last update time

- [ ] 🏹 **Create Event Timeline Component** (`apps/web/src/components/event-timeline.tsx`)
  - Reverse chronological list
  - Event cards with: timestamp, event type, description
  - Progress indicators within timeline
  - Color-coded event types (info, success, error, warning)
  - Relative time display

- [ ] 🏹 **Create Task Detail Panel Component** (`apps/web/src/components/task-detail-panel.tsx`)
  - Compose: TaskDetailHeader + EventTimeline
  - Empty state: "Select a task to view details"
  - Glassmorphism styling
  - Smooth animations for panel transitions

#### Phase 3: Utilities & Hooks
- [ ] 🏹 **Create Mock Task Data Generator** (`apps/web/src/lib/mock-tasks.ts`)
  - Generate realistic task data with varying statuses
  - Random Task IDs in format: TASK-XXXX
  - Event generation with timestamps
  - Progress simulation for active tasks
  - Export 20-30 sample tasks

- [ ] 🏹 **Create Relative Time Utility** (`apps/web/src/lib/format-time.ts`)
  - Format timestamps as: "just now", "2m ago", "5m ago", "2h ago", "3d ago"
  - Update interval handling for live updates

- [ ] 🏹 **Create Task Query Hooks** (`apps/web/src/hooks/use-tasks.ts`)
  - `useTasksQuery()` - Fetch tasks with TanStack Query
  - `useTaskSearch()` - Filter tasks by search term
  - `useTaskFilter()` - Filter tasks by status
  - Mock data integration
  - Simulated loading states

- [ ] 🏹 **Create Live Update Hook** (`apps/web/src/hooks/use-live-updates.ts`)
  - Simulate real-time updates with polling
  - Update task progress incrementally
  - Add new events to timeline
  - Toggle between Live/Poll modes

#### Phase 4: Page Routes & Layouts
- [ ] 🏹 **Update Sidebar Navigation** (`apps/web/src/components/app-sidebar.tsx`)
  - Add count badges to navigation items
  - Fetch task counts from mock data
  - Update active state based on current route

- [ ] 🏹 **Create Tasks Layout Route** (`apps/web/src/routes/_app/tasks/route.tsx`)
  - 3-pane layout: Sidebar (existing) + Task List + Detail Panel
  - Responsive: Stack on mobile, side-by-side on desktop
  - State management for selected task
  - URL sync for selected task ID

- [ ] 🏹 **Create All Tasks Page** (`apps/web/src/routes/_app/tasks/all.tsx`)
  - Display all tasks regardless of status
  - Search bar at top
  - Task list with mock data
  - Detail panel on right
  - Empty state when no tasks

- [ ] 🏹 **Create Live Tasks Page** (`apps/web/src/routes/_app/tasks/live.tsx`)
  - Filter to show only active tasks
  - Auto-enable Live updates mode
  - Progress bars visible for all tasks
  - Empty state: "No active tasks"

- [ ] 🏹 **Create Completed Tasks Page** (`apps/web/src/routes/_app/tasks/completed.tsx`)
  - Filter to show only completed tasks
  - Sort by completion time (most recent first)
  - Hide progress bars
  - Empty state: "No completed tasks yet"

- [ ] 🏹 **Create Failed Tasks Page** (`apps/web/src/routes/_app/tasks/failed.tsx`)
  - Filter to show only failed tasks
  - Highlight error events in timeline
  - Sort by failure time (most recent first)
  - Empty state: "No failed tasks"

#### Phase 5: Polish & Refinement
- [ ] 🏹 **Implement Search Functionality**
  - Debounced search input
  - Prefix/substring matching on Task ID
  - Highlight search matches
  - "No matches" empty state

- [ ] 🏹 **Add Animations & Transitions**
  - Page transitions with `motion/react`
  - List item enter/exit animations
  - Panel slide-in animations
  - Skeleton loaders for loading states

- [ ] 🏹 **Implement Keyboard Navigation**
  - Arrow keys to navigate task list
  - Enter to select task
  - ESC to deselect task
  - "/" to focus search

- [ ] 🏹 **Add Loading States**
  - Skeleton loaders for task list
  - Shimmer effect for loading cards
  - Loading spinner for event timeline

- [ ] 🏹 **Responsive Design Testing**
  - Mobile: Stack panels vertically
  - Tablet: 2-pane layout (list + details)
  - Desktop: Full 3-pane layout
  - Test all breakpoints

- [ ] 🏹 **Accessibility Audit**
  - ARIA labels for all interactive elements
  - Keyboard navigation support
  - Screen reader testing
  - Focus indicators
  - Color contrast validation

### #wip

- _(List in-progress items here)_

### #done

- [x] Update sidebar navigation with task filter icons (All Tasks, Live Tasks, Completed, Failed)
- [x] Replace collapsible NavMain with flat navigation structure

---

## Additional Details / References

### 1. **Tech Stack**

- **Framework**: React 19 with TypeScript
- **Routing**: TanStack Router (file-based)
- **Data Fetching**: TanStack Query (with mock data)
- **Styling**: TailwindCSS + shadcn/ui
- **Animations**: motion/react
- **Form Handling**: @tanstack/react-form
- **State Management**: TanStack Query cache + URL state
- **Icons**: lucide-react

### 2. **File Structure**

```
apps/web/src/
├── components/
│   ├── ui/
│   │   ├── badge.tsx (NEW)
│   │   ├── progress.tsx (NEW)
│   │   └── ... (existing components)
│   ├── empty-state.tsx (NEW)
│   ├── task-status-pill.tsx (NEW)
│   ├── task-list-item.tsx (NEW)
│   ├── task-detail-header.tsx (NEW)
│   ├── event-timeline.tsx (NEW)
│   ├── task-detail-panel.tsx (NEW)
│   └── app-sidebar.tsx (UPDATE)
├── routes/
│   └── _app/
│       └── tasks/
│           ├── route.tsx (NEW - Layout)
│           ├── all.tsx (NEW)
│           ├── live.tsx (NEW)
│           ├── completed.tsx (NEW)
│           └── failed.tsx (NEW)
├── hooks/
│   ├── use-tasks.ts (NEW)
│   └── use-live-updates.ts (NEW)
├── lib/
│   ├── mock-tasks.ts (NEW)
│   └── format-time.ts (NEW)
└── types/
    └── task.ts (NEW)
```

### 3. **Data Structure**

```typescript
// types/task.ts
export type TaskStatus = "active" | "completed" | "failed"

export type TaskEvent = {
  id: string
  timestamp: Date
  type: "log" | "progress" | "error" | "success"
  message: string
  metadata?: Record<string, unknown>
}

export type Task = {
  id: string // Format: TASK-XXXX
  status: TaskStatus
  progress?: number // 0-100
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
  failedAt?: Date
  events: TaskEvent[]
  lastEvent: TaskEvent
}
```

### 4. **Mock Data Strategy**

- Use TanStack Query with mock data providers
- Simulate API delays (200-500ms)
- Generate 25-30 sample tasks on mount
- Live updates: Poll every 2-3 seconds, update progress +5-15%
- Random event generation for active tasks

### 5. **Design Patterns from Auth Pages**

- **Glassmorphism Cards**: `bg-gray-800/50 backdrop-blur-xl border-white/10`
- **Background Pattern**: SVG grid with mask gradient
- **Gradient Orb**: Emerald-to-teal blur effect
- **Input Styling**: `bg-white/5 border-white/10 focus:border-emerald-500/50`
- **Button Primary**: `bg-emerald-600 hover:bg-emerald-700 hover:scale-[1.02]`
- **Animations**: Spring transitions with `motion/react`

### 6. **UI Concept Insights (from Images)**

**Concept 1 (First Image):**
- Compact sidebar with clear iconography
- Task list with subtle borders and hover states
- Progress bars integrated into task cards
- Large, prominent Task ID in detail panel
- Event timeline with dot indicators

**Concept 2 (Second Image):**
- Cleaner 3-panel separation
- Tab-based filtering in middle pane
- Status pills with color coding
- Live toggle as prominent switch
- Timestamp formatting (HH:MM:SS)

**Concept 3 (Third Image):**
- Grid-based task cards instead of list
- Multiple filter tabs at top
- Event timeline with progress visualization
- Clear visual hierarchy with card elevation

**Chosen Direction**: Combine elements from all three - use list view (Concept 1) with tab filtering (Concept 2) and prominent status indicators (Concept 3)

### 7. **Accessibility Requirements**

- All interactive elements must be keyboard accessible
- ARIA labels for status pills and icons
- Screen reader announcements for live updates
- Minimum 4.5:1 color contrast for all text
- Focus indicators visible on all interactive elements
- Semantic HTML (main, aside, article, section)

### 8. **Performance Considerations**

- Virtualize task list if >100 items (use @tanstack/react-virtual)
- Debounce search input (300ms)
- Memoize task filtering logic
- Lazy load task detail panel content
- Optimize re-renders with React.memo where appropriate

---

## Log

> Keep track of your progress or timeboxing here (e.g., Pomodoro timers)

### #🍅 Pomodoro - 1

- 🚀 Created project plan document structure
- 🚀 Analyzed UI concepts and extracted design patterns
- 🚀 Reviewed auth pages for style consistency
- 🚀 Documented comprehensive task breakdown
- 🚀 Next: Begin Phase 1 - UI Components Foundation

---

## Implementation Notes

### Priority Order
1. **Phase 1-2** (Components): Build reusable UI components first
2. **Phase 3** (Utilities): Create mock data and helper functions
3. **Phase 4** (Routes): Wire up pages with mock data
4. **Phase 5** (Polish): Animations, accessibility, responsive design

### Testing Strategy (Frontend Only)
- Visual testing: Storybook for components (optional)
- Manual testing: Test all routes and interactions
- Responsive testing: Chrome DevTools device emulation
- Accessibility testing: axe DevTools, keyboard-only navigation

### Future Backend Integration Points
- Replace mock data queries with real ORPC endpoints
- Implement WebSocket for true live updates
- Add task creation/cancellation actions
- Persist selected task in URL params
- Add pagination for large task lists

---

**Last Updated**: 2025-10-18
**Status**: Ready for implementation
**Estimated Completion**: 4-5 Pomodoro sessions (8-10 hours)
