import Sidebar from "./sidebar";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f1117]">
      <Sidebar />

      <main className="lg:ml-[260px] min-h-screen">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}