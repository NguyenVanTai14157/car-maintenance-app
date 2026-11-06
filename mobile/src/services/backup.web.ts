export async function exportBackup(data: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "autocare-personal-backup.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function chooseBackup(): Promise<any> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.oncancel = () => resolve(null);
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      if (file.size > 28000000) {
        reject(Error("File sao lưu quá lớn."));
        return;
      }
      try {
        resolve(JSON.parse(await file.text()));
      } catch {
        reject(Error("Không đọc được file JSON."));
      }
    };
    input.click();
  });
}
