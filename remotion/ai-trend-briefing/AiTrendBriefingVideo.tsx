import React from "react";
import {
  AbsoluteFill,
  Easing,
  cancelRender,
  continueRender,
  delayRender,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig
} from "remotion";
import type { AiTrendVideoProps } from "./types";

const palette = {
  ink: "#08141f",
  panel: "#102437",
  soft: "#18344d",
  accent: "#ff7a18",
  accentSoft: "#ffb26b",
  text: "#f4f7fb",
  muted: "#b6c5d4",
  line: "rgba(255,255,255,0.12)"
};

const miSansStylesheetHrefs = [
  staticFile("fonts/misans/MiSans-Regular.min.css"),
  staticFile("fonts/misans/MiSans-Semibold.min.css"),
  staticFile("fonts/misans/MiSans-Bold.min.css")
];

const fontWarmupTexts = [
  "AI\u9700\u6c42\u8d8b\u52bf\u6838\u5fc3\u7ed3\u8bba",
  "\u516c\u5f00\u6765\u6e90\u672c\u671f\u65b9\u5411",
  "\u672c\u6bb5\u7126\u70b9\u6458\u8981"
] as const;

const labels = {
  publishedAt: "\u53d1\u5e03\u65e5\u671f",
  sourceSignals: "\u516c\u5f00\u6765\u6e90",
  coreConclusion: "\u6838\u5fc3\u7ed3\u8bba",
  sceneFocus: "\u672c\u6bb5\u7126\u70b9",
  directions: "\u672c\u671f\u65b9\u5411",
  summary: "\u6458\u8981"
} as const;

let miSansReadyPromise: Promise<void> | null = null;

function loadStylesheet(href: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`link[data-ai-trend-font="${href}"]`) as HTMLLinkElement | null;
    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
        return;
      }

      const handleLoad = () => {
        cleanup();
        resolve();
      };
      const handleError = () => {
        cleanup();
        reject(new Error(`Failed to load font stylesheet: ${href}`));
      };
      const cleanup = () => {
        existing.removeEventListener("load", handleLoad);
        existing.removeEventListener("error", handleError);
      };

      existing.addEventListener("load", handleLoad);
      existing.addEventListener("error", handleError);
      return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.aiTrendFont = href;
    link.onload = () => {
      link.dataset.loaded = "true";
      resolve();
    };
    link.onerror = () => reject(new Error(`Failed to load font stylesheet: ${href}`));
    document.head.appendChild(link);
  });
}

function ensureMiSansFonts() {
  if (typeof document === "undefined") {
    return Promise.resolve();
  }

  if (!miSansReadyPromise) {
    miSansReadyPromise = Promise.all(miSansStylesheetHrefs.map((href) => loadStylesheet(href)))
      .then(async () => {
        if (document.fonts?.load) {
          await Promise.all([
            document.fonts.load("400 32px MiSans", fontWarmupTexts[0]),
            document.fonts.load("520 32px MiSans", fontWarmupTexts[1]),
            document.fonts.load("630 32px MiSans", fontWarmupTexts[2])
          ]);
        }

        if (document.fonts?.ready) {
          await document.fonts.ready;
        }
      })
      .catch((error) => {
        miSansReadyPromise = null;
        throw error;
      });
  }

  return miSansReadyPromise;
}

function fadeUp(frame: number, start: number, distance = 28) {
  return {
    opacity: interpolate(frame, [start, start + 12], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1)
    }),
    transform: `translateY(${interpolate(frame, [start, start + 12], [distance, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1)
    })}px)`
  };
}

