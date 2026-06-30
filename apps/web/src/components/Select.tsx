import { Select as BaseSelect } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type SelectOption = {
  value: string;
  label: string;
};

type SelectProps = {
  /** Form field name. Renders a hidden input so the value submits with the form. */
  name?: string;
  options: SelectOption[];
  /** Initial value. Match against `options[].value`; use `""` for an "any" option. */
  defaultValue?: string;
  /** Small label rendered above the trigger, associated with it for screen readers. */
  label?: string;
  /** Shown in the trigger when no option is selected. */
  placeholder?: string;
  /** Accessible name when there is no `label`. */
  "aria-label"?: string;
  disabled?: boolean;
  /** Extra classes merged onto the trigger button. */
  className?: string;
  onValueChange?: (value: string) => void;
  /**
   * Submit the nearest form whenever the value changes — the JS-enabled
   * equivalent of a native `<select onChange>` auto-submit. The submit runs in
   * an effect, not inside `onValueChange`, because Base UI's hidden input is
   * controlled: its new value only lands in the DOM after React commits, so a
   * synchronous submit would serialise the previous value.
   */
  submitOnChange?: boolean;
};

const triggerClass =
  "group flex min-w-36 items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 outline-none transition hover:border-white/20 hover:bg-white/10 focus-visible:border-white/25 focus-visible:bg-white/10 data-[popup-open]:border-white/25 data-[popup-open]:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50";

const popupClass =
  "max-h-[var(--available-height)] min-w-[var(--anchor-width)] origin-[var(--transform-origin)] overflow-y-auto rounded-lg border border-white/10 bg-zinc-900/95 p-1 text-sm text-zinc-100 shadow-xl shadow-black/50 outline-none backdrop-blur transition-[opacity,transform] data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0";

const itemClass =
  "flex cursor-default items-center justify-between gap-3 rounded-md py-1.5 pr-2 pl-3 outline-none select-none data-[highlighted]:bg-white/10 data-[selected]:text-white";

/**
 * The site's base `<select>`: a Base UI Select styled to match the dark filter
 * surfaces. Renders a hidden input under `name`, so it drops into a native form
 * exactly like the element it replaces (shareable GET-form URLs still work);
 * pair with `submitOnChange` to auto-submit on selection.
 *
 * Note: unlike a native `<select>`, the dropdown needs client JS to open. The
 * trigger and its hidden input still render server-side, so the current value
 * and the "Apply" button keep working without JS.
 */
export const Select = ({
  name,
  options,
  defaultValue = "",
  label,
  placeholder,
  disabled,
  className,
  onValueChange,
  submitOnChange,
  "aria-label": ariaLabel,
}: SelectProps) => {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const submittedValue = useRef(value);

  useEffect(() => {
    // Submit only on a real value change, never on mount. Comparing the value
    // (rather than a "mounted" flag) also makes this a no-op under StrictMode's
    // double-invoked mount effect, which would otherwise fire a spurious submit.
    if (value === submittedValue.current) return;
    submittedValue.current = value;
    if (submitOnChange) inputRef.current?.form?.requestSubmit();
  }, [value, submitOnChange]);

  return (
    <BaseSelect.Root
      name={name}
      items={options}
      value={value}
      inputRef={inputRef}
      disabled={disabled}
      onValueChange={(next) => {
        const nextValue = next ?? "";
        setValue(nextValue);
        onValueChange?.(nextValue);
      }}
    >
      <div className="flex flex-col gap-1">
        {label ? (
          <BaseSelect.Label className="text-xs font-medium text-zinc-500">{label}</BaseSelect.Label>
        ) : null}
        <BaseSelect.Trigger
          aria-label={ariaLabel}
          className={className ? `${triggerClass} ${className}` : triggerClass}
        >
          <BaseSelect.Value placeholder={placeholder} />
          <BaseSelect.Icon>
            <ChevronDown
              className="h-4 w-4 text-zinc-500 transition-transform group-data-[popup-open]:rotate-180"
              aria-hidden
            />
          </BaseSelect.Icon>
        </BaseSelect.Trigger>
      </div>

      <BaseSelect.Portal>
        <BaseSelect.Positioner className="z-50" sideOffset={6} alignItemWithTrigger={false}>
          <BaseSelect.Popup className={popupClass}>
            {options.map((option) => (
              <BaseSelect.Item key={option.value} value={option.value} className={itemClass}>
                <BaseSelect.ItemText>{option.label}</BaseSelect.ItemText>
                <BaseSelect.ItemIndicator className="text-amber-400">
                  <Check className="h-4 w-4" aria-hidden />
                </BaseSelect.ItemIndicator>
              </BaseSelect.Item>
            ))}
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
};
