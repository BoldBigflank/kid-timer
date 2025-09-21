import { useEffect, useRef, useCallback } from 'preact/hooks'

export function useWakeLock() {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const isActiveRef = useRef(false)

  const requestWakeLock = useCallback(async () => {
    // Check if Wake Lock API is supported
    if (!('wakeLock' in navigator)) {
      console.warn('Screen Wake Lock API is not supported in this browser')
      return false
    }

    try {
      // Release any existing wake lock first
      if (wakeLockRef.current) {
        await wakeLockRef.current.release()
        wakeLockRef.current = null
      }

      // Request a new wake lock
      wakeLockRef.current = await navigator.wakeLock.request('screen')
      console.log('🔒 Screen wake lock acquired')
      
      // Listen for wake lock release
      wakeLockRef.current.addEventListener('release', () => {
        console.log('🔓 Screen wake lock has been released')
        wakeLockRef.current = null
      })

      return true
    } catch (err) {
      console.error('Failed to acquire screen wake lock:', err)
      wakeLockRef.current = null
      return false
    }
  }, [])

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release()
        console.log('🔓 Screen wake lock manually released')
      } catch (err) {
        console.error('Failed to release screen wake lock:', err)
      }
      wakeLockRef.current = null
    }
    isActiveRef.current = false
  }, [])

  const setWakeLockActive = useCallback(async (active: boolean) => {
    isActiveRef.current = active
    
    if (active) {
      await requestWakeLock()
    } else {
      await releaseWakeLock()
    }
  }, [requestWakeLock, releaseWakeLock])

  // Handle document visibility changes to reacquire wake lock when needed
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isActiveRef.current) {
        // Document became visible and we want wake lock active - reacquire it
        if (!wakeLockRef.current) {
          console.log('🔄 Document became visible, reacquiring wake lock')
          await requestWakeLock()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [requestWakeLock])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(console.error)
      }
    }
  }, [])

  return {
    setWakeLockActive,
    isSupported: 'wakeLock' in navigator,
    isActive: isActiveRef.current && wakeLockRef.current !== null
  }
}
