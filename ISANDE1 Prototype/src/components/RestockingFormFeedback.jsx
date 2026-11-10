import { useRef, useState } from "react";

export function useRestockingForm(errors, onSubmit, enabled) {
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);
  const visibleErrors = enabled && checked ? errors : {};

  async function submit(event) {
    event.preventDefault();
    if (inFlight.current) return;

    const first = Object.keys(errors)[0];
    if (enabled && first) {
      setChecked(true);
      const field = event.currentTarget.elements.namedItem(first);
      requestAnimationFrame(() => field?.focus());
      return;
    }

    setChecked(false);
    inFlight.current = true;
    setSaving(true);
    try {
      await onSubmit(event);
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  function field(id) {
    return {
      id,
      "aria-invalid": visibleErrors[id] ? true : undefined,
      "aria-describedby": visibleErrors[id] ? `${id}-error` : undefined,
    };
  }

  return { submit, saving, errors: visibleErrors, field };
}

export function FieldError({ errors, id }) {
  return errors[id] && <span id={`${id}-error`} className="block mt-1 text-sm text-[#F6A59F]">{errors[id]}</span>;
}

export function FormErrorSummary({ errors }) {
  if (!Object.keys(errors).length) return null;
  return (
    <p role="alert" className="rounded-card border border-warning/60 bg-warning/10 px-4 py-3 text-sm">
      Check the highlighted fields below, then try again. Your entries are still here.
    </p>
  );
}
