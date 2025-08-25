import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { 
  ZoomIn, ZoomOut, RotateCw, Move, Ruler, Square, 
  Circle, Type, Brain, Save, Download, ArrowLeft 
} from 'lucide-react'

export default function DicomViewer() {
  const { studyId } = useParams()
  const { token } = useAuth()
  const [study, setStudy] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTool, setActiveTool] = useState('pan')
  const [measurements, setMeasurements] = useState<any[]>([])

  const API_URL = 'http://localhost:8000'

  useEffect(() => {
    if (studyId) {
      fetchStudy()
    }
  }, [studyId])

  const fetchStudy = async () => {
    try {
      const response = await fetch(`${API_URL}/studies/${studyId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setStudy(data)
      }
    } catch (error) {
      console.error('Error fetching study:', error)
    } finally {
      setLoading(false)
    }
  }

  const tools = [
    { id: 'pan', label: 'Pan', icon: Move },
    { id: 'zoom', label: 'Zoom', icon: ZoomIn },
    { id: 'ruler', label: 'Ruler', icon: Ruler },
    { id: 'rectangle', label: 'Rectangle', icon: Square },
    { id: 'circle', label: 'Circle', icon: Circle },
    { id: 'text', label: 'Text', icon: Type },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!study) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Study not found</h2>
          <p className="text-gray-600">The requested study could not be loaded.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="text-white hover:bg-gray-700">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="text-white">
                <h1 className="text-lg font-semibold">
                  {study.patient.first_name} {study.patient.last_name}
                </h1>
                <p className="text-sm text-gray-300">
                  {study.modality} - {study.body_part} - {new Date(study.study_date).toLocaleDateString()}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" className="text-white border-gray-600 hover:bg-gray-700">
                <Brain className="h-4 w-4 mr-2" />
                AI Report
              </Button>
              <Button variant="outline" size="sm" className="text-white border-gray-600 hover:bg-gray-700">
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button variant="outline" size="sm" className="text-white border-gray-600 hover:bg-gray-700">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-screen">
        {/* Left Sidebar - Tools */}
        <div className="w-16 bg-gray-800 border-r border-gray-700 flex flex-col items-center py-4 space-y-2">
          {tools.map((tool) => (
            <Button
              key={tool.id}
              variant={activeTool === tool.id ? "default" : "ghost"}
              size="sm"
              className={`w-12 h-12 p-0 ${
                activeTool === tool.id 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
              onClick={() => setActiveTool(tool.id)}
              title={tool.label}
            >
              <tool.icon className="h-5 w-5" />
            </Button>
          ))}
          
          <div className="border-t border-gray-700 pt-2 mt-4">
            <Button
              variant="ghost"
              size="sm"
              className="w-12 h-12 p-0 text-gray-300 hover:bg-gray-700"
              title="Zoom In"
            >
              <ZoomIn className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-12 h-12 p-0 text-gray-300 hover:bg-gray-700"
              title="Zoom Out"
            >
              <ZoomOut className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-12 h-12 p-0 text-gray-300 hover:bg-gray-700"
              title="Rotate"
            >
              <RotateCw className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Main Viewer Area */}
        <div className="flex-1 flex">
          {/* DICOM Viewer Canvas */}
          <div className="flex-1 bg-black relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white">
                <div className="w-96 h-96 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center">
                  <div>
                    <div className="text-6xl mb-4">🩻</div>
                    <p className="text-lg font-medium mb-2">DICOM Viewer</p>
                    <p className="text-sm text-gray-400">
                      Advanced DICOM viewer would be integrated here
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Study ID: {study.study_uid}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Overlay Controls */}
            <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white p-2 rounded">
              <div className="text-xs space-y-1">
                <div>WW: 400 WL: 40</div>
                <div>Zoom: 100%</div>
                <div>Slice: 1/120</div>
              </div>
            </div>

            <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded">
              <div className="text-xs space-y-1">
                <div>{study.patient.first_name} {study.patient.last_name}</div>
                <div>ID: {study.patient.patient_id}</div>
                <div>{study.modality}</div>
                <div>{new Date(study.study_date).toLocaleDateString()}</div>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Information & Measurements */}
          <div className="w-80 bg-gray-800 border-l border-gray-700 overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* Study Information */}
              <Card className="bg-gray-700 border-gray-600">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-sm">Study Information</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-gray-300 space-y-2">
                  <div className="flex justify-between">
                    <span>Patient:</span>
                    <span>{study.patient.first_name} {study.patient.last_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ID:</span>
                    <span>{study.patient.patient_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Modality:</span>
                    <span>{study.modality}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Body Part:</span>
                    <span>{study.body_part}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{new Date(study.study_date).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Measurements */}
              <Card className="bg-gray-700 border-gray-600">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-sm">Measurements</CardTitle>
                </CardHeader>
                <CardContent>
                  {measurements.length === 0 ? (
                    <p className="text-xs text-gray-400">No measurements yet</p>
                  ) : (
                    <div className="space-y-2">
                      {measurements.map((measurement, index) => (
                        <div key={index} className="text-xs text-gray-300 p-2 bg-gray-600 rounded">
                          <div className="flex justify-between">
                            <span>{measurement.type}</span>
                            <span>{measurement.value}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* AI Report */}
              {study.ai_report && (
                <Card className="bg-gray-700 border-gray-600">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white text-sm flex items-center">
                      <Brain className="h-4 w-4 mr-2" />
                      AI Report
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs text-gray-300 space-y-2">
                      <div>
                        <span className="font-medium">Findings:</span>
                        <p className="mt-1">AI-generated findings would appear here</p>
                      </div>
                      <div>
                        <span className="font-medium">Impression:</span>
                        <p className="mt-1">AI-generated impression would appear here</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Series List */}
              <Card className="bg-gray-700 border-gray-600">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-sm">Series</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-xs text-gray-300 p-2 bg-blue-600 bg-opacity-50 rounded cursor-pointer">
                      <div className="font-medium">Series 1</div>
                      <div className="text-gray-400">120 images</div>
                    </div>
                    <div className="text-xs text-gray-300 p-2 bg-gray-600 rounded cursor-pointer hover:bg-gray-500">
                      <div className="font-medium">Series 2</div>
                      <div className="text-gray-400">85 images</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
