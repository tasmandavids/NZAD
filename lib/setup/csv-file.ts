// Client-side CSV / text file reading for setup import.

const MAX_BYTES = 512 * 1024; // 512 KB

export async function readTextFile(file: File): Promise<string> {
  if (file.size > MAX_BYTES) {
    throw new Error("File is too large — please use a file under 512 KB or paste the data instead.");
  }
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext && !["csv", "tsv", "txt"].includes(ext)) {
    throw new Error("Please upload a .csv, .tsv, or .txt file.");
  }
  return file.text();
}
