import React from "react";

interface Props {
  value?: Date;
  mode?: "date" | "time" | "datetime";
  display?: string;
  onChange?: (event: any, date?: Date | null) => void;
  style?: any;
}

export default function DateTimePickerWeb({
  value,
  mode = "date",
  onChange,
  style,
}: Props) {
  const formatted = value ? value.toISOString().slice(0, 10) : "";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value; // YYYY-MM-DD
    const date = val ? new Date(`${val}T00:00:00`) : null;
    onChange &&
      onChange({ type: date ? "set" : "dismissed" }, date ?? undefined);
  };

  const inputType =
    mode === "date" ? "date" : mode === "time" ? "time" : "datetime-local";

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <input
      type={inputType}
      value={formatted}
      onChange={handleChange}
      style={Object.assign({ fontSize: 14 }, style as any)}
    />
  );
}
