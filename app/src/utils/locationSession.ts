export function createLocationSessionToken(): string {
  const randomPart = Math.random().toString(36).slice(2, 14);
  const timePart = Date.now().toString(36);
  return `${timePart}-${randomPart}`.slice(0, 36);
}
