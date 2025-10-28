# Production-Ready Optimistic UI Patterns

**Version:** 3.0 (oRPC Edition)
**Last Updated:** 2025
**Status:** ✅ Battle-Tested in Production
**API Client:** oRPC with TanStack Query

---

## 🔧 Framework Notice

This guide uses **oRPC** (OpenAPI RPC) client syntax with TanStack Query integration. Key differences from Hono client:
- API calls: `api.feature.list.queryOptions()` instead of `api.feature.list.$get()`
- Mutations: `api.feature.create.mutationOptions()` instead of `api.feature.create.$post()`
- Cache keys: Auto-generated as `["procedurePath", inputObject]`
- Error handling: `isDefinedError(error)` for type-safe error checking

---

## Table of Contents

1. [Overview](#overview)
2. [Core Principles](#core-principles)
3. [The Standard Pattern](#the-standard-pattern)
4. [Mutation Types & Patterns](#mutation-types--patterns)
5. [Advanced Techniques](#advanced-techniques)
6. [Common Pitfalls & Solutions](#common-pitfalls--solutions)
7. [Testing Optimistic Updates](#testing-optimistic-updates)
8. [Complete Reference Implementation](#complete-reference-implementation)

---

## Overview

Optimistic UI updates provide immediate feedback to users by updating the UI before the server responds. This guide documents **production-tested patterns** from our Teams and Knowledge Base implementations.

### Why This Pattern Works

All successful optimistic updates share these characteristics:
- **Immediate UI feedback** (dialog closes, item appears)
- **Complete optimistic objects** (all required fields populated)
- **Consistent cache keys** (same keys for queries and mutations)
- **Reliable rollback** (proper error handling)
- **Silent server replacement** (no animation flash)

---

## Core Principles

### 1. The Optimistic Update Lifecycle

```typescript
User Action
    ↓
onMutate: Create optimistic object + Close dialog
    ↓
Update cache optimistically
    ↓
Server request (async)
    ↓
onSuccess: Silent replacement (no re-render)
    OR
onError: Rollback + Re-open dialog
```

### 2. Cache Key Consistency

**✅ CRITICAL:** All mutations MUST use the **exact same cache key** as the main query.

**Note:** With oRPC, cache keys are auto-generated based on the procedure path and input. The format is: `["procedurePath", inputObject]` or just `["procedurePath"]` for queries without input.

```typescript
// ❌ BAD: Inconsistent cache keys
const queryKey = ["teams.list"];  // Wrong!
const mutationKey = ["teams.enhanced", { organizationId }]; // Different!

// ✅ GOOD: Use oRPC-generated cache keys consistently
// Query: api.teams.list.queryOptions({ input: { organizationId } })
// Generates: ["teams.list", { organizationId }]
const CACHE_KEY = ["teams.list", { organizationId }];

// Use this same key in all mutations:
await queryClient.cancelQueries({ queryKey: CACHE_KEY });
queryClient.setQueryData(CACHE_KEY, (old) => [...]);
```

### 3. Complete Optimistic Objects

**✅ RULE:** Optimistic objects must contain **every field** the UI components need.

```typescript
// ❌ BAD: Missing fields
const optimisticTeam = {
    id: `temp-${Date.now()}`,
    name: variables.name,
    // Missing: description, color, memberCount, status, etc.
};

// ✅ GOOD: Complete object
const optimisticTeam: Team = {
    id: `temp-${Date.now()}`,
    name: variables.name,
    description: variables.description || '',
    memberCount: 1,
    color: variables.color || '#6366F1',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    members: [], // Empty but present
};
```

---

## The Standard Pattern

### File Structure

```
feature/
├── feature.query.ts          # Query + Mutation definitions
├── dialogs/
│   ├── CreateDialog.tsx      # Create operation
│   ├── UpdateDialog.tsx      # Update operation
│   └── DeleteDialog.tsx      # Delete operation
└── types.ts                  # Shared TypeScript types
```

### Query Definition Pattern

```typescript
// feature.hooks.ts
import { useQuery } from "@tanstack/react-query";
import { api } from "~/utils/orpc";

// ✅ STANDARD QUERY: Use oRPC queryOptions
export function useFeatureList(organizationId: string) {
    return useQuery(
        api.feature.list.queryOptions({
            input: { organizationId },
            enabled: !!organizationId,
            staleTime: 30_000, // 30 seconds
        })
    );
}

// Alternative: Export queryOptions factory for flexibility
export const getQuery_feature_list = (organizationId: string) =>
    api.feature.list.queryOptions({
        input: { organizationId },
        enabled: !!organizationId,
        staleTime: 30_000,
    });
```

### Mutation Definition Pattern

```typescript
// ✅ STANDARD MUTATION: Create operation
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isDefinedError } from "@orpc/client";
import { toast } from "sonner";
import { api } from "~/utils/orpc";
import type { CreateFeatureData } from "./types";

export function useCreateFeature(organizationId: string) {
    const queryClient = useQueryClient();

    return useMutation(
        api.feature.create.mutationOptions({
            onMutate: async (variables) => {
                // 1. Cancel outgoing queries to prevent overwrites
                await queryClient.cancelQueries({
                    queryKey: ["feature.list", { organizationId }]
                });

                // 2. Snapshot current state for rollback
                const previousData = queryClient.getQueryData([
                    "feature.list", { organizationId }
                ]);

                // 3. Create complete optimistic object
                const optimisticItem = {
                    id: `temp-${Date.now()}`,
                    ...variables,
                    organizationId,
                    // Add ALL required fields
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    status: 'active',
                };

                // 4. Update cache optimistically
                queryClient.setQueryData(
                    ["feature.list", { organizationId }],
                    (old: any[] = []) => [optimisticItem, ...old]
                );

                return { previousData };
            },

            onSuccess: (serverResponse, variables) => {
                // ✅ Silent replacement: Update IDs without triggering re-render
                queryClient.setQueryData(
                    ["feature.list", { organizationId }],
                    (old: any[] = []) => {
                        if (!old) return [serverResponse];
                        return old.map(item =>
                            item.id.startsWith('temp-') && item.name === variables.name
                                ? serverResponse  // Replace temp with real
                                : item
                        );
                    }
                );
                toast.success("Created successfully!");
            },

            onError: (error, variables, context) => {
                console.error("Failed:", error);

                // 1. Rollback optimistic update
                if (context?.previousData) {
                    queryClient.setQueryData(
                        ["feature.list", { organizationId }],
                        context.previousData
                    );
                }

                // 2. Show error message
                // Check for type-safe errors
                if (isDefinedError(error)) {
                    if (error.code === 'FEATURE_VALIDATION_ERROR') {
                        toast.error(`Validation error: ${error.data.reason}`);
                        return;
                    }
                }
                toast.error("Failed to create. Please try again.");
            },
        })
    );
}
```

---

## Mutation Types & Patterns

### 1. CREATE Pattern (Add Item)

**Use Case:** Adding new team, knowledge base, member, etc.

```typescript
// Dialog Component
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isDefinedError } from "@orpc/client";
import { toast } from "sonner";
import { api } from "~/utils/orpc";

export function CreateItemDialog({ onItemCreated, organizationId }: Props) {
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();
    const form = useForm();

    const CACHE_KEY = ["feature.list", { organizationId }];

    const createMutation = useMutation(
        api.feature.create.mutationOptions({
            onMutate: async (variables) => {
                // ✅ IMMEDIATE UI FEEDBACK: Close dialog first
                setOpen(false);
                form.reset();
                onItemCreated?.(); // Callback for parent updates

                // Cancel queries
                await queryClient.cancelQueries({ queryKey: CACHE_KEY });

                // Snapshot
                const previousData = queryClient.getQueryData(CACHE_KEY);

                // Create complete optimistic object
                const optimisticItem = {
                    id: `temp-${Date.now()}`,
                    name: variables.name,
                    description: variables.description || '',
                    organizationId,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    status: 'active',
                    // ... all required fields
                };

                // Update cache
                queryClient.setQueryData(CACHE_KEY, (old: any[] = []) =>
                    [optimisticItem, ...old]
                );

                return { previousData };
            },
            onSuccess: (serverResponse, variables) => {
                // Silent replacement (no invalidation = no flash)
                queryClient.setQueryData(CACHE_KEY, (old: any[] = []) =>
                    old.map(item =>
                        item.id.startsWith('temp-') && item.name === variables.name
                            ? serverResponse
                            : item
                    )
                );
                toast.success("Created successfully!");
            },
            onError: (error, variables, context) => {
                // Rollback + re-open dialog
                if (context?.previousData) {
                    queryClient.setQueryData(CACHE_KEY, context.previousData);
                }
                setOpen(true); // ✅ Re-open dialog on error

                // Handle type-safe errors
                if (isDefinedError(error) && error.code === 'FEATURE_VALIDATION_ERROR') {
                    toast.error(`Validation error: ${error.data.reason}`);
                } else {
                    toast.error("Failed to create. Please try again.");
                }
            },
        })
    );

    const handleSubmit = (data: FormData) => {
        createMutation.mutate({ ...data, organizationId });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {/* ... dialog content */}
        </Dialog>
    );
}
```

**Key Points:**
- ✅ Use `api.feature.create.mutationOptions()` with oRPC
- ✅ Close dialog in `onMutate` (not `onSuccess`)
- ✅ Use temporary IDs with `temp-` prefix
- ✅ Re-open dialog in `onError` for retry
- ✅ Silent replacement in `onSuccess` (no `invalidateQueries`)
- ✅ Check for type-safe errors with `isDefinedError()`

---

### 2. UPDATE Pattern (Modify Item)

**Use Case:** Editing team settings, knowledge base details, etc.

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isDefinedError } from "@orpc/client";
import { toast } from "sonner";
import { api } from "~/utils/orpc";

export function useUpdateFeature(organizationId: string) {
    const queryClient = useQueryClient();
    const CACHE_KEY = ["feature.list", { organizationId }];

    return useMutation(
        api.feature.update.mutationOptions({
            onMutate: async (variables) => {
                // Close dialog immediately
                // (handled in component, not here)

                await queryClient.cancelQueries({ queryKey: CACHE_KEY });

                const previousData = queryClient.getQueryData(CACHE_KEY);

                // ✅ Map over array to update specific item
                queryClient.setQueryData(CACHE_KEY, (old: any[] = []) =>
                    old.map(item =>
                        item.id === variables.id
                            ? { ...item, ...variables, updatedAt: new Date() }
                            : item
                    )
                );

                return { previousData };
            },

            onSuccess: () => {
                toast.success("Updated successfully!");
                // ✅ OPTIONAL: Invalidate to get server data
                queryClient.invalidateQueries({ queryKey: CACHE_KEY });
            },

            onError: (error, variables, context) => {
                if (context?.previousData) {
                    queryClient.setQueryData(CACHE_KEY, context.previousData);
                }

                // Handle type-safe errors
                if (isDefinedError(error)) {
                    if (error.code === 'FEATURE_NOT_FOUND') {
                        toast.error("Feature not found");
                        return;
                    }
                }
                // Re-open dialog in component's onError
                toast.error("Update failed. Please try again.");
            },
        })
    );
}
```

**Key Points:**
- ✅ Use `api.feature.update.mutationOptions()` with oRPC
- ✅ Use `.map()` to update specific item
- ✅ Preserve unchanged items
- ✅ Update `updatedAt` timestamp optimistically
- ✅ Can use `invalidateQueries` in `onSuccess` (data already matches)
- ✅ Handle type-safe errors with `isDefinedError()`

---

### 3. DELETE Pattern (Remove Item)

**Use Case:** Deleting teams, knowledge bases, members, etc.

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isDefinedError } from "@orpc/client";
import { toast } from "sonner";
import { api } from "~/utils/orpc";

export function useDeleteFeature(organizationId: string) {
    const queryClient = useQueryClient();
    const CACHE_KEY = ["feature.list", { organizationId }];

    return useMutation(
        api.feature.delete.mutationOptions({
            onMutate: async (variables) => {
                await queryClient.cancelQueries({ queryKey: CACHE_KEY });

                const previousData = queryClient.getQueryData(CACHE_KEY);

                // ✅ Filter out deleted item
                queryClient.setQueryData(CACHE_KEY, (old: any[] = []) =>
                    old.filter(item => item.id !== variables.id)
                );

                return { previousData };
            },

            onSuccess: () => {
                toast.success("Deleted successfully!");
                // Safe to invalidate (item already removed)
                queryClient.invalidateQueries({ queryKey: CACHE_KEY });
            },

            onError: (error, variables, context) => {
                if (context?.previousData) {
                    queryClient.setQueryData(CACHE_KEY, context.previousData);
                }

                // Handle type-safe errors
                if (isDefinedError(error)) {
                    if (error.code === 'FEATURE_NOT_FOUND') {
                        toast.error("Feature not found");
                        return;
                    }
                }
                // Re-open confirmation dialog
                toast.error("Delete failed. Please try again.");
            },
        })
    );
}
```

**Key Points:**
- ✅ Use `api.feature.delete.mutationOptions()` with oRPC
- ✅ Use `.filter()` to remove item
- ✅ Item disappears immediately
- ✅ Re-add item on error (via rollback)
- ✅ Safe to invalidate in `onSuccess`
- ✅ Handle type-safe errors with `isDefinedError()`

---

### 4. ADD MEMBER Pattern (Nested Array Update)

**Special Case:** Adding members to teams (updating nested arrays)

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isDefinedError } from "@orpc/client";
import { toast } from "sonner";
import { api } from "~/utils/orpc";
import { generateUUID } from "~/lib/utils";

export function useAddTeamMember(organizationId: string) {
    const queryClient = useQueryClient();
    const CACHE_KEY = ["teams.list", { organizationId }];

    return useMutation(
        api.teamMemberships.addMember.mutationOptions({

            onMutate: async (variables) => {
                await queryClient.cancelQueries({ queryKey: CACHE_KEY });

                const previousData = queryClient.getQueryData(CACHE_KEY);

                // ✅ Create complete member object with STABLE IDs
                const optimisticMember = {
                    id: variables.userId, // Real user ID (stable)
                    membershipId: variables.newMembershipId || generateUUID(), // Stable
                    name: variables.userName || 'Unknown User',
                    email: variables.userEmail || '',
                    role: variables.role,
                    status: 'active',
                    avatar: variables.userAvatar || undefined,
                    joinedAt: new Date(),
                    lastActive: new Date(),
                };

                // ✅ Update nested array in specific team
                queryClient.setQueryData(CACHE_KEY, (old: any[] = []) =>
                    old.map(team =>
                        team.id === variables.teamId
                            ? {
                                ...team,
                                memberCount: team.memberCount + 1,
                                members: [...team.members, optimisticMember]
                            }
                            : team
                    )
                );

                return { previousData };
            },

            onSuccess: (serverResponse, variables) => {
                // ✅ Merge server fields (timestamps, etc.) while keeping stable IDs
                queryClient.setQueryData(CACHE_KEY, (old: any[] = []) =>
                    old.map(team => {
                        if (team.id === variables.teamId) {
                            const updatedMembers = team.members.map((member: any) =>
                                member.id === variables.userId
                                    ? {
                                        ...member, // Keep optimistic data
                                        role: serverResponse.membership.role.toLowerCase(),
                                        joinedAt: new Date(serverResponse.membership.createdAt),
                                        // IDs remain unchanged (stable)
                                    }
                                    : member
                            );
                            return { ...team, members: updatedMembers };
                        }
                        return team;
                    })
                );
                toast.success("Team member added successfully!");
            },

            onError: (error, variables, context) => {
                if (context?.previousData) {
                    queryClient.setQueryData(CACHE_KEY, context.previousData);
                }

                // Handle type-safe errors
                if (isDefinedError(error)) {
                    if (error.code === 'MEMBER_ALREADY_EXISTS') {
                        toast.error("Member already exists in team");
                        return;
                    }
                }
                toast.error("Failed to add member. Please try again.");
            },
        })
    );
}

// ✅ Usage in component
function AddMemberDialog({ team }: Props) {
    const addMemberMutation = useAddTeamMember(team.organizationId);

    const handleSubmit = (data: FormData) => {
        const newMembershipId = generateUUID(); // ✅ Generate stable ID

        addMemberMutation.mutate({
            teamId: team.id,
            userId: data.userId,
            userName: data.userName,
            userEmail: data.userEmail,
            userAvatar: data.userAvatar,
            role: data.role,
            newMembershipId, // ✅ Pass to mutation
        });
    };

    return (/* dialog component */);
}
```

**Key Points:**
- ✅ Use `api.teamMemberships.addMember.mutationOptions()` with oRPC
- ✅ Generate stable UUIDs on client (not temporary IDs)
- ✅ Server uses the same client-generated ID
- ✅ Update nested arrays (members within teams)
- ✅ Merge server fields without changing IDs
- ✅ No animation flash on success
- ✅ Handle type-safe errors with `isDefinedError()`

---

### 5. UPDATE ROLE Pattern (Modify Nested Object)

**Use Case:** Changing member permissions within a team

```typescript
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isDefinedError } from "@orpc/client";
import { toast } from "sonner";
import { api } from "~/utils/orpc";

// Hook definition
export function useUpdateMemberRole(organizationId: string) {
    const queryClient = useQueryClient();
    const CACHE_KEY = ["teams.list", { organizationId }];

    return useMutation(
        api.teamMemberships.updateRole.mutationOptions({
            onMutate: async (variables) => {
                await queryClient.cancelQueries({ queryKey: CACHE_KEY });

                const previousData = queryClient.getQueryData(CACHE_KEY);

                // ✅ Update nested member role
                queryClient.setQueryData(CACHE_KEY, (old: any[] = []) =>
                    old.map(team => {
                        if (team.id === variables.teamId) {
                            return {
                                ...team,
                                members: team.members.map((member: any) =>
                                    member.id === variables.memberId
                                        ? { ...member, role: variables.role }
                                        : member
                                )
                            };
                        }
                        return team;
                    })
                );

                return { previousData };
            },

            onSuccess: () => {
                toast.success("Role updated successfully!");
                queryClient.invalidateQueries({ queryKey: CACHE_KEY });
            },

            onError: (error, variables, context) => {
                if (context?.previousData) {
                    queryClient.setQueryData(CACHE_KEY, context.previousData);
                }

                // Handle type-safe errors
                if (isDefinedError(error)) {
                    if (error.code === 'MEMBER_NOT_FOUND') {
                        toast.error("Member not found");
                        return;
                    }
                }
                toast.error("Failed to update role. Changes have been reverted.");
            },
        })
    );
}

// Component usage
export function ManagePermissionDialog({ member, team, onRoleUpdate }: Props) {
    const [open, setOpen] = useState(false);
    const updateRoleMutation = useUpdateMemberRole(team.organizationId);

    const handleSubmit = (data: { role: "admin" | "member" }) => {
        // Skip if role unchanged
        if (data.role === member.role) {
            setOpen(false);
            return;
        }

        // Close dialog immediately
        setOpen(false);

        // Call callback for immediate UI feedback
        onRoleUpdate?.(member.id, data.role);

        updateRoleMutation.mutate(
            {
                teamId: team.id,
                memberId: member.id,
                role: data.role,
            },
            {
                onError: () => {
                    // Re-open dialog on error
                    setOpen(true);
                    // Revert callback
                    onRoleUpdate?.(member.id, member.role);
                },
            }
        );
    };

    return <Dialog open={open} onOpenChange={setOpen}>{/* ... */}</Dialog>;
}
```

**Key Points:**
- ✅ Use `api.teamMemberships.updateRole.mutationOptions()` with oRPC
- ✅ Use callbacks for immediate parent component updates
- ✅ Rollback both cache AND callbacks on error
- ✅ Skip mutation if no changes detected
- ✅ Update deeply nested properties
- ✅ Handle type-safe errors with `isDefinedError()`

---

## Advanced Techniques

### 1. Stable Client-Generated IDs

**Problem:** Temporary IDs (`temp-123`) prevent subsequent operations until server responds.

**Solution:** Generate stable UUIDs that server accepts:

```typescript
import { generateUUID } from "~/lib/utils";

// ✅ In component
const handleSubmit = (data: FormData) => {
    const newMembershipId = generateUUID(); // e.g., "550e8400-e29b-41d4-a716-446655440000"

    addMemberMutation.mutate({
        teamId: team.id,
        userId: data.userId,
        role: data.role,
        newMembershipId, // ✅ Server uses this ID
    });
};

// ✅ In onMutate
const optimisticMember = {
    id: variables.userId, // Real user ID
    membershipId: variables.newMembershipId, // Stable UUID
    // ... other fields
};

// ✅ In onSuccess (no ID change needed!)
queryClient.setQueryData(CACHE_KEY, (old: any[] = []) =>
    old.map(team => {
        if (team.id === variables.teamId) {
            const updatedMembers = team.members.map((member: any) =>
                member.id === variables.userId
                    ? { ...member, /* merge server fields */ }
                    : member
            );
            return { ...team, members: updatedMembers };
        }
        return team;
    })
);
```

**Benefits:**
- ✅ No animation flash (stable IDs = no remount)
- ✅ Immediate interactivity (remove member right after adding)
- ✅ Server and client use same IDs

---

### 2. Multi-Cache Synchronization

**Use Case:** Item belongs to multiple cache scopes (workspace + organization)

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isDefinedError } from "@orpc/client";
import { toast } from "sonner";
import { api } from "~/utils/orpc";

export function useCreateKnowledgeBase() {
    const queryClient = useQueryClient();

    return useMutation(
        api.knowledgeBase.create.mutationOptions({
            onMutate: async (variables) => {
                const { workspaceId, organizationId } = variables;

                // ✅ Cancel BOTH cache scopes
                await queryClient.cancelQueries({
                    queryKey: ["knowledgeBase.list", { workspaceId }]
                });
                await queryClient.cancelQueries({
                    queryKey: ["knowledgeBase.list", { organizationId }]
                });

                // ✅ Snapshot BOTH caches
                const previousWorkspace = queryClient.getQueryData([
                    "knowledgeBase.list", { workspaceId }
                ]);
                const previousOrg = queryClient.getQueryData([
                    "knowledgeBase.list", { organizationId }
                ]);

                const optimisticItem = {
                    id: `temp-${Date.now()}`,
                    ...variables,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };

                // ✅ Update BOTH caches
                queryClient.setQueryData(
                    ["knowledgeBase.list", { workspaceId }],
                    (old: any[] = []) => [optimisticItem, ...old]
                );
                queryClient.setQueryData(
                    ["knowledgeBase.list", { organizationId }],
                    (old: any[] = []) => [optimisticItem, ...old]
                );

                return { previousWorkspace, previousOrg };
            },

            onSuccess: (serverResponse, variables) => {
                const { workspaceId, organizationId } = variables;

                const updateCache = (old: any[] = []) =>
                    old.map(item => item.id.startsWith('temp-') ? serverResponse : item);

                // ✅ Update BOTH caches with server data
                queryClient.setQueryData(
                    ["knowledgeBase.list", { workspaceId }],
                    updateCache
                );
                queryClient.setQueryData(
                    ["knowledgeBase.list", { organizationId }],
                    updateCache
                );

                toast.success("Created successfully!");
            },

            onError: (error, variables, context) => {
                const { workspaceId, organizationId } = variables;

                // ✅ Rollback BOTH caches
                if (context?.previousWorkspace) {
                    queryClient.setQueryData(
                        ["knowledgeBase.list", { workspaceId }],
                        context.previousWorkspace
                    );
                }
                if (context?.previousOrg) {
                    queryClient.setQueryData(
                        ["knowledgeBase.list", { organizationId }],
                        context.previousOrg
                    );
                }

                // Handle type-safe errors
                if (isDefinedError(error)) {
                    toast.error(`Error: ${error.message}`);
                } else {
                    toast.error("Failed to create. Please try again.");
                }
            },
        })
    );
}
```

**Key Points:**
- ✅ Use `api.knowledgeBase.create.mutationOptions()` with oRPC
- ✅ Cancel, update, and rollback ALL affected caches
- ✅ Return all snapshots in context
- ✅ Keep caches in sync
- ✅ Handle type-safe errors with `isDefinedError()`

---

### 3. Event Propagation Control (Nested Dialogs)

**Problem:** Clicks in nested dialogs trigger parent dialog events.

**Solution:** Stop propagation at multiple event levels:

```typescript
<AlertDialog open={open} onOpenChange={handleOpenChange}>
    <AlertDialogTrigger asChild>
        <Button onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setOpen(true);
        }}>
            Delete
        </Button>
    </AlertDialogTrigger>

    <AlertDialogContent>
        <div
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-full"
        >
            <Input
                onClick={(e) => e.stopPropagation()}
                onFocus={(e) => e.stopPropagation()}
            />
        </div>
    </AlertDialogContent>
</AlertDialog>
```

**Key Points:**
- ✅ Stop `onClick`, `onPointerDown`, `onMouseDown`
- ✅ Wrap content in isolation div
- ✅ Stop propagation on form inputs
- ✅ Prevents morphing dialog interference

---

## Common Pitfalls & Solutions

### ❌ Pitfall 1: Cache Invalidation in `onSuccess` Causes Flash

```typescript
// ❌ BAD: Invalidates cache, triggers re-render, plays animation again
onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: CACHE_KEY });
    toast.success("Created!");
}
```

```typescript
// ✅ GOOD: Silent replacement, no re-render
onSuccess: (serverResponse, variables) => {
    queryClient.setQueryData(CACHE_KEY, (old: any[] = []) =>
        old.map(item =>
            item.id.startsWith('temp-') ? serverResponse : item
        )
    );
    toast.success("Created!");
}
```

---

### ❌ Pitfall 2: Incomplete Optimistic Object

```typescript
// ❌ BAD: Missing required fields causes "Cannot read property 'X' of undefined"
const optimisticTeam = {
    id: `temp-${Date.now()}`,
    name: variables.name,
    // Missing: members, memberCount, color, status...
};
```

```typescript
// ✅ GOOD: All required fields populated
const optimisticTeam: Team = {
    id: `temp-${Date.now()}`,
    name: variables.name,
    description: variables.description || '',
    memberCount: 1,
    color: variables.color || '#6366F1',
    status: 'active',
    members: [], // Empty array (not undefined!)
    createdAt: new Date(),
    updatedAt: new Date(),
};
```

---

### ❌ Pitfall 3: Inconsistent Cache Keys

```typescript
// ❌ BAD: Different cache keys for query and mutation
const query = useQuery(
    api.teams.list.queryOptions({ input: { workspaceId } })
);
// Generates: ["teams.list", { workspaceId }]

const mutation = useMutation(
    api.teams.create.mutationOptions({
        onMutate: async () => {
            // ❌ Different cache key!
            await queryClient.cancelQueries({
                queryKey: ["teams.enhanced", { organizationId }]
            });
        },
    })
);
```

```typescript
// ✅ GOOD: Use consistent oRPC-generated cache keys
const CACHE_KEY = ["teams.list", { organizationId }];

const query = useQuery(
    api.teams.list.queryOptions({ input: { organizationId } })
);
// Generates: ["teams.list", { organizationId }] ✅

const mutation = useMutation(
    api.teams.create.mutationOptions({
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: CACHE_KEY }); // ✅ Same key
        },
    })
);
```

---

### ❌ Pitfall 4: Not Re-opening Dialog on Error

```typescript
// ❌ BAD: Dialog stays closed, user can't retry
onError: (error, variables, context) => {
    if (context?.previousData) {
        queryClient.setQueryData(CACHE_KEY, context.previousData);
    }
    toast.error("Failed!");
    // Dialog is still closed!
}
```

```typescript
// ✅ GOOD: Re-open dialog for retry
onError: (error, variables, context) => {
    if (context?.previousData) {
        queryClient.setQueryData(CACHE_KEY, context.previousData);
    }
    setOpen(true); // ✅ Re-open dialog
    toast.error("Failed to create. Please try again.");
}
```

---

### ❌ Pitfall 5: Temporary IDs Block Subsequent Operations

```typescript
// ❌ BAD: Can't remove member until server responds
const optimisticMember = {
    id: `temp-user-${Date.now()}`, // Not a real user ID!
    membershipId: `temp-membership-${Date.now()}`, // Not a real membership ID!
    // ...
};

// Later, when trying to remove:
removeMemberMutation.mutate({
    membershipId: member.membershipId, // "temp-membership-123" doesn't exist in DB!
});
// ❌ Error: "Member not found"
```

```typescript
// ✅ GOOD: Use stable, real IDs
const newMembershipId = generateUUID(); // Real UUID

const optimisticMember = {
    id: variables.userId, // ✅ Real user ID
    membershipId: newMembershipId, // ✅ Stable UUID that server will use
    // ...
};

addMemberMutation.mutate({
    teamId: team.id,
    userId: data.userId,
    role: data.role,
    newMembershipId, // ✅ Server creates membership with this ID
});

// Later, removal works immediately:
removeMemberMutation.mutate({
    membershipId: member.membershipId, // ✅ Real UUID, works!
});
```

---

## Testing Optimistic Updates

### 1. Manual Testing Checklist

```markdown
✅ Happy Path:
- [ ] Item appears immediately after action
- [ ] Dialog closes immediately
- [ ] No animation flash on success
- [ ] Toast shows success message
- [ ] Item updates with real server data

✅ Error Path:
- [ ] Item disappears on error
- [ ] Dialog re-opens on error
- [ ] Toast shows error message
- [ ] User can retry immediately

✅ Race Conditions:
- [ ] Rapid sequential creates (click 5 times fast)
- [ ] Create → Delete → Create (same name)
- [ ] Update during pending create

✅ Edge Cases:
- [ ] Network offline (simulate in DevTools)
- [ ] Server timeout (slow 3G)
- [ ] Server validation error (duplicate name)
```

### 2. Automated Testing (Vitest)

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi } from 'vitest';
import { useCreateKnowledgeBase } from './knowledgeBase.hooks';

describe('Optimistic Update: Create Knowledge Base', () => {
    it('should add optimistic item immediately', async () => {
        const queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false },
                mutations: { retry: false },
            },
        });
        const wrapper = ({ children }: any) => (
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        );

        const { result } = renderHook(() => useCreateKnowledgeBase(), { wrapper });

        // Trigger mutation
        result.current.mutate({
            workspaceId: 'ws-1',
            organizationId: 'org-1',
            name: 'Test KB',
            description: 'Test',
        });

        // Check optimistic update (oRPC cache key format)
        await waitFor(() => {
            const data = queryClient.getQueryData([
                'knowledgeBase.list', { workspaceId: 'ws-1' }
            ]) as any[];

            expect(data).toHaveLength(1);
            expect(data[0].name).toBe('Test KB');
            expect(data[0].id).toMatch(/^temp-/);
        });
    });

    it('should rollback on error', async () => {
        const queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false },
                mutations: { retry: false },
            },
        });
        const wrapper = ({ children }: any) => (
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        );

        // Set up initial empty state
        queryClient.setQueryData(
            ['knowledgeBase.list', { workspaceId: 'ws-1' }],
            []
        );

        const { result } = renderHook(() => useCreateKnowledgeBase(), { wrapper });

        result.current.mutate({
            workspaceId: 'ws-1',
            organizationId: 'org-1',
            name: 'Test KB',
            description: 'Test',
        });

        // Wait for error
        await waitFor(() => {
            expect(result.current.isError).toBe(true);
        });

        // Check rollback (oRPC cache key format)
        const data = queryClient.getQueryData([
            'knowledgeBase.list', { workspaceId: 'ws-1' }
        ]) as any[];

        expect(data).toEqual([]); // Should be empty (rolled back)
    });

    it('should handle type-safe errors', async () => {
        const queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false },
                mutations: { retry: false },
            },
        });
        const wrapper = ({ children }: any) => (
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        );

        const { result } = renderHook(() => useCreateKnowledgeBase(), { wrapper });

        result.current.mutate({
            workspaceId: 'ws-1',
            organizationId: 'org-1',
            name: '',  // Invalid name
            description: 'Test',
        });

        // Wait for error
        await waitFor(() => {
            expect(result.current.isError).toBe(true);
            const error = result.current.error as any;
            expect(error.code).toBe('KNOWLEDGE_BASE_VALIDATION_ERROR');
        });
    });
});
```

---

## Complete Reference Implementation

### Teams Page: Add Member (Full Example)

**File: `teams.hooks.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isDefinedError } from "@orpc/client";
import { toast } from "sonner";
import { api } from "~/utils/orpc";
import { generateUUID } from "~/lib/utils";
import type { Team, TeamMember } from "./types";

