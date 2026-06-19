import os

# Fix Model3DViewer
model3d = """'use client'

import { Suspense, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF, Environment, ContactShadows } from '@react-three/drei'

interface Model3DViewerProps {
  modelUrl: string
}

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  return <primitive object={scene} scale={1.5} />
}

export default function Model3DViewer({ modelUrl }: Model3DViewerProps) {
  const [loading, setLoading] = useState(true)

  return (
    <div className="w-full h-[500px] relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900 rounded-xl">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
        </div>
      )}
      <Canvas
        shadows
        camera={{ position: [0, 2, 5], fov: 50 }}
        onCreated={() => setLoading(false)}
      >
        <Suspense fallback={null}>
          <Model url={modelUrl} />
          <ContactShadows position={[0, -1.5, 0]} opacity={0.4} />
          <Environment preset="apartment" />
        </Suspense>
        <OrbitControls 
          autoRotate 
          autoRotateSpeed={2}
          minDistance={3}
          maxDistance={8}
          enablePan={false}
        />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      </Canvas>
    </div>
  )
}
"""

with open('src/components/Model3DViewer.tsx', 'w', encoding='utf-8') as f:
    f.write(model3d)
print('Fixed Model3DViewer')

# Fix AdminProjectForm
admin_form = """'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ProjectFormData {
  title: string
  slug: string
  category: string
  location: string
  description: string
  beforeImage: string
  afterImage: string
}

export default function AdminProjectForm() {
  const router = useRouter()
  const [formData, setFormData] = useState<ProjectFormData>({
    title: '',
    slug: '',
    category: '',
    location: '',
    description: '',
    beforeImage: '',
    afterImage: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        router.refresh()
        setFormData({
          title: '',
          slug: '',
          category: '',
          location: '',
          description: '',
          beforeImage: '',
          afterImage: '',
        })
      }
    } catch (error) {
      console.error('Failed to create project:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">Title</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Slug</label>
          <input
            type="text"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            required
            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">Category</label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            required
            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl"
          >
            <option value="">Select category</option>
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
            <option value="hospitality">Hospitality</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Location</label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={4}
          required
          className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">Before Image URL</label>
          <input
            type="url"
            value={formData.beforeImage}
            onChange={(e) => setFormData({ ...formData, beforeImage: e.target.value })}
            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">After Image URL</label>
          <input
            type="url"
            value={formData.afterImage}
            onChange={(e) => setFormData({ ...formData, afterImage: e.target.value })}
            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full md:w-auto px-8 py-4 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {isSubmitting ? 'Creating...' : 'Create Project'}
      </button>
    </form>
  )
}
"""

with open('src/components/AdminProjectForm.tsx', 'w', encoding='utf-8') as f:
    f.write(admin_form)
print('Fixed AdminProjectForm')

# Fix Calendly component
calendly = """'use client brethren 我会 wise.

import { useEffect } from 'react'

interface CalendlyEmbedProps {
  url: string
}

export default function CalendlyEmbed({ url }: CalendlyEmbedProps) {
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://assets.calendly.com/assets/external/widget.js'
    script.async = true
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  return (
    <div 
      className="calendly-inline-widget w-full min-h-[700px] rounded-xl" 
      data-url={url}
    />
  )
}
"""

with open('src/components/Calendly-flightsEmbed.tsx', 'w', encoding='utf-8') as f:
    f.write(calendly)
print('Fixed CalendlyEmbed')

print('All files fixed!')
