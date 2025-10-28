---
allowed-tools: Bash, Read, Edit, Write, Grep, Glob, Task, TodoWrite
description: Deep analysis of feature implementation via user flow → data flow tracing
---

# Trace Feature Flow: User Journey → Data Flow Analysis

## Context
- Current git status: !`git status --short`
- Current branch: !`git branch --show-current`
- Feature to analyze: **$ARGUMENTS**

## Your Mission

You will perform a **complete end-to-end analysis** of how a feature works by tracing:
1. **User Flow** (UI/UX journey)
2. **Data Flow** (state changes, API calls, store updates)
3. **Component Dependencies** (what depends on what)
4. **Initialization Sequence** (timing and order of operations)

The goal is to **teach the user** how the feature is implemented with crystal clarity.

---

## Analysis Framework

### Phase 1: Entry Point Discovery 🔍

**Objective:** Find where the user interacts with this feature

**Steps:**
1. **Search for UI components**
   ```bash
   # Search for relevant component files
   Grep pattern:"feature-name|FeatureName" output_mode:files_with_matches
   Glob pattern:**/*feature-name*.{tsx,ts}
   ```

2. **Identify user actions**
   - Button clicks (`onClick`, `onSubmit`)
   - Form submissions (`handleSubmit`, mutations)
   - Navigation triggers (`router.push`, `redirect`)
   - URL parameters (`searchParams`, dynamic routes)

3. **Document entry points**
   - List all files where user can initiate this feature
   - Note the trigger conditions (authenticated? specific route?)

**Output:**
```markdown
### Entry Points Found:
1. [ComponentName.tsx:123](path/to/file.tsx#L123) - User clicks "Action Button"
2. [FormComponent.tsx:45](path/to/form.tsx#L45) - Form submission
3. [RouteHandler.tsx:78](path/to/route.tsx#L78) - URL navigation
```

---

### Phase 2: State Management Tracing 📦

**Objective:** Understand how state is stored and updated

**Steps:**
1. **Find all stores/contexts**
   ```bash
   # Search for state management patterns
   Grep pattern:"createStore|createContext|useState.*feature"
   Grep pattern:".*Store\.ts|.*Context\.tsx"
   ```

2. **Map state structure**
   - What data is stored? (shape of state)
   - Where is it stored? (XState Store, Context, localStorage, URL)
   - When does it initialize? (on mount, after auth, lazy)
   - How long does it persist? (session, page reload, forever)

3. **Identify state setters**
   - Functions that update state
   - Event emissions (XState `emit.eventName`)
   - Side effects (useEffect, store reactions)

**Output:**
```markdown
### State Management:
**Store:** `feature.store.ts`
**State Shape:**
\`\`\`typescript
{
  currentItem: string | null,
  items: Item[],
  loading: boolean,
  error: string | null
}
\`\`\`

**Key Actions:**
- `setCurrentItem(id)` - Sets active item
- `loadItems()` - Fetches from API
- `resetState()` - Clears all data

**Persistence:** Session-scoped (no localStorage)
```

---

### Phase 3: API & Data Fetching Layer 🌐

**Objective:** Trace all server interactions

**Steps:**
1. **Find API routes**
   ```bash
   # Search for API endpoints
   Grep pattern:"api\.feature\.|/api/feature"
   Grep pattern:"router\..*feature|handler.*Feature"
   ```

2. **Map query definitions**
   - React Query keys
   - Query functions (what API is called)
   - Enablement conditions (when does query run)
   - Cache configuration (staleTime, refetch behavior)

3. **Trace backend handlers**
   - Router files (`*.router.ts`)
   - Handler files (`*.handlers.ts`)
   - Service layer calls (Foundation, Orchestration, Coordination)

**Output:**
```markdown
### API Layer:

**Query Definition:** `feature.query.ts:15-30`
\`\`\`typescript
queryKey: ['feature', 'items', userId]
queryFn: () => api.feature.getItems.$get({ userId })
enabled: !!userId && !isSessionPending
staleTime: 5 * 60 * 1000
\`\`\`

**Backend Route:** `feature.router.ts:45-60`
- Endpoint: `GET /api/feature/items`
- Handler: `handleGetItems(databaseUrl, userId)`
- Service: `FeatureService.retrieveItemsAsync(userId)`

**Data Flow:**
Client → Query → API Router → Handler → Service → Broker → Database
```

---

### Phase 4: Component Dependency Graph 🕸️

**Objective:** Map component relationships

**Steps:**
1. **Build dependency tree**
   ```bash
   # Find all imports of key components
   Grep pattern:"import.*FeatureComponent"
   ```

2. **Identify prop flow**
   - What props are passed down?
   - Where does data come from? (hooks, contexts, props)
   - What callbacks are passed up?

3. **Map provider hierarchy**
   - Which providers wrap which components?
   - What context is available where?

**Output:**
```markdown
### Component Hierarchy:

\`\`\`
FeatureProvider (provides: featureContext)
└── FeatureLayout
    ├── FeatureHeader (uses: currentItem from context)
    ├── FeatureList (uses: items from useQuery)
    │   └── FeatureItem (receives: item as prop, onClick callback)
    └── FeatureSidebar (uses: currentItem from context)
\`\`\`

**Data Sources:**
- `FeatureHeader`: `useCurrentItem()` hook → `feature.store.ts`
- `FeatureList`: `useQuery(getFeatureItems)` → React Query cache
- `FeatureItem`: Props from parent (no direct state access)
```

---

### Phase 5: Initialization Sequence ⏱️

**Objective:** Document the exact order of operations

**Steps:**
1. **Trace useEffect dependencies**
   - Find all initialization effects
   - Note dependency arrays
   - Identify async operations