// Query Hook
export function useTeamsList(organizationId: string) {
    return useQuery(
        api.teamManager.getEnhancedOrganizationTeams.queryOptions({
            input: { organizationId },
            enabled: !!organizationId,
            staleTime: 30_000, // 30 seconds
        })
    );
}

// Mutation Hook
export function useAddTeamMember(organizationId: string) {
    const queryClient = useQueryClient();
    const CACHE_KEY = ["teamManager.getEnhancedOrganizationTeams", { organizationId }];

    return useMutation(
        api.teamMemberships.addMember.mutationOptions({
            // Implementation in component below
        })
    );
}
```

**File: `AddMemberDialog.tsx`**

```typescript
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isDefinedError } from "@orpc/client";
import { toast } from "sonner";
import { generateUUID } from "~/lib/utils";
import { api } from "~/utils/orpc";
import type { Team, TeamMember } from "./types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Form } from "~/components/ui/form";

export function AddMemberDialog({
    team,
    onMemberAdded,
    workspaceUsers
}: {
    team: Team;
    onMemberAdded?: (member: TeamMember) => void;
    workspaceUsers?: any[];
}) {
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();
    const CACHE_KEY = ["teamManager.getEnhancedOrganizationTeams", { organizationId: team.organizationId }];

    const form = useForm({
        defaultValues: {
            userId: "",
            role: "member" as const,
        },
    });

    const addMemberMutation = useMutation(
        api.teamMemberships.addMember.mutationOptions({
            onMutate: async (variables) => {
                // 1. Immediate UI feedback
                setOpen(false);
                form.reset();

                // 2. Cancel outgoing queries
                await queryClient.cancelQueries({ queryKey: CACHE_KEY });

                // 3. Snapshot current state
                const previousTeams = queryClient.getQueryData(CACHE_KEY);

                // 4. Create complete optimistic member
                const selectedUser = workspaceUsers?.find((m: any) =>
                    m.user?.id === variables.userId
                );

                const optimisticMember: TeamMember = {
                    id: variables.userId, // Real user ID
                    membershipId: variables.newMembershipId || generateUUID(), // Stable
                    name: selectedUser?.user?.name || 'Unknown User',
                    email: selectedUser?.user?.email || '',
                    title: '',
                    department: '',
                    role: variables.role,
                    status: 'active',
                    avatar: selectedUser?.user?.image || undefined,
                    joinedAt: new Date(),
                    lastActive: new Date(),
                };

                // 5. Update cache optimistically
                queryClient.setQueryData(
                    CACHE_KEY,
                    (old: any[] = []) =>
                        old.map(t =>
                            t.id === variables.teamId
                                ? {
                                    ...t,
                                    memberCount: t.memberCount + 1,
                                    members: [...t.members, optimisticMember]
                                }
                                : t
                        )
                );

                // 6. Immediate parent callback
                onMemberAdded?.(optimisticMember);

                return { previousTeams };
            },
            onSuccess: (serverResponse, variables) => {
                toast.success("Team member added successfully!");

                // Silent replacement: merge server fields
                if (serverResponse?.membership) {
                    queryClient.setQueryData(
                        CACHE_KEY,
                        (old: any[] = []) =>
                            old.map(t => {
                                if (t.id === variables.teamId) {
                                    const updatedMembers = t.members.map((member: any) =>
                                        member.id === variables.userId
                                            ? {
                                                ...member, // Keep optimistic data
                                                role: serverResponse.membership.role.toLowerCase(),
                                                joinedAt: new Date(serverResponse.membership.createdAt),
                                                // IDs remain stable
                                            }
                                            : member
                                    );
                                    return { ...t, members: updatedMembers };
                                }
                                return t;
                            })
                    );
                }
            },
            onError: (error, variables, context) => {
                console.error("Failed to add team member:", error);

                // Rollback
                if (context?.previousTeams) {
                    queryClient.setQueryData(CACHE_KEY, context.previousTeams);
                }

                // Re-open dialog
                setOpen(true);

                // Handle type-safe errors
                if (isDefinedError(error)) {
                    if (error.code === 'MEMBER_ALREADY_EXISTS') {
                        toast.error("Member already exists in team");
                        return;
                    }
                    if (error.code === 'TEAM_NOT_FOUND') {
                        toast.error("Team not found");
                        return;
                    }
                }
                toast.error("Failed to add team member. Please try again.");
            }
        })
    );

    const handleSubmit = (data: { userId: string; role: "admin" | "member" }) => {
        const newMembershipId = generateUUID(); // Generate stable ID

        addMemberMutation.mutate({
            teamId: team.id,
            userId: data.userId,
            role: data.role,
            newMembershipId, // Pass to mutation
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>Add Member</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Team Member</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)}>
                        {/* Form fields */}
                        <Button type="submit" disabled={addMemberMutation.isPending}>
                            {addMemberMutation.isPending ? "Adding..." : "Add to Team"}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
```

---

## Summary Checklist

Before implementing optimistic updates, verify:

### ✅ Pre-Implementation
- [ ] Cache key defined as constant
- [ ] Complete TypeScript types for optimistic object
- [ ] All required fields identified

### ✅ During Implementation
- [ ] `onMutate`: Close dialog immediately
- [ ] `onMutate`: Cancel queries with correct cache key
- [ ] `onMutate`: Snapshot previous data
- [ ] `onMutate`: Create complete optimistic object
- [ ] `onMutate`: Update cache optimistically
- [ ] `onSuccess`: Silent replacement (or invalidate if safe)
- [ ] `onSuccess`: Toast success message
- [ ] `onError`: Rollback cache to snapshot
- [ ] `onError`: Re-open dialog
- [ ] `onError`: Toast error message

### ✅ Post-Implementation
- [ ] Test happy path (item appears immediately)
- [ ] Test error path (item disappears on error)
- [ ] Test no animation flash on success
- [ ] Test rapid sequential actions
- [ ] Test with slow network (DevTools)

---

**End of Guide**

For questions or clarifications, reference the production implementations:
- Teams: `src/app/(core-app)/dashboard/teams/`
- Knowledge Bases: `src/app/(core-app)/dashboard/projects/`
