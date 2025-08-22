import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DropdownSelectProps {
  questionId: string;
  question: string;
  options: string[];
  value?: string;
  comment?: string;
  allowComment?: boolean;
  isRequired?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
  onCommentChange?: (comment: string) => void;
}

export default function DropdownSelect({
  questionId,
  question,
  options,
  value,
  comment,
  allowComment,
  isRequired,
  placeholder = 'Select an option',
  onChange,
  onCommentChange,
}: DropdownSelectProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor={questionId} className="text-base font-medium">
          {question}
          {isRequired && <span className="text-red-500 ml-1">*</span>}
        </Label>
      </div>
      
      <Select value={value || ''} onValueChange={onChange}>
        <SelectTrigger id={questionId}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option, index) => (
            <SelectItem key={index} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {allowComment && (
        <div className="mt-4">
          <Label htmlFor={`${questionId}-comment`} className="text-sm text-gray-600">
            Additional comments (optional)
          </Label>
          <Textarea
            id={`${questionId}-comment`}
            value={comment || ''}
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