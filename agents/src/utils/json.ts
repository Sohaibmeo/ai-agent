export function extractJsonBlock(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Response did not include a JSON object");
  }

  return text.slice(start, end + 1);
}
