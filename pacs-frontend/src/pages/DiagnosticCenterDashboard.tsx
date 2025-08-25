import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Users, FileText, Activity, Plus, Search, UserPlus, LogOut } from 'lucide-react'

interface User {
  id: number
  email: string
  username: string
  full_name: string
  role: string
  is_active: boolean
  created_at: string
}

export default function DiagnosticCenterDashboard() {
  const { user, token, logout } = useAuth()
  const [centerUsers, setCenterUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    fetchCenterUsers()
  }, [])

  const fetchCenterUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/diagnostic-center/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setCenterUsers(data)
      }
    } catch (error) {
      console.error('Error fetching center users:', error)
    } finally {
      setLoading(false)
    }
  }

  const stats = {
    totalUsers: centerUsers.length,
    activeUsers: centerUsers.filter(u => u.is_active).length,
    doctors: centerUsers.filter(u => u.role === 'doctor').length,
    technicians: centerUsers.filter(u => u.role === 'technician').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Diagnostic Center Dashboard</h1>
              <p className="text-gray-600">Welcome back, {user?.full_name}</p>
            </div>
            <div className="flex space-x-4">
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  logout()
                  window.location.href = '/login'
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex space-x-8 border-b border-gray-200 mb-6">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'studies', label: 'Studies', icon: FileText },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-1 py-4 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.activeUsers} active
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Doctors</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.doctors}</div>
                  <p className="text-xs text-muted-foreground">
                    Available for reports
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Technicians</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.technicians}</div>
                  <p className="text-xs text-muted-foreground">
                    Upload studies
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Studies</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground">
                    This month
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Users</CardTitle>
                  <CardDescription>Latest users in your center</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {centerUsers.slice(0, 5).map((user) => (
                      <div key={user.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{user.full_name}</p>
                          <p className="text-sm text-gray-500">{user.role.replace('_', ' ')}</p>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs ${
                          user.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common tasks for center management</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button className="w-full justify-start" variant="outline">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add New Doctor
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add New Technician
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <FileText className="h-4 w-4 mr-2" />
                      View All Studies
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <Activity className="h-4 w-4 mr-2" />
                      Generate Reports
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Center Users</h2>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <div className="flex items-center space-x-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search users..."
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {centerUsers.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {user.full_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {user.role.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className={user.is_active ? 'text-red-600' : 'text-green-600'}
                          >
                            {user.is_active ? 'Deactivate' : 'Activate'}
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

            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No studies yet</h3>
                  <p className="text-gray-500 mb-4">
                    Start by uploading your first DICOM study
                  </p>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Upload Study
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
