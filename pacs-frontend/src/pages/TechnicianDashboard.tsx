import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Upload, FileText, Activity, Plus, Search, Eye, LogOut } from 'lucide-react'

interface Study {
  id: number
  study_uid: string
  patient_id: number
  study_date: string
  modality: string
  body_part: string
  study_description: string
  status: string
  created_at: string
  patient: {
    first_name: string
    last_name: string
    patient_id: string
  }
}

export default function TechnicianDashboard() {
  const { user, token, logout } = useAuth()
  const navigate = useNavigate()
  const [studies, setStudies] = useState<Study[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  const API_URL = 'http://localhost:8000'

  useEffect(() => {
    fetchStudies()
  }, [])

  const fetchStudies = async () => {
    try {
      const response = await fetch(`${API_URL}/studies/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setStudies(data)
      }
    } catch (error) {
      console.error('Error fetching studies:', error)
    } finally {
      setLoading(false)
    }
  }

  const stats = {
    totalStudies: studies.length,
    pendingStudies: studies.filter(s => s.status === 'pending').length,
    completedStudies: studies.filter(s => s.status === 'completed').length,
    todayStudies: studies.filter(s => 
      new Date(s.created_at).toDateString() === new Date().toDateString()
    ).length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-medical-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Enhanced Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-8">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-gray-900">Technician Dashboard</h1>
              <p className="text-lg text-gray-600">Welcome back, {user?.full_name}</p>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Ready for uploads</span>
                </div>
                <span>•</span>
                <span>{stats.todayStudies} studies uploaded today</span>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button className="shadow-lg hover:shadow-xl transition-shadow bg-blue-600 hover:bg-blue-700">
                <Upload className="h-4 w-4 mr-2" />
                Upload Study
              </Button>
              <Button variant="outline" onClick={() => { logout(); window.location.href = '/login'; }}
                      className="shadow-sm hover:shadow-md transition-shadow">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl mb-8">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'studies', label: 'Studies', icon: FileText },
            { id: 'upload', label: 'Upload', icon: Upload },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-6 py-3 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-white text-blue-600 shadow-sm border border-gray-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <tab.icon className="h-5 w-5 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="medical-card hover:scale-105 transition-transform duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-700">Total Studies</CardTitle>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-3xl font-bold text-gray-900">{stats.totalStudies}</div>
                  <p className="text-sm text-gray-600">
                    All time
                  </p>
                </CardContent>
              </Card>

              <Card className="medical-card hover:scale-105 transition-transform duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-700">Pending</CardTitle>
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Activity className="h-5 w-5 text-yellow-600" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-3xl font-bold text-gray-900">{stats.pendingStudies}</div>
                  <p className="text-sm text-gray-600">
                    Awaiting review
                  </p>
                </CardContent>
              </Card>

              <Card className="medical-card hover:scale-105 transition-transform duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-700">Completed</CardTitle>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Activity className="h-5 w-5 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-3xl font-bold text-gray-900">{stats.completedStudies}</div>
                  <p className="text-sm text-gray-600">
                    Reports ready
                  </p>
                </CardContent>
              </Card>

              <Card className="medical-card hover:scale-105 transition-transform duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-700">Today</CardTitle>
                  <div className="p-2 bg-cyan-100 rounded-lg">
                    <Upload className="h-5 w-5 text-cyan-600" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-3xl font-bold text-gray-900">{stats.todayStudies}</div>
                  <p className="text-sm text-gray-600">
                    Uploaded today
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Studies</CardTitle>
                  <CardDescription>Latest uploaded studies</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {studies.slice(0, 5).map((study) => (
                      <div key={study.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {study.patient.first_name} {study.patient.last_name}
                          </p>
                          <p className="text-sm text-medical-gray-500">
                            {study.modality} - {study.body_part}
                          </p>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs ${
                          study.status === 'completed'
                            ? 'bg-medical-success/10 text-medical-success'
                            : study.status === 'in_progress'
                            ? 'bg-medical-warning/10 text-medical-warning'
                            : 'bg-medical-gray-100 text-medical-gray-800'
                        }`}>
                          {study.status.replace('_', ' ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common tasks for technicians</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button className="w-full justify-start" variant="outline">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload New Study
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <FileText className="h-4 w-4 mr-2" />
                      View All Studies
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <Search className="h-4 w-4 mr-2" />
                      Search Studies
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <Activity className="h-4 w-4 mr-2" />
                      Check Status
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Studies Tab */}
        {activeTab === 'studies' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Studies</h2>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Upload Study
              </Button>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <div className="flex items-center space-x-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search studies..."
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-medical-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-medical-gray-500 uppercase tracking-wider">
                        Patient
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-medical-gray-500 uppercase tracking-wider">
                        Study
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-medical-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-medical-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-medical-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {studies.map((study) => (
                      <tr key={study.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-medical-gray-900">
                              {study.patient.first_name} {study.patient.last_name}
                            </div>
                            <div className="text-sm text-medical-gray-500">
                              ID: {study.patient.patient_id}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-medical-gray-900">{study.modality}</div>
                          <div className="text-sm text-medical-gray-500">{study.body_part}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            study.status === 'completed'
                              ? 'bg-medical-success/10 text-medical-success'
                              : study.status === 'in_progress'
                              ? 'bg-medical-warning/10 text-medical-warning'
                              : 'bg-medical-gray-100 text-medical-gray-800'
                          }`}>
                            {study.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-medical-gray-500">
                          {new Date(study.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Button variant="outline" size="sm" onClick={() => navigate(`/viewer/${study.id}`)}>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Upload Study</h2>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>DICOM File Upload</CardTitle>
                <CardDescription>
                  Upload DICOM files and patient information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="border-2 border-dashed border-blue-300 rounded-xl p-12 text-center bg-gradient-to-br from-blue-50 to-cyan-50 hover:border-blue-400 transition-colors duration-200">
                    <div className="p-4 bg-blue-100 rounded-full w-fit mx-auto mb-6">
                      <Upload className="h-12 w-12 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">
                      Drop DICOM files here
                    </h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      Drag and drop your DICOM files here, or click to browse and select files from your computer
                    </p>
                    <Button className="shadow-lg hover:shadow-xl transition-shadow bg-blue-600 hover:bg-blue-700">
                      <Upload className="h-4 w-4 mr-2" />
                      Select Files
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-medium">Patient Information</h4>
                      <div className="space-y-3">
                        <Input placeholder="Patient ID" />
                        <Input placeholder="First Name" />
                        <Input placeholder="Last Name" />
                        <Input type="date" placeholder="Date of Birth" />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-medium">Study Information</h4>
                      <div className="space-y-3">
                        <Input placeholder="Study Description" />
                        <Input placeholder="Modality (CT, MRI, X-Ray, etc.)" />
                        <Input placeholder="Body Part" />
                        <Input type="date" placeholder="Study Date" />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4">
                    <Button variant="outline">
                      Cancel
                    </Button>
                    <Button>
                      Upload Study
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
