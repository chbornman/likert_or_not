import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface NumberInputProps {
  questionId: string;
  question: string;
  value?: number;
  comment?: string;
  allowComment?: boolean;
  isRequired?: boolean;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  onChange: (value: number | undefined) => void;
  onCommentChange?: (comment: string) => void;
}

export default function NumberInput({
  questionId,
  question,
  value,
  comment,
  allowComment,
  isRequired,
  min,
  max,
  step = 1,
  placeholder = "Enter a number",
  onChange,
  onCommentChange,
}: NumberInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "") {
      onChange(undefined);
    } else {
      const numVal = parseFloat(val);
      if (!isNaN(numVal)) {
        onChange(numVal);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor={questionId} className="text-base font-medium">
          {question}
          {isRequired && <span className="text-red-500 ml-1">*</span>}
        </Label>
        {(min !== undefined || max !== undefined) && (
          <p className="text-sm text-gray-500 mt-1">
            {min !== undefined && max !== undefined
              ? `Enter a value between ${min} and ${max}`
              : min !== undefined
                ? `Minimum value: ${min}`
                : `Maximum value: ${max}`}
          </p>
        )}
      </div>

      <Input
        id={questionId}
        type="number"
        value={value ?? ""}
        onChange={handleChange}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
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
