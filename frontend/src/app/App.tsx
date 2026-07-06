import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"

import { AppShell } from "@/components/layout/AppShell"
import { AuthProvider } from "@/features/auth/AuthProvider"
import { LoginPage } from "@/features/auth/LoginPage"
import { ProtectedRoute } from "@/features/auth/ProtectedRoute"
import { RegisterPage } from "@/features/auth/RegisterPage"
import { RoleGuard } from "@/features/auth/RoleGuard"
import { UnauthorizedPage } from "@/features/auth/UnauthorizedPage"
import { ChatPage } from "@/features/chat/components/ChatPage"
import { DashboardPage } from "@/features/dashboard/DashboardPage"
import { ThemeProvider } from "@/features/theme/ThemeProvider"
import { ToastProvider } from "@/shared/toast/ToastProvider"

const ALL_ROLES = ["ADMIN", "HR", "FINANCE", "EMPLOYEE"] as const

export function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />

              {/* Protected routes */}
              <Route element={<ProtectedRoute />}>
                <Route element={<AppShell />}>
                  <Route
                    path="/"
                    element={
                      <RoleGuard allowedRoles={[...ALL_ROLES]}>
                        <DashboardPage />
                      </RoleGuard>
                    }
                  />
                  <Route
                    path="/chat"
                    element={
                      <RoleGuard allowedRoles={[...ALL_ROLES]}>
                        <ChatPage />
                      </RoleGuard>
                    }
                  />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
