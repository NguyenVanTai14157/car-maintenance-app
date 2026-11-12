import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { useState } from "react";
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Button, colors, s } from "./ui";
import {
  dateLabel,
  dateValue,
  localDate,
  type DateFieldProps,
} from "./date-values";

/** Keep date-only values as YYYY-MM-DD, without conversion through UTC. */
export function DateField({
  label,
  value,
  onChange,
  minimum,
  maximum,
  clearable = true,
  hint,
}: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(new Date());
  const show = () => {
    Keyboard.dismiss();
    let selected = dateValue(value) || new Date();
    const min = dateValue(minimum),
      max = dateValue(maximum);
    if (min && selected < min) selected = min;
    if (max && selected > max) selected = max;
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: selected,
        mode: "date",
        display: "calendar",
        minimumDate: min,
        maximumDate: max,
        positiveButton: { label: "Chọn ngày", textColor: colors.green },
        negativeButton: { label: "Hủy" },
        onValueChange: (_, date) => onChange(localDate(date)),
      });
    } else {
      setDraft(selected);
      setOpen(true);
    }
  };
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={s.label}>{label}</Text>
      <View style={s.inputRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityHint="Mở lịch để chọn ngày"
          onPress={show}
          style={{
            flex: 1,
            minHeight: 52,
            padding: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Text
            style={{
              flex: 1,
              color: value ? colors.ink : colors.muted,
              fontSize: 16,
            }}
          >
            {value ? dateLabel(value) : "Chọn ngày"}
          </Text>
          <Text style={{ fontSize: 18 }} accessibilityElementsHidden>
            ▦
          </Text>
        </Pressable>
        {clearable && !!value && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Xóa ${label.toLowerCase()}`}
            onPress={() => onChange("")}
            style={{
              minWidth: 48,
              minHeight: 48,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={s.smallLink}>Xóa</Text>
          </Pressable>
        )}
      </View>
      {!!hint && <Text style={s.hint}>{hint}</Text>}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "#00000066",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <View
            accessibilityViewIsModal
            style={{
              backgroundColor: "white",
              borderRadius: 20,
              padding: 16,
              width: "100%",
              maxWidth: 430,
              maxHeight: "90%",
              alignSelf: "center",
            }}
          >
            <ScrollView>
              <Text style={s.heading}>{label}</Text>
              {open && (
                <DateTimePicker
                  value={draft}
                  mode="date"
                  display="inline"
                  locale="vi-VN"
                  themeVariant="light"
                  accentColor={colors.green}
                  minimumDate={dateValue(minimum)}
                  maximumDate={dateValue(maximum)}
                  onValueChange={(_, date) => setDraft(date)}
                />
              )}
              <Button
                title="Chọn ngày"
                onPress={() => {
                  onChange(localDate(draft));
                  setOpen(false);
                }}
              />
              <Button title="Hủy" secondary onPress={() => setOpen(false)} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
