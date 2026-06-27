import React from "react";
import Sidebar from "./sidebar";

export default function Layout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#0f1117]">
      <Sidebar />

      <main className="flex-1 h-screen overflow-y-auto lg:ml-[240px]">
        <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
          {children}
        </div>
      </main>
    </div>
  );
}