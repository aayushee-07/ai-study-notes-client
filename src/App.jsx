import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/login.jsx";
import Register from "./pages/register.jsx";
import ForgotPassword from "./pages/forgotpassword.jsx";
import ResetPassword from "./pages/resetpassword.jsx";
import Dashboard from "./pages/dashboard.jsx";
import Notes from "./pages/notes.jsx";
import CreateNotes from "./pages/createnotes.jsx";
import NoteDetails from "./pages/notesDetails.jsx";
import EditNote from "./pages/Editnote.jsx";
import Profile from "./pages/profile.jsx";
import Favorites from "./pages/favourite.jsx";
import AdminDashboard from "./pages/admindashboard.jsx";
import UploadPDF from "./pages/uploadPdf.jsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            localStorage.getItem("token")
              ? <Navigate to="/dashboard" replace />
              : <Navigate to="/login" replace />
          }
        />

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/notes" element={<Notes />} />
        <Route path="/notes/create" element={<CreateNotes />} />
        <Route path="/notes/:id" element={<NoteDetails />} />
        <Route path="/notes/edit/:id" element={<EditNote />} />

        <Route path="/profile" element={<Profile />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/upload" element={<UploadPDF />} />

        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />

        <Route
          path="*"
          element={
            <div className="min-h-screen flex items-center justify-center bg-[#090b10] text-white">
              <div className="text-center">
                <h1 className="mb-2 text-6xl font-black">404</h1>
                <p className="text-slate-400">Page Not Found</p>
              </div>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;