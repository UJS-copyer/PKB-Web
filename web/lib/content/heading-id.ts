export function idFromHeading(text: string) {
  return encodeURIComponent(
    text
      .trim()
      .toLowerCase()
      .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
      .replace(/\s+/g, "-")
  );
}
