spectralNotify — User Guide (Task Feed UI)

spectralNotify gives you an “inbox” for background jobs. Each job is a Task with a Task ID. The app shows tasks on the left, a task list in the middle, and detailed, live updates on the right.

How the screen is organized
Left sidebar — Filters

Use these to decide which tasks you want to see:

All, Active, Completed, Failed — each shows a count badge when available.

(Optional) New section for subscriptions you create later.

Middle pane — Task feed

A searchable list of tasks that match your current filter.

Search bar (top): type all or part of a Task ID (“Search by Task ID…”).

Each task row shows:

Task ID (primary label)

Status pill (Active/Completed/Failed)

Progress bar (if the task reports progress)

Last event snippet (quick summary)

Relative time (e.g., “2m ago”)

Click a row to open its details on the right.

Right pane — Task details

A live view of everything that happened for the selected task.

Header: Task ID, status, and actions (e.g., Copy ID)

Event timeline: newest events at the top (reverse chronological)

Update mode:

Live (recommended): real-time stream of events

Poll: refreshes periodically if live stream isn’t available

Common things you’ll do
1) Find and follow a task

Pick a filter in the left sidebar (e.g., Active).

Use the search bar to type part or all of a Task ID.

Click the task in the middle list to open its details.

Watch the timeline in the right pane as new events arrive.

2) Monitor a long-running job

Set the filter to Active.

Open the task; ensure Live is toggled on.

Keep an eye on the progress bar and the most recent event at the top.

3) Investigate a failed task

Choose Failed in the left sidebar.

Click the task to open details.

Read the latest events at the top of the timeline (look for error messages).

Click Copy ID to share the Task ID with a teammate or paste into logs.

4) Check what finished recently

Choose Completed in the left sidebar.

Scan the middle list; the most recent completions appear near the top.

Click a task to view final results in the right pane.

5) Switch between Live and Poll

In the right pane, toggle Live to get updates in real time.

If your network blocks streams, switch to Poll to refresh automatically.

Reading the UI at a glance

Status pill

Active: task is running or still emitting events

Completed: task finished successfully (no new events expected)

Failed: task ended with an error (see latest event for details)

Progress bar

Shows reported percentage when available

If hidden, the task doesn’t report progress (check the timeline instead)

Last event snippet

A quick summary of the most recent update (e.g., “Validated 120 files”)

Relative time

How long ago the last event was received (“just now”, “5m ago”, “2h ago”)

Tips & shortcuts

Copy Task ID from the header in the right pane to share or search later.

Fast filtering: switch sidebar filters to quickly narrow the list.

Search is prefix/substring friendly: partial IDs work.

Empty states:

“No tasks yet” — nothing has been ingested for this filter

“No matches” — adjust your search or filter

Glossary

Task: a background job you’re tracking.

Task ID: the unique identifier for a task (use it to search, share, or debug).

Event: a change or update emitted by the task (e.g., progress, log, completed, failed).

Live: real-time updates pushed to your browser.

Poll: periodic refresh if live streaming isn’t possible.

That’s it! Use the left sidebar to filter, the middle list to find tasks quickly, and the right details pane to follow every event as it happens.