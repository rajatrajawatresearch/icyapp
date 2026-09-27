import { ImageResponse } from "next/og";

const SIZES = new Set([180, 192, 512]);

/** App icon (shopping bag on the brand colour). ?maskable=1 adds safe-zone padding. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const size = Number((await params).size);
  if (!SIZES.has(size)) return new Response("Not found", { status: 404 });
  const maskable = new URL(req.url).searchParams.has("maskable");
  const glyph = Math.round(size * (maskable ? 0.46 : 0.58));

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
        borderRadius: maskable || size === 180 ? 0 : Math.round(size * 0.22),
      }}
    >
      <svg
        width={glyph}
        height={glyph}
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          d="M5 8h14l-1.2 11.1A2 2 0 0 1 15.8 21H8.2a2 2 0 0 1-2-1.9L5 8z"
          fill="rgba(255,255,255,0.18)"
        />
        <path d="M9 10V7a3 3 0 0 1 6 0v3" />
      </svg>
    </div>,
    {
      width: size,
      height: size,
      headers: { "Cache-Control": "public, max-age=86400" },
    },
  );
}
