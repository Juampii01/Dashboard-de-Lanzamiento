/**
 * ArcadeAmbient — pixel floating stars + corner clusters.
 * Pure decorative. Matches v4 mockup ambient layer.
 * Server component (no state needed).
 */

const STARS = [
  { left: "8%",  top: "18%", color: "#FFD60A", delay: "0s",    dur: "3s"   },
  { left: "92%", top: "25%", color: "#00D4FF", delay: "0.5s",  dur: "4s"   },
  { left: "15%", top: "60%", color: "#D7263D", delay: "1s",    dur: "5s"   },
  { left: "88%", top: "72%", color: "#00D67A", delay: "1.5s",  dur: "3.5s" },
  { left: "5%",  top: "84%", color: "#FFD60A", delay: "2s",    dur: "4.5s" },
  { left: "50%", top: "8%",  color: "#00D4FF", delay: "0.7s",  dur: "6s"   },
  { left: "70%", top: "44%", color: "#FFD60A", delay: "2.5s",  dur: "3s"   },
  { left: "25%", top: "91%", color: "#D7263D", delay: "3s",    dur: "4s"   },
] as const;

// Each cluster: cross of 5 dots — [top, left, center, right, bottom]
const CLUSTER_POSITIONS = [
  { top: "96px",  left: "32px"  },
  { top: "130px", right: "32px" },
  { bottom: "80px", left: "32px"  },
  { bottom: "110px", right: "60px" },
] as const;

const DOT_OFFSETS = [
  { top: "0px",  left: "8px"  },
  { top: "8px",  left: "0px"  },
  { top: "8px",  left: "8px"  },
  { top: "8px",  left: "16px" },
  { top: "16px", left: "8px"  },
] as const;

export function ArcadeAmbient() {
  return (
    <>
      {/* 8 twinkling pixel stars */}
      {STARS.map((s, i) => (
        <div
          key={i}
          className="px-star"
          style={{
            left: s.left,
            top: s.top,
            background: s.color,
            boxShadow: `0 0 6px ${s.color}`,
            animationDuration: s.dur,
            animationDelay: s.delay,
          }}
          aria-hidden
        />
      ))}

      {/* 4 corner pixel clusters */}
      {CLUSTER_POSITIONS.map((pos, ci) => (
        <div
          key={ci}
          aria-hidden
          style={{
            position: "fixed",
            pointerEvents: "none",
            zIndex: 1,
            opacity: 0.45,
            ...pos,
          }}
        >
          {DOT_OFFSETS.map((d, di) => (
            <div
              key={di}
              style={{
                position: "absolute",
                width: "4px",
                height: "4px",
                background: "#FFD60A",
                ...d,
              }}
            />
          ))}
        </div>
      ))}
    </>
  );
}