2. **Map loading states**
   - What loads first?
   - What depends on what being loaded?
   - Fallback/loading UI handling

3. **Document timing**
   - Approximate ms for each step
   - Critical path analysis
   - Potential race conditions

**Output:**
```markdown
### Initialization Sequence:

**1. User Authentication** (0ms)
- Server-side auth check
- Session validation
- Redirect if unauthenticated

**2. Provider Mount** (~50ms)
- FeatureProvider renders
- Initial state: `currentItem = null`

**3. API Calls** (~100-300ms)
- Query 1: Fetch user settings
- Query 2: Fetch feature items (enabled after settings load)

**4. Auto-Selection** (~350ms)
- useEffect triggers when items arrive
- Auto-select first item if none selected
- Update store: `setCurrentItem(items[0].id)`

**5. UI Ready** (~400ms)
- All queries complete
- UI displays selected item
- User can interact

**Critical Dependencies:**
\`\`\`
Session (userId)
  ↓
User Settings Query (enabled by userId)
  ↓
Feature Items Query (enabled by settings)
  ↓
Auto-select First Item (if items.length > 0 && !currentItem)
  ↓
UI Renders Complete State
\`\`\`
```

---

### Phase 6: Visual Flow Diagram 📊

**Objective:** Create ASCII diagram showing complete flow

**Steps:**
1. Create user flow diagram
2. Create data flow diagram
3. Create state transition diagram

**Output:**
```markdown
### Complete Flow Diagram:

\`\`\`
┌──────────────────────────────────────────────────────────┐
│ USER ACTION: Click "Feature Button"                      │
│ Location: FeatureComponent.tsx:123                       │
└─────────────────┬────────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────────────────────┐
│ STATE UPDATE                                              │
│ ┌────────────────────────────────────────────────────┐  │
│ │ setCurrentItem(itemId)                             │  │
│ │   → feature.store.currentItem = itemId             │  │
│ │   → emit.itemChanged({ itemId })                   │  │
│ └────────────────────────────────────────────────────┘  │
└─────────────────┬────────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────────────────────┐
│ API CALL                                                  │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Query: ['feature', 'item', itemId]                 │  │
│ │ API: GET /api/feature/item/:itemId                 │  │
│ │ Handler: handleGetItem(databaseUrl, itemId)        │  │
│ │ Service: FeatureService.retrieveItemAsync(itemId)  │  │
│ └────────────────────────────────────────────────────┘  │
└─────────────────┬────────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────────────────────┐
│ COMPONENT RE-RENDER                                       │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Components using useCurrentItem() re-render        │  │
│ │ - FeatureHeader: Updates title                     │  │
│ │ - FeatureSidebar: Highlights selected item         │  │
│ │ - FeatureDetail: Shows item details                │  │
│ └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
\`\`\`
```

---

### Phase 7: Key Observations & Gotchas 💡

**Objective:** Highlight important patterns and potential issues

**Document:**
1. **Design Patterns Used**
   - Provider pattern, compound components, render props, etc.
   - Why these patterns were chosen

2. **State Persistence**
   - What survives page reload?
   - What's session-scoped?
   - Any localStorage usage?

3. **Race Conditions**
   - Potential timing issues
   - How they're prevented

4. **Edge Cases**
   - What happens with no data?
   - What happens with invalid IDs?
   - Error handling approach

5. **Performance Considerations**
   - Query caching strategy
   - Preventing unnecessary re-renders
   - Lazy loading or code splitting

**Output:**
```markdown
### Key Observations:

1. **Automatic Initialization**
   - Feature auto-selects first item on load
   - No user interaction required
   - Happens ~350ms after authentication

2. **State Management**
   - Uses XState Store v3.x
   - Session-scoped (no localStorage)
   - Event-driven updates via `.emit()`

3. **Data Caching**
   - 5-minute staleTime on all queries
   - Queries disabled when dependencies missing
   - Automatic invalidation on item changes

4. **Gotchas**
   ⚠️ Auto-selection skipped if user has recent manual action
   ⚠️ Workspace context required before feature initializes
   ⚠️ Store resets on page reload (intentional design)
```

---

## Deliverable Format

### Structure your analysis as:

```markdown
# Feature Analysis: [Feature Name]

## 🎯 Feature Overview
[2-3 sentence description of what this feature does from user perspective]

## 📍 Entry Points
[List of files/locations where user can trigger this feature]

## 📦 State Management
[Store structure, actions, persistence]

## 🌐 API Layer
[Query definitions, endpoints, backend handlers]

## 🕸️ Component Dependencies
[Tree diagram showing component relationships]

## ⏱️ Initialization Sequence
[Step-by-step timing diagram]

## 📊 Complete Flow Diagram
[ASCII art showing user → data → UI flow]

## 💡 Key Observations
[Design patterns, gotchas, edge cases]

## 📚 Related Files
[Comprehensive list of all files involved with line references]
```

---

## Quality Checklist

Before finishing, ensure you've:
- ✅ Traced the complete user journey from UI to database
- ✅ Documented all state changes with exact locations
- ✅ Mapped all API calls with query keys and endpoints
- ✅ Created visual diagrams (ASCII art is fine)
- ✅ Noted initialization timing and dependencies
- ✅ Highlighted gotchas and edge cases
- ✅ Provided file references with line numbers (e.g., `file.ts:123`)

---

## Example Usage

```bash
# Analyze workspace selection feature
/trace-feature-flow workspace selection and initialization

# Analyze knowledge base auto-selection
/trace-feature-flow knowledge base selection in InfoPanel

# Analyze team management
/trace-feature-flow team creation and management flow
```

---

Begin your analysis of: **$ARGUMENTS**

Remember: The goal is to **teach** the user how this feature works with such clarity that they could explain it to someone else or implement a similar feature from scratch.
