import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";

interface RatingScaleProps {
  questionId: string;
  question: string;
  value?: number;
  comment?: string;
  allowComment?: boolean;
  isRequired?: boolean;
  min?: number;
  max?: number;
  ratingStyle?: "stars" | "numbers";
  onChange: (value: number) => void;
  onCommentChange?: (comment: string) => void;
}

export default function RatingScale({
  questionId,
  question,
  value,
  comment,
  allowComment,
  isRequired,
  min = 1,
  max = 5,
  ratingStyle = "stars",
  onChange,
  onCommentChange,
}: RatingScaleProps) {
  const [hoveredValue, setHoveredValue] = useState<number | null>(null);
  const range = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  const renderStars = () => (
    <div className="flex gap-1">
      {range.map((rating) => (
        <button
          key={rating}
          type="button"
          onClick={() => onChange(rating)}
          onMouseEnter={() => setHoveredValue(rating)}
          onMouseLeave={() => setHoveredValue(null)}
          className="transition-colors"
          aria-label={`Rate ${rating} out of ${max}`}
        >
          <Star
            className={`w-8 h-8 ${
              (
                hoveredValue !== null
                  ? rating <= hoveredValue
                  : rating <= (value || 0)
              )
                ? "fill-stone-400 text-stone-400"
                : "text-gray-300"
            }`}
          />
        </button>
      ))}
    </div>
  );

  const renderNumbers = () => (
    <div className="flex gap-2">
      {range.map((rating) => (
        <button
          key={rating}
          type="button"
          onClick={() => onChange(rating)}
          className={`w-10 h-10 rounded-full border-2 transition-colors ${
            value === rating
              ? "bg-cerulean text-white border-cerulean"
              : "border-gray-300 hover:border-cambridge-blue"
          }`}
        >
          {rating}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor={questionId} className="text-base font-medium">
          {question}
          {isRequired && <span className="text-red-500 ml-1">*</span>}
        </Label>
      </div>

      <div className="flex items-center gap-4">
        {ratingStyle === "stars" ? renderStars() : renderNumbers()}
        {value && (
          <span className="text-sm text-gray-600">
            {value} / {max}
          </span>
        )}
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
