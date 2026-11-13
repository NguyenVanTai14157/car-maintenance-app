import { useMemo, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import {
  Button,
  Card,
  colors,
  confirm,
  Empty,
  ErrorText,
  Feedback,
  Field,
  Heading,
  Screen,
  useSubmit,
} from "../components/ui";
import { useData } from "../hooks/data";
import { api } from "../services/api";

export default function Categories() {
  const q = useData("/categories");
  const [edit, setEdit] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [actionsFor, setActionsFor] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const task = useSubmit();
  const categories = useMemo(
    () =>
      (q.data || []).filter((category: any) =>
        normalizeSearch(category.name).includes(normalizeSearch(search)),
      ),
    [q.data, search],
  );

  async function save() {
    await api(
      "/categories" + (edit ? "/" + edit.id : ""),
      edit ? "PATCH" : "POST",
      { name, active: edit?.active ?? true },
    );
    setEdit(null);
    setShowForm(false);
    setName("");
    await q.reload();
  }

  return (
    <Screen title="Hạng mục bảo dưỡng" refresh={q.reload}>
      <ErrorText text={q.error} />
      <Card>
        <View style={styles.row}>
          <View style={styles.nameColumn}>
            <Heading>Danh sách hạng mục ({(q.data || []).length})</Heading>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setEdit(null);
              setName("");
              setShowForm(!showForm);
            }}
            style={styles.addAction}
          >
            <Text style={styles.addText}>{showForm ? "Đóng" : "+ Thêm"}</Text>
          </Pressable>
        </View>
      </Card>

      <Modal
        visible={showForm}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowForm(false);
          setEdit(null);
          setName("");
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Heading>{edit ? "Sửa hạng mục" : "Thêm hạng mục"}</Heading>
            <Field
              label="Tên hạng mục"
              placeholder="Ví dụ: Thay dầu động cơ, kiểm tra phanh"
              value={name}
              onChange={setName}
            />
            <Button
              title={edit ? "Lưu thay đổi" : "Lưu hạng mục"}
              disabled={task.busy || !name.trim()}
              onPress={() => void task.run(save)}
            />
            <Button
              title="Hủy"
              secondary
              onPress={() => {
                setShowForm(false);
                setEdit(null);
                setName("");
              }}
            />
            <Feedback task={task} />
          </View>
        </View>
      </Modal>

      {(q.data || []).length > 4 && (
        <Card>
          <Field
            label="Tìm hạng mục"
            placeholder="Nhập tên hạng mục"
            value={search}
            onChange={setSearch}
          />
        </Card>
      )}

      {categories.length ? (
        categories.map((category: any) => (
          <Card key={category.id}>
            <View style={styles.row}>
              <View style={styles.nameColumn}>
                <Text style={styles.name}>{category.name}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Thao tác ${category.name}`}
                onPress={() => setActionsFor(actionsFor === category.id ? null : category.id)}
                style={styles.action}
              >
                <Text style={styles.editText}>•••</Text>
              </Pressable>
            </View>
            {actionsFor === category.id && (
              <View style={styles.actionMenu}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setEdit(category);
                    setName(category.name);
                    setShowForm(true);
                    setActionsFor(null);
                  }}
                  style={styles.menuItem}
                >
                  <Text style={styles.editText}>Sửa hạng mục</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={task.busy}
                  onPress={() =>
                    confirm(`Xóa hạng mục “${category.name}”?`, () =>
                      void task.run(async () => {
                        await api("/categories/" + category.id, "DELETE");
                        setActionsFor(null);
                        await q.reload();
                      }),
                    )
                  }
                  style={styles.menuItem}
                >
                  <Text style={styles.deleteText}>Xóa hạng mục</Text>
                </Pressable>
              </View>
            )}
          </Card>
        ))
      ) : (
        <Empty
          text={search.trim() ? "Không tìm thấy hạng mục phù hợp." : "Chưa có hạng mục nào."}
        />
      )}
    </Screen>
  );
}

const styles = {
  row: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  nameColumn: { flex: 1, minWidth: 0 } as const,
  name: { color: colors.ink, fontSize: 16, fontWeight: "700" as const },
  action: {
    minWidth: 52,
    minHeight: 42,
    paddingHorizontal: 12,
    borderRadius: 11,
    backgroundColor: "#EEF4EF",
    borderColor: colors.line,
    borderWidth: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  addAction: {
    minHeight: 42,
    justifyContent: "center" as const,
    paddingHorizontal: 12,
    borderRadius: 11,
    backgroundColor: colors.green,
  },
  addText: { color: "white", fontSize: 14, fontWeight: "700" as const },
  actionMenu: {
    flexDirection: "row" as const,
    justifyContent: "flex-end" as const,
    gap: 8,
    marginTop: 12,
  },
  menuItem: {
    minHeight: 40,
    justifyContent: "center" as const,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#EEF4EF",
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center" as const,
    padding: 24,
    backgroundColor: "rgba(15, 34, 28, 0.45)",
  },
  modalCard: {
    width: "100%" as const,
    maxWidth: 480,
    alignSelf: "center" as const,
    padding: 20,
    borderRadius: 20,
    backgroundColor: "white",
    gap: 8,
  },
  editText: { color: colors.green, fontSize: 14, fontWeight: "700" as const },
  deleteText: { color: "#A8443E", fontSize: 14, fontWeight: "700" as const },
};

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLocaleLowerCase("vi")
    .trim()
    .replace(/\s+/g, " ");
}
