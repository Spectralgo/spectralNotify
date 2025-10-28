import type { CounterOperation } from "@spectralNotify/api/types/counter";
import { formatDistanceToNow } from "date-fns";
import { ArrowDown, ArrowUp, Edit, RotateCcw } from "lucide-react";

interface CounterHistoryTimelineProps {
  history: CounterOperation[];
}

function getOperationIcon(operation: string) {
  if (operation.startsWith("increment")) {
    return <ArrowUp className="h-4 w-4 text-green-500" />;
  }
  if (operation.startsWith("decrement")) {
    return <ArrowDown className="h-4 w-4 text-red-500" />;
  }
  if (operation.startsWith("setValue")) {
    return <Edit className="h-4 w-4 text-blue-500" />;
  }
  if (operation.startsWith("reset")) {
    return <RotateCcw className="h-4 w-4 text-orange-500" />;
  }
  return <Edit className="h-4 w-4 text-gray-500" />;
}

function getOperationColor(operation: string) {
  if (operation.startsWith("increment")) {
    return "text-green-700 dark:text-green-400";
  }
  if (operation.startsWith("decrement")) {
    return "text-red-700 dark:text-red-400";
  }
  if (operation.startsWith("setValue")) {
    return "text-blue-700 dark:text-blue-400";
  }
  if (operation.startsWith("reset")) {
    return "text-orange-700 dark:text-orange-400";
  }
  return "text-gray-700 dark:text-gray-400";
}

export function CounterHistoryTimeline({
  history,
}: CounterHistoryTimelineProps) {
  if (history.length === 0) {
    return (
      <p className="py-4 text-center text-muted-foreground text-sm">
        No operations yet
      </p>
    );
  }

  return (
    <div className="max-h-96 space-y-4 overflow-y-auto">
      {history.map((item) => (
        <div className="flex gap-3" key={item.id}>
          {/* Icon */}
          <div className="mt-1 flex-shrink-0">
            {getOperationIcon(item.operation)}
          </div>

          {/* Content */}
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <p
                className={`font-medium text-sm ${getOperationColor(item.operation)}`}
              >
                {item.operation}
              </p>
              <span className="text-muted-foreground text-xs">
                {formatDistanceToNow(new Date(item.timestamp), {
                  addSuffix: true,
                })}
              </span>
            </div>
            <p className="text-muted-foreground text-xs">
              {item.previousValue} → {item.newValue}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
