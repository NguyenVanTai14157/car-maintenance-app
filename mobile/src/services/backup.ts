import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
export async function exportBackup(data: unknown) {
  const file = new File(Paths.cache, "autocare-personal-backup.json");
  file.create({ overwrite: true });
  await file.write(JSON.stringify(data, null, 2));
  if (!(await Sharing.isAvailableAsync()))
    throw Error("Thiết bị chưa hỗ trợ chia sẻ file.");
  await Sharing.shareAsync(file.uri, {
    mimeType: "application/json",
    UTI: "public.json",
    dialogTitle: "Lưu bản sao lưu AutoCare",
  });
}
export async function chooseBackup() {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "text/plain"],
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  const file = new File(result.assets[0].uri);
  if (file.size > 28000000) throw Error("File sao lưu quá lớn.");
  let contents: string;
  try {
    contents = (await file.text()).replace(/^\uFEFF/, "").trim();
  } catch {
    throw Error("Không thể đọc tệp đã chọn. Hãy thử lưu tệp vào điện thoại rồi chọn lại.");
  }
  let backup: any;
  try {
    backup = JSON.parse(contents);
  } catch {
    throw Error("Tệp JSON bị lỗi hoặc chưa được lưu hoàn tất. Hãy xuất lại bản sao từ AutoCare.");
  }
  if (backup?.kind !== "autocare-personal" || backup?.version !== 1)
    throw Error("Tệp này không phải bản sao AutoCare tương thích. Hãy chọn đúng tệp sao lưu.");
  return backup;
}
