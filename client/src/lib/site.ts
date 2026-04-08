import type { PageKey, PreviewState } from "@business-automation/shared";

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function buildPreviewUrl(baseUrl: string, page: PageKey, state: PreviewState) {
  const url = new URL(baseUrl, window.location.origin);
  url.searchParams.set("state", state);
  url.searchParams.set("page", page);
  return url.toString();
}

export function toBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Could not read file."));
        return;
      }
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}
