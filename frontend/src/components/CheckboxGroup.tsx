import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CheckboxGroupProps {
  questionId: string;
  question: string;
  options: string[];
  value?: string[];
  comment?: string;
  allowComment?: boolean;
  isRequired?: boolean;
  onChange: (value: string[]) => void;
  onCommentChange?: (comment: string) => void;
}

export default function CheckboxGroup({
  questionId,
  question,
  options,
  value = [],
  comment,
  allowComment,
  isRequired,
  onChange,
  onCommentChange,
}: CheckboxGroupProps) {
  const handleCheckChange = (option: string, checked: boolean) => {
    if (checked) {
      onChange([...value, option]);
    } else {
      onChange(value.filter((v) => v !== option));
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor={questionId} className="text-base font-medium">
          {question}
          {isRequired && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <p className="text-sm text-gray-500 mt-1">Select all that apply</p>
      </div>

      <div className="space-y-2">
        {options.map((option, index) => (
          <div key={index} className="flex items-center space-x-2">
            <Checkbox
              id={`${questionId}-${index}`}
              checked={value.includes(option)}
              onCheckedChange={(checked) =>
                handleCheckChange(option, checked as boolean)
              }
            />
            <Label
              htmlFor={`${questionId}-${index}`}
              className="font-normal cursor-pointer"
            >
              {option}
            </Label>
          </div>
        ))}
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
