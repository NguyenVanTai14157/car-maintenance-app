import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Button, colors, Heading } from "./ui";

export function PeriodPicker({
  mode,
  value,
  onChange,
}: {
  mode: "month" | "year";
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const closeWith = (next: string) => {
    onChange(next);
    setOpen(false);
  };
  return (
    <>
      <Button
        title={
          value
            ? mode === "month"
              ? `Tháng ${Number(value.slice(5))}/${value.slice(0, 4)}`
              : `Năm ${value}`
            : mode === "month"
              ? "Chọn tháng"
              : "Chọn năm"
        }
        secondary
        onPress={() => {
          setYear(value ? Number(value.slice(0, 4)) : new Date().getFullYear());
          setOpen(true);
        }}
      />
      {!!value && (
        <Button
          title={
            mode === "month" ? "Xem tất cả các tháng" : "Xem tất cả các năm"
          }
          secondary
          onPress={() => onChange("")}
        />
      )}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            backgroundColor: "#00000066",
            padding: 16,
          }}
        >
          <View
            accessibilityViewIsModal
            style={{
              backgroundColor: "white",
              borderRadius: 20,
              padding: 16,
              maxWidth: 430,
              width: "100%",
              maxHeight: "90%",
              alignSelf: "center",
            }}
          >
            <ScrollView>
              <Heading>
                {mode === "month" ? "Chọn tháng cần xem" : "Chọn năm cần xem"}
              </Heading>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginVertical: 12,
                }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Năm trước"
                  disabled={year <= 1}
                  onPress={() => setYear(year - 1)}
                  style={{
                    minWidth: 48,
                    minHeight: 48,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: colors.green, fontSize: 26 }}>‹</Text>
                </Pressable>
                <Heading>Năm {year}</Heading>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Năm tiếp theo"
                  disabled={year >= 9999}
                  onPress={() => setYear(year + 1)}
                  style={{
                    minWidth: 48,
                    minHeight: 48,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: colors.green, fontSize: 26 }}>›</Text>
                </Pressable>
              </View>
              {mode === "month" ? (
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                    const next = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
                    return (
                      <Pressable
                        key={month}
                        accessibilityRole="button"
                        accessibilityLabel={`Chọn tháng ${month} năm ${year}`}
                        onPress={() => closeWith(next)}
                        style={{
                          width: "30%",
                          minHeight: 48,
                          justifyContent: "center",
                          alignItems: "center",
                          borderRadius: 10,
                          backgroundColor:
                            value === next ? colors.green : "#EEF4EF",
                        }}
                      >
                        <Text
                          style={{
                            color: value === next ? "white" : colors.ink,
                          }}
                        >
                          Tháng {month}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <Button
                  title={`Xem năm ${year}`}
                  onPress={() => closeWith(String(year).padStart(4, "0"))}
                />
              )}
              <Button
                title={
                  mode === "month"
                    ? "Tất cả các tháng"
                    : "Tất cả các năm"
                }
                secondary
                onPress={() => closeWith("")}
              />
              <Button title="Đóng" secondary onPress={() => setOpen(false)} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
