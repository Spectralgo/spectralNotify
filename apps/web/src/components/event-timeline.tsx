import { AlertCircle, CheckCircle2, Info, Loader2, XCircle } from "lucide-react";
import { motion } from "motion/react";
import type * as React from "react";

import { cn } from "@/lib/utils";
import { Progress } from "./ui/progress";

type EventType = "log" | "progress" | "error" | "success" | "phase-progress" | "workflow-progress" | "cancel";

interface TaskEvent {
  id: string;
  timestamp: Date;
  type: EventType;
  message: string;
  progress?: number;
  metadata?: Record<string, unknown>;
}

interface EventTimelineProps extends React.ComponentProps<"div"> {
  events: TaskEvent[];
}

const eventIcons: Record<
  EventType,
  React.ComponentType<{ className?: string }>
> = {
  log: Info,
  progress: Loader2,
  error: AlertCircle,
  success: CheckCircle2,
  "phase-progress": Loader2,
  "workflow-progress": Loader2,
  cancel: XCircle,
};

const eventColors: Record<EventType, string> = {
  log: "text-muted-foreground bg-muted",
  progress: "text-primary bg-primary/10",
  error: "text-destructive bg-destructive/10",
  success: "text-primary bg-primary/10",
  "phase-progress": "text-primary bg-primary/10",
  "workflow-progress": "text-primary bg-primary/10",
  cancel: "text-muted-foreground bg-muted",
};

function formatTimestamp(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function EventTimeline({ events, className, ...props }: EventTimelineProps) {
  const renderTime = Date.now();
  const renderTimestamp = new Date().toISOString();

  console.log(
    `[EventTimeline] 🎨 RENDER Start | eventCount=${events.length} | timestamp=${renderTimestamp}`
  );

  // Events should be in reverse chronological order (newest first)
  const sortedEvents = [...events].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );

  // Log each event being rendered
  sortedEvents.forEach((event, idx) => {
    console.log(
      `[EventTimeline] 📄 Rendering Event #${idx + 1} | type=${event.type} | message="${event.message}" | eventTimestamp=${event.timestamp.toISOString()}`
    );
  });

  const sortDuration = Date.now() - renderTime;
  console.log(
    `[EventTimeline] ✅ RENDER Complete | eventCount=${events.length} | sortDuration=${sortDuration}ms`
  );

  return (
    <div
      className={cn("flex flex-col gap-3", className)}
      data-slot="event-timeline"
      {...props}
    >
      <h3 className="font-semibold text-sm text-foreground uppercase tracking-wider">
        Event Timeline
      </h3>
      <div className="space-y-2">
        {sortedEvents.map((event, index) => {
          const Icon = eventIcons[event.type];
          return (
            <motion.div
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                "flex gap-3 rounded-[var(--radius-md)] border border-border bg-secondary/40 p-3",
                eventColors[event.type]
              )}
              initial={{ opacity: 0, x: -20 }}
              key={event.id}
              transition={{ delay: index * 0.05 }}
            >
              {/* Icon */}
              <div className="mt-0.5 flex-shrink-0">
                <Icon className="h-4 w-4" />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="flex-1 text-sm">{event.message}</p>
                  <span className="whitespace-nowrap text-xs opacity-70">
                    {formatTimestamp(event.timestamp)}
                  </span>
                </div>

                {/* Progress bar for progress events */}
                {(event.type === "progress" || event.type === "phase-progress" || event.type === "workflow-progress") && event.progress !== undefined && (
                  <div className="flex items-center gap-2">
                    <Progress className="h-[6px]" value={event.progress} />
                    <span className="whitespace-nowrap font-medium text-xs">
                      {Math.round(event.progress)}%
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export { EventTimeline };
export type { TaskEvent, EventType };
