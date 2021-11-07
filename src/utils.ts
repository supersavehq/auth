export function timeInSeconds(): number {
  return Math.round(new Date().getTime() / 1000);
}
