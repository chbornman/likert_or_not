import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface DateTimePickerProps {
  questionId: string;
  question: string;
  value?: string;
  comment?: string;
  allowComment?: boolean;
  isRequired?: boolean;
  type: 'date' | 'time' | 'datetime';
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
  const getInputType = () => {
    switch (type) {
      case 'date':
        return 'date';
      case 'time':
        return 'time';
      case 'datetime':
        return 'datetime-local';
      default:
        return 'date';
    }
  };

  const getPlaceholder = () => {
    switch (type) {
      case 'date':
        return 'Select a date';
      case 'time':
        return 'Select a time';
      case 'datetime':
        return 'Select date and time';
      default:
        return 'Select';
    }
  };

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
        type={getInputType()}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        max={max}
        placeholder={getPlaceholder()}
        required={isRequired}
        className="max-w-xs"
      />

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