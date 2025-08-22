interface TextAreaInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
  helpText?: string;
}

export default function TextAreaInput({
  label,
  value,
  onChange,
  required = false,
  placeholder,
  maxLength,
  rows = 5,
  helpText,
}: TextAreaInputProps) {
  const charCount = value.length;
  const charLimit = maxLength || 1000;
  const charPercentage = (charCount / charLimit) * 100;
  const isNearLimit = charPercentage > 90;

  return (
    <div className="mb-6">
      <label className="block text-gray-700 font-medium mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      {helpText && (
        <p className="text-sm text-gray-600 mb-2">{helpText}</p>
      )}
      
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder={placeholder}
        maxLength={maxLength}
        rows={rows}
        required={required}
      />
      
      {maxLength && (
        <div className="mt-1">
          <div className="flex justify-between items-center">
            <div className="w-full bg-gray-200 rounded-full h-1 mr-3">
              <div
                className={`h-1 rounded-full transition-all ${
                  isNearLimit ? 'bg-stone-400' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(charPercentage, 100)}%` }}
              />
            </div>
            <span className={`text-xs ${isNearLimit ? 'text-stone-600' : 'text-gray-500'}`}>
              {charCount}/{charLimit}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}