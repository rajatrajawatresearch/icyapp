const xml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * The viewer's own name, repeated faintly across the whole screen. A website
 * cannot stop a phone taking a screenshot, so every screenshot or recording
 * carries who it was taken by instead. It ignores taps and clicks.
 */
export function Watermark({ text }: { text: string }) {
  const label = text.trim().slice(0, 60);
  if (!label) return null;
  // One tile of slanted text; the browser repeats it. Drawn as a mask so the
  // colour follows the theme (see .watermark in globals.css).
  const width = Math.max(240, label.length * 9 + 70);
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='170'>` +
    `<text x='50%' y='50%' text-anchor='middle' transform='rotate(-22 ${width / 2} 85)' ` +
    `font-family='system-ui,sans-serif' font-size='14' font-weight='700'>${xml(label)}</text></svg>`;
  const image = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  return (
    <div
      aria-hidden
      className="watermark"
      style={{ maskImage: image, WebkitMaskImage: image }}
    />
  );
}
