import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginPage from './pages/LoginPage'
import AdminDashboard from './pages/AdminDashboard'
import DiagnosticCenterDashboard from './pages/DiagnosticCenterDashboard'
import TechnicianDashboard from './pages/TechnicianDashboard'
import DoctorDashboard from './pages/DoctorDashboard'
import RadiologistDashboard from './pages/RadiologistDashboard'
import DicomViewer from './components/DicomViewer'
import './App.css'

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-medical-primary"></div>
    </div>
  }
  
  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }
  
  return <>{children}</>
}

function AppRoutes() {
  const { user } = useAuth()
  
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      
      <Route path="/dashboard" element={
        <ProtectedRoute>
          {user?.role === 'admin' && <AdminDashboard />}
          {user?.role === 'diagnostic_center_admin' && <DiagnosticCenterDashboard />}
          {user?.role === 'technician' && <TechnicianDashboard />}
          {user?.role === 'doctor' && <DoctorDashboard />}
          {user?.role === 'radiologist' && <RadiologistDashboard />}
        </ProtectedRoute>
      } />
      
      <Route path="/admin/*" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/diagnostic-center/*" element={
        <ProtectedRoute allowedRoles={['admin', 'diagnostic_center_admin']}>
          <DiagnosticCenterDashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/technician/*" element={
        <ProtectedRoute allowedRoles={['technician']}>
          <TechnicianDashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/doctor/*" element={
        <ProtectedRoute allowedRoles={['doctor']}>
          <DoctorDashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/radiologist/*" element={
        <ProtectedRoute allowedRoles={['radiologist']}>
          <RadiologistDashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/viewer/:studyId" element={
        <ProtectedRoute>
          <DicomViewer />
        </ProtectedRoute>
      } />
      
      <Route path="/unauthorized" element={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-medical-error mb-4">Access Denied</h1>
            <p className="text-gray-600">You don't have permission to access this page.</p>
          </div>
        </div>
      } />
      
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
