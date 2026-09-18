import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#f7f8f5",
          color: "#17352e",
          display: "flex",
          height: "100%",
          justifyContent: "space-between",
          padding: "72px 82px",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
            maxWidth: 790,
          }}
        >
          <div
            style={{
              color: "#d16b3d",
              display: "flex",
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            Paris Pulse
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 62,
              fontWeight: 700,
              letterSpacing: -2,
              lineHeight: 1.05,
            }}
          >
            Know what changed around you.
          </div>
          <div
            style={{
              color: "#48645b",
              display: "flex",
              fontSize: 28,
            }}
          >
            Local updates and resources for Paris, Ontario
          </div>
        </div>
        <div
          style={{
            alignItems: "center",
            background: "#214f43",
            borderRadius: 999,
            color: "#f7f8f5",
            display: "flex",
            fontSize: 54,
            height: 156,
            justifyContent: "center",
            width: 156,
          }}
        >
          PP
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}