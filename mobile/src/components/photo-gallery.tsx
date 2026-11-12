import { useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, colors } from "./ui";

export function PhotoGallery({
  images,
  onRemove,
  disabled = false,
}: {
  images: string[];
  onRemove?: (index: number) => void;
  disabled?: boolean;
}) {
  const { width } = useWindowDimensions();
  const [selected, setSelected] = useState<number | null>(null);
  const columns = width >= 1024 ? 4 : width >= 600 ? 3 : 2;
  return (
    <>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {images.map((uri, index) => (
          <View
            key={index}
            style={{ width: `${(100 - 4 * (columns - 1)) / columns}%` }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Xem ảnh xe ${index + 1}`}
              onPress={() => setSelected(index)}
              style={{
                borderRadius: 12,
                overflow: "hidden",
                backgroundColor: "#E6EDE8",
                borderWidth: 1,
                borderColor: colors.line,
              }}
            >
              <Image
                source={{ uri }}
                resizeMode="cover"
                style={{ width: "100%", aspectRatio: 1 }}
              />
              <Text
                style={{
                  position: "absolute",
                  bottom: 6,
                  right: 6,
                  backgroundColor: "#00000099",
                  color: "white",
                  borderRadius: 6,
                  paddingHorizontal: 6,
                  paddingVertical: 3,
                  fontSize: 12,
                }}
              >
                {index + 1}/{images.length}
              </Text>
            </Pressable>
            {onRemove && (
              <Button
                title={`Bỏ ảnh ${index + 1}`}
                secondary
                disabled={disabled}
                onPress={() => onRemove(index)}
              />
            )}
          </View>
        ))}
      </View>
      <Modal
        visible={selected !== null}
        animationType="fade"
        onRequestClose={() => setSelected(null)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "#101813" }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 16,
            }}
          >
            <Text style={{ color: "white", fontSize: 16 }}>
              Ảnh xe {(selected ?? 0) + 1}/{images.length}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đóng ảnh"
              onPress={() => setSelected(null)}
              style={{
                minHeight: 48,
                justifyContent: "center",
                paddingHorizontal: 16,
              }}
            >
              <Text style={{ color: "white", fontSize: 16 }}>Đóng ✕</Text>
            </Pressable>
          </View>
          {selected !== null && images[selected] && (
            <Image
              accessibilityLabel={`Ảnh xe ${selected + 1} đầy đủ`}
              source={{ uri: images[selected] }}
              resizeMode="contain"
              style={{ flex: 1, width: "100%" }}
            />
          )}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              padding: 16,
            }}
          >
            <Button
              title="Ảnh trước"
              disabled={selected === null || selected === 0}
              onPress={() =>
                setSelected((index) => Math.max(0, (index ?? 0) - 1))
              }
            />
            <Button
              title="Ảnh tiếp"
              disabled={selected === null || selected >= images.length - 1}
              onPress={() =>
                setSelected((index) =>
                  Math.min(images.length - 1, (index ?? 0) + 1),
                )
              }
            />
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}
