interface LikertScaleProps {
  value: number | undefined;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  minLabel?: string;
  maxLabel?: string;
}

export default function LikertScale({
  value,
  onChange,
  min = 1,
  max = 5,
  minLabel = "Strongly Disagree",
  maxLabel = "Strongly Agree",
}: LikertScaleProps) {
  const options = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  // Define colors for each option (gradient from disagree to agree)
  const getButtonColor = (option: number, isSelected: boolean) => {
    const position = ((option - min) / (max - min)) * 100;

    if (isSelected) {
      if (position <= 25) return "bg-red-500 hover:bg-red-600";
      if (position <= 40) return "bg-orange-500 hover:bg-orange-600";
      if (position <= 60) return "bg-stone-400 hover:bg-stone-500";
      if (position <= 80) return "bg-lime-500 hover:bg-lime-600";
      return "bg-green-500 hover:bg-green-600";
    }

    return "bg-gray-100 hover:bg-gray-200";
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm text-gray-600 px-2">
        <span className="font-medium text-red-600">{minLabel}</span>
        <span className="font-medium text-green-600">{maxLabel}</span>
      </div>

      <div className="flex justify-between items-center gap-2 px-2">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={`
              flex-1 aspect-square max-w-[4rem] rounded-full font-semibold transition-all duration-200
              ${
                value === option
                  ? `${getButtonColor(option, true)} text-white transform scale-110 shadow-lg animate-[pop_0.3s_ease-out]`
                  : `${getButtonColor(option, false)} text-gray-700 hover:scale-105`
              }
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cerulean
            `}
            aria-label={`Rate ${option} out of ${max}`}
          >
            {option}
          </button>
        ))}
      </div>

      {/* Mobile-friendly touch slider */}
      <div className="sm:hidden mt-4">
        <input
          type="range"
          min={min}
          max={max}
          value={value || min}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 bg-gradient-to-r from-red-400 via-stone-400 to-green-500 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, rgb(248 113 113) 0%, rgb(168 162 158) 50%, rgb(34 197 94) 100%)`,
          }}
        />
        <div className="text-center text-sm text-gray-600 mt-2 font-medium">
          {value ? `Selected: ${value}` : "Slide or tap to select"}
        </div>
      </div>
    </div>
  );
}
