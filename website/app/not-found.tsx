export default function NotFound() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "2rem" }}>
      <div style={{ maxWidth: 520, textAlign: "center" }}>
        <p style={{ textTransform: "uppercase", letterSpacing: "0.18em", opacity: 0.6 }}>Website not found</p>
        <h1 style={{ fontSize: "clamp(2.2rem, 6vw, 4rem)", marginBottom: "1rem" }}>This hostname is not mapped yet.</h1>
        <p style={{ opacity: 0.75 }}>Connect the preview or custom domain from the Axora admin, then publish the site again.</p>
      </div>
    </main>
  );
}
