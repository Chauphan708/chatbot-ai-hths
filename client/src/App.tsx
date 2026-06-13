/**
 * App — Router setup
 */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { ToastContainer } from "./components/ui";

// Pages
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { TeacherDashboard } from "./pages/teacher/TeacherDashboard";
import { BotCreatePage } from "./pages/teacher/BotCreatePage";
import { BotDetailPage } from "./pages/teacher/BotDetailPage";
import { AnalyticsPage } from "./pages/teacher/AnalyticsPage";
import { ClassManagementPage } from "./pages/teacher/ClassManagementPage";
import { ParentDashboard } from "./pages/parent/ParentDashboard";
import { AddChildPage } from "./pages/parent/AddChildPage";
import { ChildHistoryPage } from "./pages/parent/ChildHistoryPage";
import { StudentChatPage } from "./pages/student/StudentChatPage";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { ConversationDetail } from "./pages/admin/ConversationDetail";

// Styles
import "./pages/pages.css";

/** Redirect authenticated users to their dashboard */
function HomeRedirect() {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) return null;

  if (isAuthenticated && user) {
    const dashboardMap = {
      teacher: "/teacher",
      parent: "/parent",
      student: "/student",
      admin: "/admin",
    } as const;
    return <Navigate to={dashboardMap[user.role]} replace />;
  }

  return <Navigate to="/login" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Student chat (public with auth) */}
          <Route path="/chat/:shareCode" element={<StudentChatPage />} />

          {/* Teacher (protected) */}
          <Route
            path="/teacher"
            element={
              <ProtectedRoute allowedRoles={["teacher"]}>
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/bots/new"
            element={
              <ProtectedRoute allowedRoles={["teacher"]}>
                <BotCreatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/bots/:botId"
            element={
              <ProtectedRoute allowedRoles={["teacher"]}>
                <BotDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/analytics/:botId"
            element={
              <ProtectedRoute allowedRoles={["teacher"]}>
                <AnalyticsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/classes"
            element={
              <ProtectedRoute allowedRoles={["teacher"]}>
                <ClassManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/*"
            element={
              <ProtectedRoute allowedRoles={["teacher"]}>
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />

          {/* Parent (protected) */}
          <Route
            path="/parent"
            element={
              <ProtectedRoute allowedRoles={["parent"]}>
                <ParentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/parent/children/add"
            element={
              <ProtectedRoute allowedRoles={["parent"]}>
                <AddChildPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/parent/children/:childId/history"
            element={
              <ProtectedRoute allowedRoles={["parent"]}>
                <ChildHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/parent/*"
            element={
              <ProtectedRoute allowedRoles={["parent"]}>
                <ParentDashboard />
              </ProtectedRoute>
            }
          />

          {/* Admin (protected) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/conversations/:id"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <ConversationDetail />
              </ProtectedRoute>
            }
          />

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ToastContainer />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
