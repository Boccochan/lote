/**
 * Shared long-document strings for desktop E2E capture (PR screenshots).
 * Keep in sync with `e2e-tauri/specs/desktop-capture.e2e.js` (Node cannot import this file).
 */

/** 100 lines of placeholder; first 4 and last 3 lines differ in {@link e2eLongDocAfter}. */
export function e2eLongDocBefore(): string {
  const lines: string[] = []
  for (let i = 1; i <= 100; i++) {
    lines.push(
      `Line ${i}: Lorem ipsum dolor sit amet, placeholder content for capture demo.`,
    )
  }
  return lines.join('\n')
}

export function e2eLongDocAfter(): string {
  const lines = e2eLongDocBefore().split('\n')
  for (let i = 0; i < 4; i++) {
    lines[i] =
      `Line ${i + 1} [EDITED]: Changed opening section for PR screenshot demo.`
  }
  for (let j = 0; j < 3; j++) {
    const idx = 97 + j
    lines[idx] =
      `Line ${idx + 1} [EDITED]: Changed closing section for PR screenshot demo.`
  }
  return lines.join('\n')
}
