import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Body, colors, Field, Heading } from "./ui";

export type FilterOption = { value: string | number; label: string };

export function FilterDropdown({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string | number;
  onChange: (value: any) => void;
  options: FilterOption[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = options.find((option) => option.value === value) || options[0];
  const visible = useMemo(
    () =>
      options.filter((option) =>
        normalize(option.label).includes(normalize(search)),
      ),
    [options, search],
  );
  return (
    <View style={styles.column}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label || "Tất cả"}. Mở danh sách`}
        onPress={() => {
          setSearch("");
          setOpen(true);
        }}
        style={styles.trigger}
      >
        <Text numberOfLines={1} style={styles.value}>
          {selected?.label || "Tất cả"}
        </Text>
        <Text style={styles.arrow}>⌄</Text>
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.backdrop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đóng danh sách lựa chọn"
            onPress={() => setOpen(false)}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.headingRow}>
              <Heading>{label}</Heading>
              <Pressable accessibilityRole="button" onPress={() => setOpen(false)}>
                <Text style={styles.close}>Đóng</Text>
              </Pressable>
            </View>
            {options.length > 6 && (
              <Field
                label="Tìm kiếm"
                placeholder={`Nhập ${label.toLocaleLowerCase("vi")}`}
                value={search}
                onChange={setSearch}
              />
            )}
            <ScrollView keyboardShouldPersistTaps="handled" style={styles.list}>
              {visible.map((option) => {
                const active = option.value === value;
                return (
                  <Pressable
                    key={String(option.value)}
                    accessibilityRole="button"
                    onPress={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    style={[styles.option, active && styles.selected]}
                  >
                    <Text style={[styles.optionText, active && styles.selectedText]}>
                      {option.label}
                    </Text>
                    {active && <Text style={styles.check}>✓</Text>}
                  </Pressable>
                );
              })}
              {!visible.length && <Body>Không tìm thấy lựa chọn phù hợp.</Body>}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLocaleLowerCase("vi")
    .trim();
}

const styles = {
  column: { flex: 1, minWidth: 0 } as const,
  label: {
    color: colors.ink,
    fontWeight: "700" as const,
    fontSize: 13,
    marginBottom: 7,
  },
  trigger: {
    minHeight: 48,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "white",
  },
  value: { flex: 1, minWidth: 0, color: colors.ink, fontSize: 13 },
  arrow: {
    color: colors.green,
    fontSize: 16,
    lineHeight: 18,
    fontWeight: "700" as const,
    transform: [{ translateY: -4 }],
  },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end" as const,
    backgroundColor: "rgba(15, 34, 28, 0.45)",
  },
  sheet: {
    maxHeight: "82%" as const,
    backgroundColor: "#F3F6F4",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handle: {
    alignSelf: "center" as const,
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#B8C6BE",
    marginBottom: 16,
  },
  headingRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  close: { color: colors.green, fontWeight: "700" as const },
  list: { marginTop: 8 },
  option: {
    minHeight: 50,
    paddingHorizontal: 14,
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },
  selected: { backgroundColor: "#E7F2E8", borderColor: colors.green },
  optionText: { flex: 1, color: colors.ink, fontSize: 15 },
  selectedText: { fontWeight: "700" as const },
  check: { color: colors.green, fontWeight: "800" as const, fontSize: 18 },
};
