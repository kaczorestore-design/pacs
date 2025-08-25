import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { FileText, Activity, Eye, Edit, Brain, Clock, LogOut } from 'lucide-react'

interface Study {
  id: number
  study_uid: string
  patient_id: number
  study_date: string
  modality: string
  body_part: string
  study_description: string
  status: string
  priority: string
  created_at: string
  ai_report: string | null
  doctor_report: string | null
  radiologist_report: string | null
  radiologist_id: number | null
  patient: {
    first_name: string
    last_name: string
    patient_id: string
  }
  diagnostic_center: {
    name: string
  }
  uploaded_by: {
    full_name: string
  }
}

interface PendingStudy {
  id: number
  patient_name: string
  patient_id_display: string
  modality: string
  center_name: string
  technician_name: string
  priority: string
  study_description: string
}

export default function RadiologistDashboard() {
  const { user, token, logout } = useAuth()
  const navigate = useNavigate()
  const [studies, setStudies] = useState<Study[]>([])
  const [pendingStudies, setPendingStudies] = useState<PendingStudy[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  const API_URL = 'http://127.0.0.1:8000'

  useEffect(() => {
    fetchStudies()
    fetchPendingStudies()
  }, [])

  const fetchStudies = async () => {
    try {
      const response = await fetch(`${API_URL}/studies/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setStudies(data.filter((study: Study) => study.radiologist_id === user?.id))
      }
    } catch (error) {
      console.error('Error fetching studies:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPendingStudies = async () => {
    try {
      const response = await fetch(`${API_URL}/studies/pending`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setPendingStudies(data)
      }
    } catch (error) {
      console.error('Error fetching pending studies:', error)
    }
  }

  const assignStudyToSelf = async (studyId: number) => {
    try {
      const response = await fetch(`${API_URL}/studies/${studyId}/assign-to-self`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        fetchStudies()
        fetchPendingStudies()
      }
    } catch (error) {
      console.error('Error assigning study:', error)
    }
  }

  const stats = {
    totalStudies: studies.length,
    pendingReports: studies.filter(s => !s.radiologist_report).length,
    completedReports: studies.filter(s => s.radiologist_report).length
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Enhanced Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl">
                <Brain className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Radiologist Portal</h1>
                <p className="text-gray-600">Welcome back, {user?.full_name}</p>
                <div className="flex items-center mt-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm text-green-600 font-medium">System Status: Operational</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" className="flex items-center space-x-2">
                <Activity className="h-4 w-4" />
                <span>Settings</span>
              </Button>
              <Button 
                onClick={logout}
                variant="outline" 
                className="flex items-center space-x-2 text-red-600 border-red-200 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'pending', label: 'Pending Studies', icon: Clock },
              { id: 'assigned', label: 'My Studies', icon: FileText },
              { id: 'ai-reports', label: 'AI Reports', icon: Brain },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-blue-700">Total Studies</CardTitle>
                  <FileText className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-900">{stats.totalStudies}</div>
                  <p className="text-xs text-blue-600 mt-1">Assigned to you</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-yellow-700">Pending Reports</CardTitle>
                  <Clock className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-900">{stats.pendingReports}</div>
                  <p className="text-xs text-yellow-600 mt-1">Awaiting your review</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-green-700">Completed Reports</CardTitle>
                  <Activity className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-900">{stats.completedReports}</div>
                  <p className="text-xs text-green-600 mt-1">Reports finalized</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Pending Studies</CardTitle>
                  <CardDescription>Studies awaiting radiologist assignment</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {pendingStudies.slice(0, 5).map((study) => (
                      <div key={study.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{study.patient_name}</div>
                          <p className="text-sm text-gray-500">
                            {study.modality} - {study.center_name}
                          </p>
                          <div className="flex space-x-2 mt-1">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                              {study.center_name}
                            </span>
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                              {study.technician_name}
                            </span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button size="sm" onClick={() => assignStudyToSelf(study.id)}>
                            Assign to Me
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Your latest study reviews</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {studies.slice(0, 5).map((study) => (
                      <div key={study.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {study.patient.first_name} {study.patient.last_name}
                          </div>
                          <p className="text-sm text-gray-500">
                            {study.modality} - {new Date(study.study_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline" onClick={() => navigate(`/viewer/${study.id}`)}>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button size="sm" onClick={() => navigate(`/report/${study.id}`)}>
                            <Edit className="h-4 w-4 mr-1" />
                            Report
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Pending Studies Tab */}
        {activeTab === 'pending' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Pending Studies</h2>
              <Button onClick={fetchPendingStudies} variant="outline">
                <Activity className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Studies Awaiting Assignment</CardTitle>
                <CardDescription>Select studies to assign to yourself for review</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Patient
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Modality
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Center
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Technician
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Priority
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {pendingStudies.map((study) => (
                        <tr key={study.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{study.patient_name}</div>
                            <div className="text-sm text-gray-500">ID: {study.patient_id_display}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {study.modality}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                              {study.center_name}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                              {study.technician_name}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              study.priority === 'urgent' ? 'bg-red-100 text-red-700' : 
                              study.priority === 'high' ? 'bg-orange-100 text-orange-700' : 
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {study.priority}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Button size="sm" onClick={() => assignStudyToSelf(study.id)}>
                              Assign to Me
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* My Studies Tab */}
        {activeTab === 'assigned' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">My Assigned Studies</h2>
              <Button onClick={fetchStudies} variant="outline">
                <Activity className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

            <div className="grid gap-6">
              {studies.map((study) => (
                <Card key={study.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          {study.patient.first_name} {study.patient.last_name}
                        </CardTitle>
                        <CardDescription>
                          {study.modality} - {study.study_description}
                        </CardDescription>
                      </div>
                      <div className="flex space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          study.status === 'completed' ? 'bg-green-100 text-green-700' :
                          study.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {study.status}
                        </span>
                        {study.priority && (
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            study.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                            study.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {study.priority}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-gray-600">
                        <p>Study Date: {new Date(study.study_date).toLocaleDateString()}</p>
                        <p>Center: {(study as any).center_name || study.diagnostic_center?.name}</p>
                        {study.uploaded_by && (
                          <p>Technician: {study.uploaded_by.full_name}</p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" onClick={() => navigate(`/viewer/${study.id}`)}>
                          <Eye className="h-4 w-4 mr-1" />
                          View Images
                        </Button>
                        <Button size="sm" onClick={() => navigate(`/report/${study.id}`)}>
                          <Edit className="h-4 w-4 mr-1" />
                          {study.radiologist_report ? 'Edit Report' : 'Create Report'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* AI Reports Tab */}
        {activeTab === 'ai-reports' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">AI-Generated Reports</h2>
              <Button onClick={fetchStudies} variant="outline">
                <Activity className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

            <div className="grid gap-6">
              {studies.filter(study => study.ai_report).map((study) => (
                <Card key={study.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          {study.patient.first_name} {study.patient.last_name}
                        </CardTitle>
                        <CardDescription>
                          {study.modality} - {study.study_description}
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Brain className="h-5 w-5 text-blue-600" />
                        <span className="text-sm font-medium text-blue-600">AI Analysis Available</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">AI Report Summary</h4>
                        <p className="text-sm text-blue-800">{study.ai_report}</p>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-600">
                          <p>Generated: {new Date(study.created_at).toLocaleDateString()}</p>
                          <p>Center: {study.diagnostic_center?.name || 'Unknown'}</p>
                        </div>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline" onClick={() => navigate(`/viewer/${study.id}`)}>
                            <Eye className="h-4 w-4 mr-1" />
                            Review Images
                          </Button>
                          <Button size="sm" onClick={() => navigate(`/report/${study.id}`)}>
                            <FileText className="h-4 w-4 mr-1" />
                            Verify & Edit
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
