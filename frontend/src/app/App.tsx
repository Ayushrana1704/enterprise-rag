import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { RoleGuard } from "@/features/auth/RoleGuard"
import { AuthProvider } from "@/features/auth/AuthProvider"
import { LoginPage } from "@/features/auth/LoginPage"
import { ProtectedRoute } from "@/features/auth/ProtectedRoute"
import { UnauthorizedPage } from "@/features/auth/UnauthorizedPage"
import { DashboardPage } from "@/features/dashboard/DashboardPage"


export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route element={<ProtectedRoute />}>
  <Route
    path="/"
    element={
      <RoleGuard
        allowedRoles={["ADMIN", "HR", "FINANCE", "EMPLOYEE"]}
      >
        <DashboardPage />
      </RoleGuard>
    }
  />
</Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
