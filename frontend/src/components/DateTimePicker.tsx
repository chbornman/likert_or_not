import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";

interface DateTimePickerProps {
  questionId: string;
  question: string;
  value?: string;
  comment?: string;
  allowComment?: boolean;
  isRequired?: boolean;
  type: "date" | "time" | "datetime";
  min?: string;
  max?: string;
  onChange: (value: string) => void;
  onCommentChange?: (comment: string) => void;
}

export default function DateTimePicker({
  questionId,
  question,
  value,
  comment,
  allowComment,
  isRequired,
  type,
  min,
  max,
  onChange,
  onCommentChange,
}: DateTimePickerProps) {
  const [date, setDate] = React.useState<Date | undefined>(
    value ? new Date(value) : undefined,
  );
  const [time, setTime] = React.useState<string>(() => {
    if (value && type === "datetime") {
      const d = new Date(value);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }
    return "12:00";
  });

  React.useEffect(() => {
    if (date) {
      if (type === "date") {
        onChange(format(date, "yyyy-MM-dd"));
      } else if (type === "datetime") {
        const [hours, minutes] = time.split(":").map(Number);
        const dateTime = new Date(date);
        dateTime.setHours(hours, minutes, 0, 0);
        onChange(dateTime.toISOString());
      }
    }
  }, [date, time, type, onChange]);

  const getPlaceholder = () => {
    switch (type) {
      case "date":
        return "Select a date";
      case "time":
        return "Select a time";
      case "datetime":
        return "Select date and time";
      default:
        return "Select";
    }
  };

  const formatDisplay = () => {
    if (!date) return getPlaceholder();

    if (type === "date") {
      return format(date, "PPP");
    } else if (type === "datetime") {
      return `${format(date, "PPP")} at ${time}`;
    }
    return "";
  };

  if (type === "time") {
    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor={questionId} className="text-base font-medium">
            {question}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </Label>
        </div>

        <Input
          id={questionId}
          type="time"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          min={min}
          max={max}
          required={isRequired}
          className="max-w-xs"
        />

        {allowComment && (
          <div className="mt-4">
            <Label
              htmlFor={`${questionId}-comment`}
              className="text-sm text-gray-600"
            >
              Additional comments (optional)
            </Label>
            <Textarea
              id={`${questionId}-comment`}
              value={comment || ""}
              onChange={(e) => onCommentChange?.(e.target.value)}
              placeholder="Add any additional comments here..."
              className="mt-1"
              rows={3}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor={questionId} className="text-base font-medium">
          {question}
          {isRequired && <span className="text-red-500 ml-1">*</span>}
        </Label>
      </div>

      <div className="flex gap-2 items-center">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id={questionId}
              variant="outline"
              className={cn(
                "justify-start text-left font-normal",
                type === "datetime" ? "w-[280px]" : "w-[240px]",
                !date && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formatDisplay()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              initialFocus
              disabled={(date) => {
                if (min && date < new Date(min)) return true;
                if (max && date > new Date(max)) return true;
                return false;
              }}
            />
            {type === "datetime" && (
              <div className="p-3 border-t">
                <Label htmlFor={`${questionId}-time`} className="text-sm">
                  Time
                </Label>
                <Input
                  id={`${questionId}-time`}
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {allowComment && (
        <div className="mt-4">
          <Label
            htmlFor={`${questionId}-comment`}
            className="text-sm text-gray-600"
          >
            Additional comments (optional)
          </Label>
          <Textarea
            id={`${questionId}-comment`}
            value={comment || ""}
            onChange={(e) => onCommentChange?.(e.target.value)}
            placeholder="Add any additional comments here..."
            className="mt-1"
            rows={3}
          />
        </div>
      )}
    </div>
  );
}
