---
allowed-tools: Bash, Read, Edit, MultiEdit, Write, Grep, Glob, Task, TodoWrite, TodoRead
description: Implement iterative editing loop with paranoid code verification
---

# Auto-Code: Iterative Development Loop

## Context
- Current git status: !`git status --short`
- Current branch: !`git branch --show-current`
- Recent commits: !`git log --oneline -5`

## Issue Tracker Template
```
# [TASK-ID] $ARGUMENTS
- [ ] Deep codebase analysis & understanding
- [ ] Implementation planning with 95% confidence
- [ ] Code implementation with tests
- [ ] Verification & bug checking
- [ ] Documentation & cleanup
```

## Your Task

You are implementing an iterative editing loop for the task: **$ARGUMENTS**

### CRITICAL REQUIREMENTS:
1. **DO A DEEP SEARCH OF THE CODE BASE** - Do not trust function signatures or assumptions
2. **BE PARANOID** - Check the internal logic of ALL code you plan to use or reuse
3. **CREATE A DETAILED PLAN** - Only execute when you are 95% sure you understand everything
4. **DELIVER A ROBUST SOLUTION** - The user's job is on the line

### Implementation Process:

#### Phase 1: Deep Analysis (MANDATORY)
- Search for ALL related files, functions, and dependencies
- Read and understand the ACTUAL implementation (not just signatures)
- Identify potential edge cases and failure points
- Document all assumptions that need verification

#### Phase 2: Planning
Create a detailed plan including:
- Exact files to modify
- Specific changes with line numbers
- Test scenarios to verify correctness
- Rollback strategy if something goes wrong

#### Phase 3: Implementation
- Use TodoWrite to track subtasks
- Implement changes incrementally
- Test after each significant change
- Keep a scratchpad of:
  - Code snippets being modified
  - Test results
  - Debugging notes
  - Potential issues discovered

#### Phase 4: Verification
- Run all relevant tests
- Check for type errors: `pnpm typecheck`
- Run linting: `pnpm lint`
- Manually verify the functionality
- Look for potential bugs or edge cases

### Output Format:

For each iteration, provide:

**Scratchpad:**
```
Iteration N:
- Current focus: [specific subtask]
- Code analysis: [findings from deep dive]
- Changes made: [specific modifications]
- Test results: [outcomes]
- Issues found: [any problems]
```

**Issue Tracker Update:**
```
# [TASK-ID] Task Name
- [x] Deep codebase analysis: [summary of findings]
- [x] Implementation planning: [confidence level and approach]
- [-] Code implementation: [current progress]
- [ ] Verification & testing: [pending tests]
```

### Special Considerations:
- Use `motion/react` instead of `framer-motion`
- Use `pnpm` instead of `npm`
- Follow existing code patterns in the codebase
- Maintain type safety at all times
- Consider multi-tenant architecture implications
- Check for authentication/authorization requirements

Begin by analyzing the codebase for: **$ARGUMENTS**