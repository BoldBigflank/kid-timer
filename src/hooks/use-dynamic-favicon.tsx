import { useEffect } from 'preact/hooks'

interface FaviconOptions {
  progress: number // 0-100
  isRunning: boolean
  isComplete: boolean
}

export function useDynamicFavicon({ progress, isRunning, isComplete }: FaviconOptions) {
  useEffect(() => {
    // Generate SVG based on current timer state
    const generateFaviconSVG = (progress: number, isRunning: boolean, isComplete: boolean) => {
      // Determine colors based on state
      const progressColor = isComplete ? '#3b82f6' : (isRunning ? '#ef4444' : '#6b7280')
      const backgroundOpacity = isRunning ? '0.2' : '0.3'
      
      // Calculate stroke-dasharray for progress circle
      const radius = 14
      const circumference = 2 * Math.PI * radius
      const progressLength = (progress / 100) * circumference
      const remainingLength = circumference - progressLength
      
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:${progressColor};stop-opacity:1" />
              <stop offset="100%" style="stop-color:${progressColor === '#3b82f6' ? '#1d4ed8' : progressColor === '#ef4444' ? '#dc2626' : '#4b5563'};stop-opacity:1" />
            </linearGradient>
            <linearGradient id="backgroundGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#e5e7eb;stop-opacity:${backgroundOpacity}" />
              <stop offset="100%" style="stop-color:#9ca3af;stop-opacity:${backgroundOpacity}" />
            </linearGradient>
          </defs>
          
          <!-- Background circle -->
          <circle 
            cx="16" 
            cy="16" 
            r="${radius}" 
            fill="none" 
            stroke="url(#backgroundGradient)" 
            stroke-width="2"
          />
          
          <!-- Progress arc -->
          <circle 
            cx="16" 
            cy="16" 
            r="${radius}" 
            fill="none" 
            stroke="url(#progressGradient)" 
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-dasharray="${progressLength} ${remainingLength}"
            stroke-dashoffset="0"
            transform="rotate(-90 16 16)"
            opacity="0.9"
          />
          
          <!-- Center indicator -->
          <circle 
            cx="16" 
            cy="16" 
            r="${isRunning ? '2.5' : '2'}" 
            fill="url(#progressGradient)"
            opacity="${isRunning ? '1' : '0.8'}"
          />
          
          ${isComplete ? `
            <!-- Completion indicator - small sparkle effect -->
            <circle cx="16" cy="8" r="1" fill="url(#progressGradient)" opacity="0.8"/>
            <circle cx="24" cy="16" r="1" fill="url(#progressGradient)" opacity="0.8"/>
            <circle cx="16" cy="24" r="1" fill="url(#progressGradient)" opacity="0.8"/>
            <circle cx="8" cy="16" r="1" fill="url(#progressGradient)" opacity="0.8"/>
          ` : `
            <!-- Time marks for non-complete state -->
            <circle cx="16" cy="6" r="0.8" fill="url(#progressGradient)" opacity="0.6"/>
            <circle cx="26" cy="16" r="0.8" fill="url(#progressGradient)" opacity="0.6"/>
            <circle cx="16" cy="26" r="0.8" fill="url(#progressGradient)" opacity="0.6"/>
            <circle cx="6" cy="16" r="0.8" fill="url(#progressGradient)" opacity="0.6"/>
          `}
        </svg>
      `.trim()
      
      return svg
    }

    // Update favicon
    const updateFavicon = () => {
      const svg = generateFaviconSVG(progress, isRunning, isComplete)
      const base64 = btoa(svg)
      const dataUri = `data:image/svg+xml;base64,${base64}`
      
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement
      if (!link) {
        link = document.createElement('link')
        link.rel = 'icon'
        link.type = 'image/svg+xml'
        document.getElementsByTagName('head')[0].appendChild(link)
      }
      link.href = dataUri
    }

    updateFavicon()
  }, [progress, isRunning, isComplete])
}
