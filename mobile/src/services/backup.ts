import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
export async function exportBackup(data: unknown) {
  const file = new File(Paths.cache, "autocare-personal-backup.json");
  file.create({ overwrite: true });
  file.write(JSON.stringify(data, null, 2));
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
  try {
    return JSON.parse(await file.text());
  } catch {
    throw Error("Không đọc được file JSON.");
  }
}
