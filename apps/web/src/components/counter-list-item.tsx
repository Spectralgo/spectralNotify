import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CounterListItemProps {
  name: string;
  isActive: boolean;
  onClick: () => void;
}

export function CounterListItem({
  name,
  isActive,
  onClick,
}: CounterListItemProps) {
  return (
    <Button
      className="w-full justify-between"
      onClick={onClick}
      variant={isActive ? "secondary" : "ghost"}
    >
      <span className="truncate font-medium">{name}</span>
      <ChevronRight className="h-4 w-4 flex-shrink-0" />
    </Button>
  );
}