export const AiTrendBriefingVideo: React.FC<AiTrendVideoProps> = ({
  date,
  title,
  coreConclusion,
  summary,
  sourceCount,
  directions,
  scenes
}) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const [fontsReady, setFontsReady] = React.useState(false);
  const [fontHandle] = React.useState(() => delayRender("Load AI trend video fonts"));
  const activeIndex = Math.min(scenes.length - 1, Math.floor(frame / 90));
  const scene = scenes[activeIndex] ?? scenes[0];

  React.useEffect(() => {
    let cancelled = false;

    ensureMiSansFonts()
      .then(() => {
        if (cancelled) {
          return;
        }

        setFontsReady(true);
        continueRender(fontHandle);
      })
      .catch((error) => {
        console.error("Failed to load AI trend video fonts.", error);
        cancelRender(fontHandle);
      });

    return () => {
      cancelled = true;
    };
  }, [fontHandle]);

  if (!fontsReady) {
    return null;
  }

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at top left, ${palette.soft} 0%, ${palette.ink} 54%, #050b12 100%)`,
        color: palette.text,
        fontFamily: '"MiSans","Microsoft YaHei","PingFang SC","Noto Sans SC","Segoe UI",sans-serif'
      }}
    >
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          opacity: 0.28
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 40,
          border: `1px solid ${palette.line}`,
          borderRadius: 34,
          padding: 52,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          overflow: "hidden",
          boxShadow: "0 28px 80px rgba(0,0,0,0.32)",
          background: "linear-gradient(180deg, rgba(16,36,55,0.92) 0%, rgba(7,17,27,0.92) 100%)"
        }}
      >
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24 }}>
            <div style={{ ...fadeUp(frame, 0), maxWidth: width * 0.72 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 18px",
                  borderRadius: 999,
                  border: `1px solid ${palette.line}`,
                  color: palette.accentSoft,
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: "0.08em"
                }}
              >
                AI DEMAND TRENDS
              </div>
              <h1
                style={{
                  margin: "24px 0 0",
                  fontSize: 64,
                  lineHeight: 1.08,
                  fontWeight: 900
                }}
              >
                {title}
              </h1>
            </div>

            <div
              style={{
                ...fadeUp(frame, 6),
                minWidth: 220,
                padding: "18px 20px",
                borderRadius: 24,
                background: "rgba(255,255,255,0.06)",
                border: `1px solid ${palette.line}`
              }}
            >
              <div style={{ fontSize: 18, color: palette.muted, fontWeight: 700 }}>{labels.publishedAt}</div>
              <div style={{ marginTop: 10, fontSize: 30, fontWeight: 900 }}>{date}</div>
              <div style={{ marginTop: 18, fontSize: 18, color: palette.muted, fontWeight: 700 }}>{labels.sourceSignals}</div>
              <div style={{ marginTop: 10, fontSize: 30, fontWeight: 900 }}>{sourceCount}</div>
            </div>
          </div>

          <div
            style={{
              ...fadeUp(frame, 12),
              marginTop: 28,
              padding: "28px 30px",
              borderRadius: 28,
              border: `1px solid ${palette.line}`,
              background: "linear-gradient(135deg, rgba(255,122,24,0.16), rgba(255,255,255,0.04))"
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, color: palette.accentSoft }}>{labels.coreConclusion}</div>
            <p style={{ margin: "14px 0 0", fontSize: 32, lineHeight: 1.5, fontWeight: 700 }}>{coreConclusion}</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 28, alignItems: "stretch" }}>
          <div
            style={{
              ...fadeUp(frame, 18),
              borderRadius: 28,
              border: `1px solid ${palette.line}`,
              background: "rgba(255,255,255,0.04)",
              padding: 28
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, color: palette.accentSoft }}>{labels.sceneFocus}</div>
            <h2 style={{ margin: "14px 0 0", fontSize: 44, lineHeight: 1.15, fontWeight: 900 }}>{scene?.title}</h2>
            <p style={{ margin: "16px 0 0", fontSize: 28, lineHeight: 1.55, color: palette.muted }}>{scene?.body}</p>
          </div>

          <div
            style={{
              ...fadeUp(frame, 24),
              borderRadius: 28,
              border: `1px solid ${palette.line}`,
              background: "rgba(255,255,255,0.04)",
              padding: 28,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between"
            }}
          >
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: palette.accentSoft }}>{labels.directions}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 16 }}>
                {directions.map((direction) => (
                  <div
                    key={direction}
                    style={{
                      padding: "10px 16px",
                      borderRadius: 999,
                      border: `1px solid ${palette.line}`,
                      background: "rgba(255,255,255,0.05)",
                      fontSize: 22,
                      fontWeight: 800
                    }}
                  >
                    {direction}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 28 }}>
              <div style={{ fontSize: 20, color: palette.muted, fontWeight: 700 }}>{labels.summary}</div>
              <p style={{ margin: "12px 0 0", fontSize: 24, lineHeight: 1.6, color: palette.text }}>{summary}</p>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          right: 62,
          bottom: 42,
          fontSize: 18,
          color: palette.muted,
          letterSpacing: "0.12em",
          textTransform: "uppercase"
        }}
      >
        ENHE AI / Trend Briefing
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          width: `${interpolate(frame, [0, scenes.length * 90], [12, width - 80], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp"
          })}px`,
          height: 8,
          background: `linear-gradient(90deg, ${palette.accent}, ${palette.accentSoft})`
        }}
      />
    </AbsoluteFill>
  );
};
