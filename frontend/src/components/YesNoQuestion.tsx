import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface YesNoQuestionProps {
  questionId: string;
  question: string;
  value?: string;
  comment?: string;
  allowComment?: boolean;
  isRequired?: boolean;
  onChange: (value: string) => void;
  onCommentChange?: (comment: string) => void;
}

export default function YesNoQuestion({
  questionId,
  question,
  value,
  comment,
  allowComment,
  isRequired,
  onChange,
  onCommentChange,
}: YesNoQuestionProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor={questionId} className="text-base font-medium">
          {question}
          {isRequired && <span className="text-red-500 ml-1">*</span>}
        </Label>
      </div>

      <RadioGroup value={value || ""} onValueChange={onChange}>
        <div className="flex gap-6">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id={`${questionId}-yes`} />
            <Label
              htmlFor={`${questionId}-yes`}
              className="font-normal cursor-pointer"
            >
              Yes
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id={`${questionId}-no`} />
            <Label
              htmlFor={`${questionId}-no`}
              className="font-normal cursor-pointer"
            >
              No
            </Label>
          </div>
        </div>
      </RadioGroup>

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
