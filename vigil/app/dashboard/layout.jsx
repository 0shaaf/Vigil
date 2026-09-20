export default function DashboardLayout({ children }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* 1. Left column: Stays on screen permanently */}
      <aside style={{ width: "200px", borderRight: "1px solid #ccc" }}>
        <p>Sidebar Navigation</p>
      </aside>

      {/* 2. Right column: Swaps out depending on what route you visit */}
      <main style={{ flex: 1, padding: "20px" }}>
        {children}
      </main>
    </div>
  );
}