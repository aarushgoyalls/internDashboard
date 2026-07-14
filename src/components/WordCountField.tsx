"use client";

import { useState } from "react";

// A plain named <textarea> with a live "N/max words" counter. Submits through
// the surrounding <form action={...}> like any other field — the word cap is
// re-checked server-side in the action itself; this is just live feedback.
export function WordCountField({
  name,
  label,
  maxWords,
  rows = 3,
  required = false,
  placeholder,
  defaultValue = "",
}: {
  name: string;
  label: string;
  maxWords: number;
  rows?: number;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const words = value.trim() ? value.trim().split(/\s+/).length : 0;
  const overLimit = words > maxWords;

  return (
    <div>
      <label className="block text-xs font-semibold text-muted">{label}</label>
      <textarea
        name={name}
        rows={rows}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="field mt-1"
      />
      <p className={`mt-1 text-xs ${overLimit ? "text-danger" : "text-subtle"}`}>
        {words}/{maxWords} words
      </p>
    </div>
  );
}
