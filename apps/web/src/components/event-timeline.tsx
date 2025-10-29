import { AlertCircle, CheckCircle2, Info, Loader2, XCircle } from "lucide-react";
import { motion } from "motion/react";
import type * as React from "react";

import { cn } from "@/lib/utils";

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

const eventIconColors: Record<EventType, string> = {
  log: "text-gray-400",
  progress: "text-blue-500",
  error: "text-red-500",
  success: "text-emerald-500",
  "phase-progress": "text-blue-500",
  "workflow-progress": "text-blue-500",
  cancel: "text-gray-400",
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

  // Events in reverse chronological order (newest first)
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
      <h3 className="font-normal text-xs text-muted-foreground/40 mb-1">
        Events
      </h3>
      <div className="space-y-2">
        {sortedEvents.map((event, index) => {
          // Determine if this is a completed progress event
          const isProgressEvent = event.type === "progress" || event.type === "phase-progress" || event.type === "workflow-progress";
          const isCompleted = isProgressEvent && event.progress === 100;

          // Use success icon/color for 100% progress events
          const Icon = isCompleted ? CheckCircle2 : eventIcons[event.type];
          const iconColor = isCompleted ? "text-emerald-500" : eventIconColors[event.type];

          return (
            <motion.div
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                "flex gap-3 rounded-[var(--radius-md)] border border-border/30 bg-secondary/20 p-3",
                "transition-colors duration-150 hover:bg-secondary/30"
              )}
              initial={{ opacity: 0, x: -10 }}
              key={event.id}
              transition={{ delay: index * 0.03, duration: 0.2 }}
            >
              {/* Icon */}
              <div className="mt-0.5 flex-shrink-0">
                <Icon className={cn("h-4 w-4", iconColor)} />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="flex-1 text-sm text-foreground">{event.message}</p>
                  <span className="whitespace-nowrap text-xs text-muted-foreground/50">
                    {formatTimestamp(event.timestamp)}
                  </span>
                </div>

                {/* Progress bar for progress events */}
                {isProgressEvent && event.progress !== undefined && (
                  <div className="flex items-center gap-2">
                    <div className="relative h-[6px] w-full overflow-hidden rounded-full border border-border/50 bg-border/20">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          isCompleted
                            ? "bg-gradient-to-r from-emerald-500/60 to-emerald-600/80"
                            : "bg-gradient-to-r from-blue-500/60 to-blue-600/80"
                        )}
                        style={{ width: `${event.progress}%` }}
                      />
                    </div>
                    <span className={cn(
                      "whitespace-nowrap font-medium text-xs",
                      isCompleted ? "text-emerald-500" : "text-blue-500"
                    )}>
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
