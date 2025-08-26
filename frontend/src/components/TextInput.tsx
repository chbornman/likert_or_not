interface TextInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
  helpText?: string;
  type?: string;
}

export default function TextInput({
  label,
  value,
  onChange,
  required = false,
  placeholder,
  maxLength,
  helpText,
  type = "text",
}: TextInputProps) {
  return (
    <div className="mb-6">
      <label className="block text-gray-700 font-medium mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {helpText && <p className="text-sm text-gray-600 mb-2">{helpText}</p>}

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder={placeholder}
        maxLength={maxLength}
        required={required}
      />

      {maxLength && (
        <p className="text-xs text-gray-500 mt-1">
          {value.length}/{maxLength} characters
        </p>
      )}
    </div>
  );
}
