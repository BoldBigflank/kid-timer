import { useState, useEffect, useRef, useCallback } from 'preact/hooks'
import { usePubNub, type TimerState } from './pubnub-context'
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
}

export function Timer({ initialMinutes = 5 }: TimerProps) {
  const { publishTimerState, timerState, isConnected } = usePubNub()
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
    // Timer is running - calculate remaining time from end time
    remainingMs = Math.max(0, endTime - currentTime)
  } else if (!isRunning && startTime && endTime) {
    // Timer was completed or paused
    const timeRemaining = Math.max(0, endTime - currentTime)
    if (timeRemaining === 0) {
      // Timer completed - show 0 remaining time
      remainingMs = 0
    } else {
      // Timer was paused - use the duration that was set when paused
      remainingMs = durationMs
    }
  } else {
    // Timer not started or reset - use full duration
    remainingMs = durationMs
  }
  
  const remainingSeconds = Math.floor(remainingMs / 1000)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const progress = totalSeconds > 0 ? ((totalSeconds - remainingSeconds) / totalSeconds) * 100 : 0
  const progressColor = isComplete ? '#3b82f6' : '#ef4444' // blue when complete, red while running

  const handleStart = () => {
    const now = Date.now()
    const newStartTime = now
    const newEndTime = now + durationMs
    
    console.log('▶️ Starting timer:', {
      now,
      newStartTime,
      newEndTime,
      durationMs,
      willRunFor: (newEndTime - newStartTime) / 1000 + ' seconds'
    })
    
    setStartTime(newStartTime)
    setEndTime(newEndTime)
    setIsRunning(true)
    
    const stateToPublish = {
      durationMs,
      startTime: newStartTime,
      endTime: newEndTime,
      isRunning: true,
      lastUpdated: now
    }
    
    console.log('▶️ Publishing start state:', stateToPublish)
    publishTimerState(stateToPublish)
  }

  const handlePause = () => {
    // When pausing, calculate remaining time and update duration
    const newDurationMs = remainingMs
    
    setDurationMs(newDurationMs)
    setStartTime(null)
    setEndTime(null)
    setIsRunning(false)
    
    publishTimerState({
      durationMs: newDurationMs,
      startTime: null,
      endTime: null,
      isRunning: false,
      lastUpdated: Date.now()
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
        lastUpdated: Date.now()
      })
    } else {
      // If not running and not completed, just update duration
      publishTimerState({
        durationMs: newDurationMs,
        startTime,
        endTime,
        isRunning,
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
        lastUpdated: Date.now()
      })
    } else {
      // If not running and not completed, just update duration
      publishTimerState({
        durationMs: newDurationMs,
        startTime,
        endTime,
        isRunning,
        lastUpdated: Date.now()
      })
    }
  }

  return (
    <Box 
      sx={{ 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        p: 2,
        maxWidth: 400,
        mx: 'auto',
        width: '100%',
        boxSizing: 'border-box',
        '@media (max-width:480px)': {
          p: 1.5,
          gap: 2.5,
        },
        '@media (max-width:360px)': {
          p: 1,
          gap: 2,
        },
        '@media (max-height:600px) and (orientation: landscape)': {
          gap: 2,
          p: 1,
        },
      }}
    >
      <Box 
        sx={{ 
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          '@media (max-width:480px)': {
            transform: 'scale(0.9)',
          },
          '@media (max-width:360px)': {
            transform: 'scale(0.8)',
          },
          '@media (max-height:600px) and (orientation: landscape)': {
            transform: 'scale(0.75)',
          },
        }}
      >
        <CircularProgress
          variant="determinate"
          value={progress}
          size={200}
          thickness={4}
          sx={{
            color: progressColor,
            '& .MuiCircularProgress-circle': {
              strokeLinecap: 'round',
              transition: 'stroke-dashoffset 0.3s ease, stroke 0.5s ease',
            },
          }}
        />
        <CircularProgress
          variant="determinate"
          value={100}
          size={200}
          thickness={4}
          sx={{
            color: 'divider',
            position: 'absolute',
            opacity: 0.3,
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
              fontSize: '2.5rem',
              fontWeight: 'bold',
              color: 'text.primary',
              lineHeight: 1,
              fontFamily: 'Courier New, monospace',
              '@media (max-width:480px)': {
                fontSize: '2.25rem',
              },
              '@media (max-width:360px)': {
                fontSize: '2rem',
              },
              '@media (max-height:600px) and (orientation: landscape)': {
                fontSize: '1.75rem',
              },
            }}
          >
            {formatTime(remainingSeconds)}
          </Typography>
          <Typography 
            variant="body1" 
            component="div"
            sx={{ 
              fontSize: '1rem',
              color: 'text.secondary',
              mt: 0.5,
              fontFamily: 'Courier New, monospace',
              '@media (max-width:480px)': {
                fontSize: '0.875rem',
              },
              '@media (max-width:360px)': {
                fontSize: '0.75rem',
              },
              '@media (max-height:600px) and (orientation: landscape)': {
                fontSize: '0.75rem',
              },
            }}
          >
            / {formatTime(totalSeconds)}
          </Typography>
        </Box>
      </Box>

      <Stack spacing={3} sx={{ width: '100%' }}>
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
            }}
          >
            5m
          </Button>
        </Stack>

        <Stack 
          direction="row" 
          spacing={2} 
          justifyContent="center"
          sx={{
            '@media (max-width:480px)': {
              gap: 1.5,
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
    </Box>
  )
}
