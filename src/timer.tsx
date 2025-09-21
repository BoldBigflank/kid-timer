import { useState, useEffect, useRef, useCallback } from 'preact/hooks'
import { usePubNub, type TimerState } from './pubnub-context'
import { useDynamicFavicon } from './use-dynamic-favicon'
import { useWakeLock } from './use-wake-lock'
import { 
  Box, 
  Button, 
  Typography, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  IconButton,
  CircularProgress,
  Stack
} from '@mui/material'
import { 
  PlayArrow, 
  Pause, 
  Refresh, 
  Close as CloseIcon,
  Add as AddIcon,
  Remove as RemoveIcon
} from '@mui/icons-material'

interface TimerProps {
  initialMinutes?: number
  onStateChange?: (state: { isRunning: boolean; isComplete: boolean; isPaused: boolean }) => void
}

export function Timer({ initialMinutes = 5, onStateChange }: TimerProps) {
  const { publishTimerState, timerState, isConnected } = usePubNub()
  const { setWakeLockActive, isSupported: wakeLockSupported } = useWakeLock()
  const [durationMs, setDurationMs] = useState(initialMinutes * 60 * 1000)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [endTime, setEndTime] = useState<number | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [currentTime, setCurrentTime] = useState(Date.now())
  const lastSyncedState = useRef<TimerState | null>(null)
  const isInitialized = useRef(false)
  
  console.log('🔍 Timer render - timerState:', timerState, 'isConnected:', isConnected, 'isInitialized:', isInitialized.current)

  // Update current time every second for real-time calculations
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Manage wake lock based on timer running state
  useEffect(() => {
    if (wakeLockSupported) {
      console.log(`🔒 Wake lock ${isRunning ? 'activating' : 'deactivating'} - timer is ${isRunning ? 'running' : 'stopped'}`)
      setWakeLockActive(isRunning)
    }
  }, [isRunning, setWakeLockActive, wakeLockSupported])

  // Calculate if timer is complete (needs to be before useEffect that uses it)
  const isComplete = !isRunning && startTime && endTime && currentTime >= endTime

  // Define handleReset early so it can be used in useEffect
  const handleReset = useCallback(() => {
    const initialDurationMs = (initialMinutes || 5) * 60 * 1000
    
    console.log('🔄 Resetting timer from completed state')
    setDurationMs(initialDurationMs)
    setStartTime(null)
    setEndTime(null)
    setIsRunning(false)
    
    publishTimerState({
      durationMs: initialDurationMs,
      startTime: null,
      endTime: null,
      isRunning: false,
      pausedRemainingMs: undefined, // Clear paused state when resetting
      lastUpdated: Date.now()
    })
  }, [initialMinutes, publishTimerState])

  // Handle keyboard events for modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isComplete) {
        console.log('⌨️ Escape key pressed, closing modal')
        handleReset()
      }
    }

    if (isComplete) {
      document.addEventListener('keydown', handleKeyDown)
      // Focus management - focus the modal content when it opens
      const modalContent = document.querySelector('.modal-content') as HTMLElement
      if (modalContent) {
        modalContent.focus()
      }
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isComplete, handleReset])

  // Sync with incoming PubNub state
  useEffect(() => {
    if (timerState && (!lastSyncedState.current || 
        timerState.lastUpdated > lastSyncedState.current.lastUpdated)) {
      console.log('🔄 Syncing timer state:', timerState)
      
      setDurationMs(timerState.durationMs)
      setStartTime(timerState.startTime)
      setEndTime(timerState.endTime)
      
      // For running timers, check if they should still be running
      if (timerState.isRunning && timerState.endTime) {
        const now = Date.now()
        const shouldStillBeRunning = now < timerState.endTime
        setIsRunning(shouldStillBeRunning)
        
        if (!shouldStillBeRunning) {
          // Timer has expired, publish the stopped state
          console.log('⏰ Timer expired, stopping')
          publishTimerState({
            ...timerState,
            isRunning: false,
            pausedRemainingMs: undefined, // Clear paused state when completed
            lastUpdated: now
          })
        }
      } else {
        setIsRunning(timerState.isRunning)
      }
      
      lastSyncedState.current = timerState
      isInitialized.current = true
    }
  }, [timerState, publishTimerState])

  // Check if timer should auto-stop when time runs out
  useEffect(() => {
    if (isRunning && endTime && currentTime >= endTime) {
      console.log('⏰ Timer reached zero, stopping but keeping completed state')
      setIsRunning(false)
      // Keep the endTime to maintain completed state - don't reset it
      publishTimerState({
        durationMs,
        startTime,
        endTime, // Keep endTime to show completion
        isRunning: false,
        pausedRemainingMs: undefined, // Clear paused state when completed
        lastUpdated: Date.now()
      })
    }
  }, [currentTime, isRunning, endTime, durationMs, startTime, publishTimerState])

  const publishCurrentState = useCallback(() => {
    const currentState: TimerState = {
      durationMs,
      startTime,
      endTime,
      isRunning,
      pausedRemainingMs: undefined, // No paused state during initialization
      lastUpdated: Date.now()
    }
    console.log('📤 Publishing current state (initialization):', currentState)
    console.log('📤 Current component state:', { durationMs, startTime, endTime, isRunning })
    publishTimerState(currentState)
  }, [durationMs, startTime, endTime, isRunning, publishTimerState])

  // Handle initialization when no existing state is found
  useEffect(() => {
    if (!isInitialized.current && timerState === null && isConnected) {
      // Give PubNub a moment to load history before initializing with defaults
      console.log('⏳ Waiting for PubNub history before initializing...')
      const timeout = setTimeout(() => {
        if (!isInitialized.current && timerState === null) {
          console.log('🆕 No existing timer state found after waiting, initializing with defaults')
          console.log('🆕 Default state will be:', { durationMs, startTime, endTime, isRunning })
          isInitialized.current = true
          publishCurrentState()
        } else {
          console.log('⏸️ Skipping initialization - state found or already initialized')
        }
      }, 2000) // Wait 2 seconds for history to load

      return () => clearTimeout(timeout)
    }
  }, [timerState, isConnected, publishCurrentState, durationMs, startTime, endTime, isRunning])

  // Calculate derived values from timestamps
  const totalSeconds = Math.floor(durationMs / 1000)
  
  // Calculate remaining time based on current state
  let remainingMs: number
  if (isRunning && endTime) {
    // Timer is running - calculate remaining time from end time using real-time
    remainingMs = Math.max(0, endTime - Date.now())
  } else if (!isRunning && startTime && endTime) {
    // Timer was completed - check if it actually completed
    const timeRemaining = Math.max(0, endTime - currentTime)
    if (timeRemaining === 0) {
      // Timer completed - show 0 remaining time
      remainingMs = 0
    } else {
      // This shouldn't happen with the new pause logic, but handle it gracefully
      remainingMs = durationMs
    }
  } else if (!isRunning && timerState?.pausedRemainingMs !== undefined) {
    // Timer was paused - use the stored paused remaining time
    remainingMs = timerState.pausedRemainingMs
  } else {
    // Timer not started or reset - use full duration
    remainingMs = durationMs
  }
  
  // Calculate remaining seconds with ceiling logic
  // 60000ms -> 60s (1:00), 59999ms -> 60s (1:00), 1000ms -> 1s (0:01), 999ms -> 1s (0:01)
  const remainingSeconds = remainingMs <= 0 ? 0 : Math.max(1, Math.ceil(remainingMs / 1000))

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const progress = totalSeconds > 0 ? ((totalSeconds - remainingSeconds) / totalSeconds) * 100 : 0
  const isPaused = !isRunning && timerState?.pausedRemainingMs !== undefined
  const progressColor = isComplete ? '#3b82f6' : isPaused ? '#d1d5db' : '#ef4444' // blue when complete, light grey when paused, red while running

  // Notify parent component of state changes
  useEffect(() => {
    if (onStateChange) {
      onStateChange({ 
        isRunning, 
        isComplete: Boolean(isComplete),
        isPaused: Boolean(isPaused)
      })
    }
  }, [isRunning, isComplete, isPaused, onStateChange])

  // Update favicon dynamically with timer progress
  useDynamicFavicon({ 
    progress, 
    isRunning, 
    isComplete: Boolean(isComplete) 
  })

  const handleStart = () => {
    const now = Date.now()
    let timeToRun = durationMs
    
    // If timer was paused, use the stored paused remaining time
    if (!isRunning && timerState?.pausedRemainingMs !== undefined) {
      timeToRun = timerState.pausedRemainingMs
    }
    
    const newStartTime = now
    const newEndTime = now + timeToRun
    
    console.log('▶️ Starting timer:', {
      now,
      newStartTime,
      newEndTime,
      durationMs,
      timeToRun,
      pausedRemainingMs: timerState?.pausedRemainingMs,
      wasPaused: !isRunning && timerState?.pausedRemainingMs !== undefined,
      willRunFor: (newEndTime - newStartTime) / 1000 + ' seconds'
    })
    
    setIsRunning(true)
    setStartTime(newStartTime)
    setEndTime(newEndTime)
    
    const stateToPublish = {
      durationMs, // Keep original duration
      startTime: newStartTime,
      endTime: newEndTime,
      isRunning: true,
      pausedRemainingMs: undefined, // Clear paused state when resuming
      lastUpdated: now
    }
    
    console.log('▶️ Publishing start state:', stateToPublish)
    publishTimerState(stateToPublish)
  }

  const handlePause = () => {
    // When pausing, store the remaining time and clear start/end times
    const now = Date.now()
    const currentRemainingMs = remainingMs // Calculate this before state changes
    
    setStartTime(null)
    setEndTime(null)
    setIsRunning(false)
    
    publishTimerState({
      durationMs, // Keep original duration unchanged
      startTime: null,
      endTime: null,
      isRunning: false,
      pausedRemainingMs: currentRemainingMs, // Store remaining time when paused
      lastUpdated: now
    })
  }


  const addTime = (minutes: number) => {
    const additionalMs = minutes * 60 * 1000
    const newDurationMs = durationMs + additionalMs
    
    console.log(`➕ Adding ${minutes} minutes to timer`)
    setDurationMs(newDurationMs)
    
    if (isRunning && startTime && endTime) {
      // If running, extend the end time
      const newEndTime = endTime + additionalMs
      setEndTime(newEndTime)
      
      publishTimerState({
        durationMs: newDurationMs,
        startTime,
        endTime: newEndTime,
        isRunning: true,
        pausedRemainingMs: undefined,
        lastUpdated: Date.now()
      })
    } else if (isComplete) {
      // If completed, clear the completed state and set new duration
      console.log('🔄 Clearing completed state due to time adjustment')
      setStartTime(null)
      setEndTime(null)
      
      publishTimerState({
        durationMs: newDurationMs,
        startTime: null,
        endTime: null,
        isRunning: false,
        pausedRemainingMs: undefined,
        lastUpdated: Date.now()
      })
    } else {
      // If not running and not completed, just update duration
      // If paused, adjust the paused remaining time proportionally
      const currentPausedMs = timerState?.pausedRemainingMs
      const adjustedPausedMs = currentPausedMs ? currentPausedMs + additionalMs : undefined
      
      publishTimerState({
        durationMs: newDurationMs,
        startTime,
        endTime,
        isRunning,
        pausedRemainingMs: adjustedPausedMs,
        lastUpdated: Date.now()
      })
    }
  }

  const removeTime = (minutes: number) => {
    const reductionMs = minutes * 60 * 1000
    const newDurationMs = Math.max(60 * 1000, durationMs - reductionMs) // Minimum 1 minute
    
    console.log(`➖ Removing ${minutes} minutes from timer`)
    setDurationMs(newDurationMs)
    
    if (isRunning && startTime && endTime) {
      // If running, reduce the end time but don't go below current time
      const maxReduction = endTime - currentTime - 1000 // Leave at least 1 second
      const actualReduction = Math.min(reductionMs, Math.max(0, maxReduction))
      const newEndTime = endTime - actualReduction
      
      setEndTime(newEndTime)
      
      publishTimerState({
        durationMs: newDurationMs,
        startTime,
        endTime: newEndTime,
        isRunning: true,
        pausedRemainingMs: undefined,
        lastUpdated: Date.now()
      })
    } else if (isComplete) {
      // If completed, clear the completed state and set new duration
      console.log('🔄 Clearing completed state due to time adjustment')
      setStartTime(null)
      setEndTime(null)
      
      publishTimerState({
        durationMs: newDurationMs,
        startTime: null,
        endTime: null,
        isRunning: false,
        pausedRemainingMs: undefined,
        lastUpdated: Date.now()
      })
    } else {
      // If not running and not completed, just update duration
      // If paused, adjust the paused remaining time proportionally
      const currentPausedMs = timerState?.pausedRemainingMs
      const adjustedPausedMs = currentPausedMs ? Math.max(60 * 1000, currentPausedMs - reductionMs) : undefined
      
      publishTimerState({
        durationMs: newDurationMs,
        startTime,
        endTime,
        isRunning,
        pausedRemainingMs: adjustedPausedMs,
        lastUpdated: Date.now()
      })
    }
  }

  return (
    <>
    <Box 
      sx={{ 
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        p: 2,
        boxSizing: 'border-box',
        '@media (max-width:480px)': {
          gap: 2.5,
          p: 1.5,
        },
        '@media (max-width:360px)': {
          gap: 2,
          p: 1,
        },
        '@media (max-height:600px) and (orientation: landscape)': {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          p: 1,
          height: '100%',
        },
      }}
    >
      {/* Progress Section */}
      <Box 
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexShrink: 0,
          '@media (max-height:600px) and (orientation: landscape)': {
            flex: '0 0 auto',
          },
        }}
      >
        <Box 
          sx={{ 
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            // Make the circle take up most of the available space
            width: 'min(80vw, 80vh, 500px)',
            height: 'min(80vw, 80vh, 500px)',
            '@media (max-width:480px)': {
              width: 'min(85vw, 75vh, 400px)',
              height: 'min(85vw, 75vh, 400px)',
            },
            '@media (max-width:360px)': {
              width: 'min(90vw, 70vh, 350px)',
              height: 'min(90vw, 70vh, 350px)',
            },
            '@media (max-height:600px) and (orientation: landscape)': {
              width: 'min(60vw, 85vh, 400px)',
              height: 'min(60vw, 85vh, 400px)',
            },
          }}
        >
          <CircularProgress
              variant="determinate"
              value={progress}
              size="100%"
              thickness={3}
              sx={{
                color: progressColor,
                width: '100%',
                height: '100%',
                '& .MuiCircularProgress-circle': {
                  strokeLinecap: 'round',
                  transition: 'stroke-dashoffset 0.3s ease, stroke 0.5s ease',
                },
              }}
            />
          <CircularProgress
              variant="determinate"
              value={100}
              size="100%"
              thickness={3}
              sx={{
                color: 'divider',
                position: 'absolute',
                opacity: 0.3,
                width: '100%',
                height: '100%',
              }}
            />
            <Box 
              sx={{ 
                position: 'absolute',
                textAlign: 'center',
                fontFamily: 'Courier New, monospace',
              }}
              role="timer"
              aria-label={`Timer showing ${formatTime(remainingSeconds)} remaining out of ${formatTime(totalSeconds)} total`}
              aria-live="polite"
            >
              <Typography 
                variant="h2" 
                component="div"
                sx={{ 
                  fontSize: 'clamp(2.5rem, 8vw, 6rem)',
                  fontWeight: 'bold',
                  color: 'text.primary',
                  lineHeight: 1,
                  fontFamily: 'Courier New, monospace',
                  '@media (max-width:480px)': {
                    fontSize: 'clamp(2rem, 7vw, 4.5rem)',
                  },
                  '@media (max-width:360px)': {
                    fontSize: 'clamp(1.8rem, 6vw, 3.5rem)',
                  },
                  '@media (max-height:600px) and (orientation: landscape)': {
                    fontSize: 'clamp(1.5rem, 6vh, 3rem)',
                  },
                }}
              >
                {formatTime(remainingSeconds)}
              </Typography>
              <Typography 
                variant="body1" 
                component="div"
                sx={{ 
                  fontSize: 'clamp(1rem, 2.5vw, 2rem)',
                  color: 'text.secondary',
                  mt: 0.5,
                  fontFamily: 'Courier New, monospace',
                  '@media (max-width:480px)': {
                    fontSize: 'clamp(0.875rem, 2.2vw, 1.5rem)',
                  },
                  '@media (max-width:360px)': {
                    fontSize: 'clamp(0.75rem, 2vw, 1.25rem)',
                  },
                  '@media (max-height:600px) and (orientation: landscape)': {
                    fontSize: 'clamp(0.8rem, 2vh, 1.2rem)',
                  },
                }}
              >
                / {formatTime(totalSeconds)}
              </Typography>
            </Box>
          </Box>
        </Box>

      {/* Controls Section */}
      <Box 
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          flex: 1,
          minHeight: 0,
          '@media (max-height:600px) and (orientation: landscape)': {
            flex: '1 1 auto',
            justifyContent: 'center',
            maxWidth: '400px',
          },
        }}
      >
        <Stack 
          spacing={3} 
          sx={{ 
            width: '100%',
            '@media (max-height:600px) and (orientation: landscape)': {
              spacing: 2,
              justifyContent: 'center',
              alignItems: 'center',
            },
          }}
        >
            {/* Timer Adjustment Buttons */}
            <Stack 
              direction="row" 
              spacing={0.5} 
              justifyContent="center" 
              flexWrap="wrap"
              sx={{
                gap: 0.5,
                '@media (max-width:480px)': {
                  gap: 0.375,
                },
                '@media (max-width:360px)': {
                  gap: 0.25,
                },
                '@media (max-height:600px) and (orientation: landscape)': {
                  gap: 0.5,
                  justifyContent: 'center',
                },
              }}
            >
              <Button 
                variant="contained"
                color="error"
                size="small"
                startIcon={<RemoveIcon sx={{ fontSize: '16px !important' }} />}
                onClick={() => removeTime(5)}
                disabled={totalSeconds <= 300}
                aria-label="Remove 5 minutes from timer"
                sx={{
                  minWidth: '60px',
                  px: 1,
                  fontSize: '0.875rem',
                  '@media (max-width:480px)': {
                    minWidth: '55px',
                    px: 0.75,
                    fontSize: '0.8rem',
                  },
                  '@media (max-width:360px)': {
                    minWidth: '50px',
                    px: 0.5,
                    fontSize: '0.75rem',
                  },
                  '@media (max-height:600px) and (orientation: landscape)': {
                    minWidth: '70px',
                    fontSize: '0.8rem',
                  },
                }}
              >
                5m
              </Button>
              <Button 
                variant="contained"
                color="error"
                size="small"
                startIcon={<RemoveIcon sx={{ fontSize: '16px !important' }} />}
                onClick={() => removeTime(1)}
                disabled={totalSeconds <= 60}
                aria-label="Remove 1 minute from timer"
                sx={{
                  minWidth: '60px',
                  px: 1,
                  fontSize: '0.875rem',
                  '@media (max-width:480px)': {
                    minWidth: '55px',
                    px: 0.75,
                    fontSize: '0.8rem',
                  },
                  '@media (max-width:360px)': {
                    minWidth: '50px',
                    px: 0.5,
                    fontSize: '0.75rem',
                  },
                  '@media (max-height:600px) and (orientation: landscape)': {
                    minWidth: '70px',
                    fontSize: '0.8rem',
                  },
                }}
              >
                1m
              </Button>
              <Button 
                variant="contained"
                color="secondary"
                size="small"
                startIcon={<AddIcon sx={{ fontSize: '16px !important' }} />}
                onClick={() => addTime(1)}
                aria-label="Add 1 minute to timer"
                sx={{
                  minWidth: '60px',
                  px: 1,
                  fontSize: '0.875rem',
                  '@media (max-width:480px)': {
                    minWidth: '55px',
                    px: 0.75,
                    fontSize: '0.8rem',
                  },
                  '@media (max-width:360px)': {
                    minWidth: '50px',
                    px: 0.5,
                    fontSize: '0.75rem',
                  },
                  '@media (max-height:600px) and (orientation: landscape)': {
                    minWidth: '70px',
                    fontSize: '0.8rem',
                  },
                }}
              >
                1m
              </Button>
              <Button 
                variant="contained"
                color="secondary"
                size="small"
                startIcon={<AddIcon sx={{ fontSize: '16px !important' }} />}
                onClick={() => addTime(5)}
                aria-label="Add 5 minutes to timer"
                sx={{
                  minWidth: '60px',
                  px: 1,
                  fontSize: '0.875rem',
                  '@media (max-width:480px)': {
                    minWidth: '55px',
                    px: 0.75,
                    fontSize: '0.8rem',
                  },
                  '@media (max-width:360px)': {
                    minWidth: '50px',
                    px: 0.5,
                    fontSize: '0.75rem',
                  },
                  '@media (max-height:600px) and (orientation: landscape)': {
                    minWidth: '70px',
                    fontSize: '0.8rem',
                  },
                }}
              >
                5m
              </Button>
            </Stack>

            {/* Control Buttons */}
            <Stack 
              direction="row" 
              spacing={2} 
              justifyContent="center"
              sx={{
                '@media (max-width:480px)': {
                  gap: 1.5,
                },
                '@media (max-height:600px) and (orientation: landscape)': {
                  gap: 1.5,
                  justifyContent: 'center',
                },
              }}
            >
              {!isRunning ? (
                <Button 
                  variant="contained"
                  color="primary"
                  size="large"
                  startIcon={<PlayArrow />}
                  onClick={handleStart}
                  disabled={remainingSeconds === 0}
                  aria-label={`Start timer for ${formatTime(totalSeconds)}`}
                  sx={{
                    '@media (max-height:600px) and (orientation: landscape)': {
                      minWidth: 'auto',
                    },
                  }}
                >
                  Start
                </Button>
              ) : (
                <Button 
                  variant="contained"
                  color="warning"
                  size="large"
                  startIcon={<Pause />}
                  onClick={handlePause}
                  aria-label="Pause timer"
                  sx={{
                    '@media (max-height:600px) and (orientation: landscape)': {
                      minWidth: 'auto',
                    },
                  }}
                >
                  Pause
                </Button>
              )}
              <Button 
                variant="contained"
                sx={{ 
                  backgroundColor: 'grey.500',
                  '&:hover': {
                    backgroundColor: 'grey.600',
                  },
                  '@media (max-height:600px) and (orientation: landscape)': {
                    minWidth: 'auto',
                  },
                }}
                size="large"
                startIcon={<Refresh />}
                onClick={handleReset}
                aria-label="Reset timer to original duration"
              >
                Reset
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Box>

      <Dialog
        open={Boolean(isComplete)}
        onClose={handleReset}
        aria-labelledby="completion-dialog-title"
        maxWidth="sm"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: '1rem',
            maxWidth: 400,
            width: '90%',
            '@media (max-width:480px)': {
              width: '95%',
              m: 2,
            },
          },
        }}
      >
        <DialogTitle 
          id="completion-dialog-title"
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            pb: 1,
          }}
        >
          <span>⏰ Time's Up!</span>
          <IconButton
            aria-label="close"
            onClick={handleReset}
            sx={{
              color: 'grey.500',
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" align="center" sx={{ mb: 2 }}>
            The timer has finished!
          </Typography>
        </DialogContent>
        <DialogActions 
          sx={{ 
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 1, sm: 1.5 },
            p: 2,
            pt: 0,
            '& > :not(style)': {
              width: { xs: '100%', sm: 'auto' },
            },
          }}
        >
          <Button 
            variant="contained"
            color="primary"
            onClick={handleStart}
            aria-label="Start timer again"
          >
            Start Again
          </Button>
          <Button 
            variant="contained"
            sx={{ 
              backgroundColor: 'grey.500',
              '&:hover': {
                backgroundColor: 'grey.600',
              },
            }}
            onClick={handleReset}
            aria-label="Reset timer"
          >
            Reset
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
