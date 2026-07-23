import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(request: Request) {
  const requested = new URL(request.url).searchParams.get("size");
  const size = requested === "192" ? 192 : 512;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#c65d3b",
        }}
      >
        <div
          style={{
            width: "68%",
            height: "68%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "28%",
            background: "#fbf8f2",
            boxShadow: `0 ${Math.round(size * 0.035)}px ${Math.round(size * 0.08)}px rgba(43,39,35,0.22)`,
          }}
        >
          <div
            style={{
              display: "flex",
              color: "#2b2723",
              fontSize: Math.round(size * 0.32),
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: "-0.07em",
              paddingRight: "0.07em",
            }}
          >
            H
          </div>
          <div style={{ display: "flex", gap: Math.round(size * 0.025), marginTop: Math.round(size * 0.035) }}>
            {['#e0b64f', '#2f6f6a', '#5a8f4e'].map((color) => (
              <span
                key={color}
                style={{
                  width: Math.round(size * 0.075),
                  height: Math.round(size * 0.075),
                  borderRadius: "50%",
                  background: color,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    ),
    {
      width: size,
      height: size,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    },
  );
}
