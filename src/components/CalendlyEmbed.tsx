'use client'

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

export function CalendlyBadgeWidget({ url }: CalendlyEmbedProps) {
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
    <link 
      href="https://assets.calendly.com/assets/external/widget.css" 
      rel="stylesheet"
    />
  )
}
