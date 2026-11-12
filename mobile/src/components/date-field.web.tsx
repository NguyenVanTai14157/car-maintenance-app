import { Text, View } from "react-native";
import { colors, s } from "./ui";
import type { DateFieldProps } from "./date-values";

export function DateField({
  label,
  value,
  onChange,
  minimum,
  maximum,
  clearable = true,
  hint,
}: DateFieldProps) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={s.label}>{label}</Text>
      <View style={s.inputRow}>
        <input
          type="date"
          aria-label={label}
          value={value || ""}
          min={minimum}
          max={maximum}
          onChange={(e) => {
            if (e.currentTarget.value || clearable)
              onChange(e.currentTarget.value);
          }}
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 52,
            padding: "12px 14px",
            boxSizing: "border-box",
            font: "inherit",
            fontSize: 16,
            color: colors.ink,
            background: "transparent",
            border: 0,
            borderRadius: 12,
            colorScheme: "light",
          }}
        />
        {clearable && !!value && (
          <button
            type="button"
            aria-label={`Xóa ${label.toLowerCase()}`}
            onClick={() => onChange("")}
            style={{
              minWidth: 48,
              minHeight: 48,
              background: "transparent",
              border: 0,
              color: colors.green,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Xóa
          </button>
        )}
      </View>
      {!!hint && <Text style={s.hint}>{hint}</Text>}
    </View>
  );
}
