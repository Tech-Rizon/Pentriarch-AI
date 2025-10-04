import * as React from "react"

export interface CheckboxProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
  id?: string
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked = false,
  onCheckedChange,
  disabled = false,
  className = "",
  id
}) => {
  return (
    <label className="inline-flex items-center">
      <input
        type="checkbox"
        id={id}
        className={`form-checkbox h-4 w-4 text-emerald-600 transition duration-150 ease-in-out ${className}`}
        checked={checked}
        disabled={disabled}
        onChange={e => onCheckedChange?.(e.target.checked)}
        title="Toggle option"
        aria-label="Toggle option"
      />
    </label>
  )
}
