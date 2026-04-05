import { motion } from "framer-motion";
import { Circle } from "lucide-react";
import { cn } from "@/lib/utils";

function ElegantShape({
  className,
  delay = 0,
  width = 400,
  height = 100,
  rotate = 0,
  gradient = "from-white/[0.08]",
}: {
  className?: string;
  delay?: number;
  width?: number;
  height?: number;
  rotate?: number;
  gradient?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -150, rotate: rotate - 15 }}
      animate={{ opacity: 1, y: 0, rotate: rotate }}
      transition={{
        duration: 2.4,
        delay,
        ease: [0.23, 0.86, 0.39, 0.96],
        opacity: { duration: 1.2 },
      }}
      className={cn("absolute", className)}
    >
      <motion.div
        animate={{ y: [0, 15, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        style={{ width, height }}
        className="relative"
      >
        <div
          className={cn(
            "absolute inset-0 rounded-full",
            "bg-gradient-to-r to-transparent",
            gradient,
            "backdrop-blur-[2px] border-2 border-white/[0.15]",
            "shadow-[0_8px_32px_0_rgba(255,255,255,0.1)]",
            "after:absolute after:inset-0 after:rounded-full",
            "after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent_70%)]"
          )}
        />
      </motion.div>
    </motion.div>
  );
}

function HeroGeometric({
  badge = "Business Automation",
  title1 = "Automate your",
  title2 = "business operations.",
  description = "Leads, payments, and reports handled automatically. No manual follow-ups. No messy spreadsheets.",
  onGetStarted,
  onBookDemo,
}: {
  badge?: string;
  title1?: string;
  title2?: string;
  description?: string;
  onGetStarted?: () => void;
  onBookDemo?: () => void;
}) {
  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 1,
        delay: 0.5 + i * 0.2,
        ease: [0.25, 0.4, 0.25, 1] as const,
      },
    }),
  };

  /* ── reusable inline style atoms ─────────────── */
  const gradText = (dir: string) => ({
    background: dir,
    WebkitBackgroundClip: "text" as const,
    WebkitTextFillColor: "transparent" as const,
    backgroundClip: "text" as const,
    display: "block",
  });

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        backgroundColor: "#030303",
      }}
    >
      {/* ── ambient glow ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(99,102,241,0.05), transparent 60%)," +
            "radial-gradient(ellipse 60% 40% at 80% 80%, rgba(244,63,94,0.05), transparent 60%)",
          filter: "blur(48px)",
          pointerEvents: "none",
        }}
      />

      {/* ── floating shapes ── */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        <ElegantShape delay={0.3} width={600} height={140} rotate={12}  gradient="from-indigo-500/[0.15]" className="left-[-10%] md:left-[-5%] top-[15%] md:top-[20%]" />
        <ElegantShape delay={0.5} width={500} height={120} rotate={-15} gradient="from-rose-500/[0.15]"   className="right-[-5%] md:right-[0%] top-[70%] md:top-[75%]" />
        <ElegantShape delay={0.4} width={300} height={80}  rotate={-8}  gradient="from-violet-500/[0.15]" className="left-[5%] md:left-[10%] bottom-[5%] md:bottom-[10%]" />
        <ElegantShape delay={0.6} width={200} height={60}  rotate={20}  gradient="from-amber-500/[0.15]"  className="right-[15%] md:right-[20%] top-[10%] md:top-[15%]" />
        <ElegantShape delay={0.7} width={150} height={40}  rotate={-25} gradient="from-cyan-500/[0.15]"   className="left-[20%] md:left-[25%] top-[5%] md:top-[10%]" />
      </div>

      {/* ── content block — all centered via inline styles ── */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: "860px",
          margin: "0 auto",
          padding: "100px 24px 80px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Badge */}
        <motion.div
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 16px 6px 8px",
            borderRadius: "100px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            marginBottom: "40px",
          }}
        >
          <Circle style={{ width: 8, height: 8, flexShrink: 0 }} className="fill-rose-500/80 text-rose-500/80" />
          <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", letterSpacing: "0.06em", fontWeight: 400 }}>
            {badge}
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          style={{
            fontSize: "clamp(44px, 8vw, 96px)",
            fontWeight: 800,
            lineHeight: 1.0,
            letterSpacing: "-0.025em",
            marginBottom: "24px",
            width: "100%",
          }}
        >
          <span style={gradText("linear-gradient(to bottom, #fff, rgba(255,255,255,0.8))")}>
            {title1}
          </span>
          <span style={gradText("linear-gradient(to right, #a5b4fc, rgba(255,255,255,0.9), #fda4af)")}>
            {title2}
          </span>
        </motion.h1>

        {/* Description */}
        <motion.p
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          style={{
            fontSize: "clamp(15px, 2vw, 20px)",
            color: "rgba(255,255,255,0.38)",
            fontWeight: 300,
            lineHeight: 1.7,
            letterSpacing: "0.02em",
            maxWidth: "500px",
            marginBottom: "44px",
          }}
        >
          {description}
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          custom={3}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", flexWrap: "wrap", marginBottom: "0" }}
        >
          <button
            onClick={onGetStarted}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "14px 32px",
              borderRadius: "100px",
              background: "rgba(255,255,255,0.95)",
              color: "#030303",
              fontSize: "14px",
              fontWeight: 600,
              letterSpacing: "0.04em",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = "#fff";
              (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 16px 40px rgba(255,255,255,0.15)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.95)";
              (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLElement).style.boxShadow = "none";
            }}
          >
            Get started
          </button>
          <button
            onClick={onBookDemo}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "14px",
              fontWeight: 400,
              color: "rgba(255,255,255,0.5)",
              letterSpacing: "0.03em",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              padding: 0,
              transition: "color 0.2s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.85)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.5)"; }}
          >
            Book a demo →
          </button>
        </motion.div>

        {/* ── Trust bar ── */}
        <motion.div
          custom={4}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          style={{
            marginTop: "64px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
            rowGap: "16px",
          }}
        >
          {/* Uptime */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 28px" }}>
            <span style={{ ...gradText("linear-gradient(to bottom, #fff, rgba(255,255,255,0.6))"), fontSize: "22px", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 }}>
              99%
            </span>
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", letterSpacing: "0.07em", textTransform: "uppercase" as const, marginTop: "4px", fontWeight: 400 }}>
              Uptime guaranteed
            </span>
          </div>

          {/* Sep */}
          <div style={{ width: "1px", height: "32px", background: "rgba(255,255,255,0.08)", flexShrink: 0 }} />

          {/* 24×7 */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 28px" }}>
            <span style={{ ...gradText("linear-gradient(to bottom, #fff, rgba(255,255,255,0.6))"), fontSize: "22px", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 }}>
              24×7
            </span>
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", letterSpacing: "0.07em", textTransform: "uppercase" as const, marginTop: "4px", fontWeight: 400 }}>
              Always working
            </span>
          </div>

          {/* Sep */}
          <div style={{ width: "1px", height: "32px", background: "rgba(255,255,255,0.08)", flexShrink: 0 }} />

          {/* Live status */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "0 28px" }}>
            <span
              style={{
                display: "inline-block",
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#4ade80",
                flexShrink: 0,
                animation: "axoraPulse 2s ease-in-out infinite",
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "2px" }}>
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.28)", letterSpacing: "0.06em", lineHeight: 1 }}>
                Live now
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                {["🇮🇳", "🇦🇪", "🇬🇧", "🇺🇸"].map(f => (
                  <span key={f} style={{ fontSize: "14px", lineHeight: 1 }}>{f}</span>
                ))}
                <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)" }}>& more</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Top + bottom vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to bottom, rgba(3,3,3,0.7) 0%, transparent 30%, transparent 70%, rgba(3,3,3,1) 100%)",
          pointerEvents: "none",
          zIndex: 2,
        }}
      />

      {/* Pulse keyframe */}
      <style>{`@keyframes axoraPulse { 0%,100%{opacity:1} 50%{opacity:0.35} }`}</style>
    </div>
  );
}

export { HeroGeometric };
