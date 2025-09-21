import { useEffect, useCallback } from 'preact/hooks'
import { connect } from 'redux-zero/preact'
import { useDynamicFavicon } from './hooks/use-dynamic-favicon'
import { useWakeLock } from './hooks/use-wake-lock'
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
import actions from './store/actions'
import type { AppState } from './store'

interface TimerProps {
  initialMinutes?: number
  // Redux Zero props
  timer: AppState['timer']
  ui: AppState['ui']
  startTimer: () => void
  pauseTimer: () => void
  resetTimer: (initialMinutes?: number) => void
  addTime: (minutes: number) => void
  removeTime: (minutes: number) => void
}

function TimerComponent({ 
  initialMinutes = 5,
  timer,
  ui,
  startTimer,
  pauseTimer,
  resetTimer,
  addTime,
  removeTime
}: TimerProps) {
  const { setWakeLockActive, isSupported: wakeLockSupported } = useWakeLock()
  
  console.log('🔍 Timer render - Redux state:', timer, 'UI state:', ui)

  // Manage wake lock based on timer running state
  useEffect(() => {
    if (wakeLockSupported) {
      console.log(`🔒 Wake lock ${timer.isRunning ? 'activating' : 'deactivating'} - timer is ${timer.isRunning ? 'running' : 'stopped'}`)
      setWakeLockActive(timer.isRunning)
    }
  }, [timer.isRunning, setWakeLockActive, wakeLockSupported])

  // Define handleReset early so it can be used in useEffect
  const handleReset = useCallback(() => {
    console.log('🔄 Resetting timer from completed state')
    resetTimer(initialMinutes)
  }, [initialMinutes, resetTimer])

  // Handle keyboard events for modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && timer.isComplete) {
        console.log('⌨️ Escape key pressed, closing modal')
        handleReset()
      }
    }

    if (timer.isComplete) {
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
  }, [timer.isComplete, handleReset])

  // Calculate derived values from timestamps
  const totalSeconds = Math.floor(timer.durationMs / 1000)
  
  // Calculate remaining time based on current state
  let remainingMs: number
  if (timer.isRunning && timer.endTime) {
    // Timer is running - calculate remaining time from end time using real-time
    remainingMs = Math.max(0, timer.endTime - Date.now())
  } else if (!timer.isRunning && timer.startTime && timer.endTime) {
    // Timer was completed - check if it actually completed
    const timeRemaining = Math.max(0, timer.endTime - ui.currentTime)
    if (timeRemaining === 0) {
      // Timer completed - show 0 remaining time
      remainingMs = 0
    } else {
      // This shouldn't happen with the new pause logic, but handle it gracefully
      remainingMs = timer.durationMs
    }
  } else if (!timer.isRunning && timer.pausedRemainingMs !== undefined) {
    // Timer was paused - use the stored paused remaining time
    remainingMs = timer.pausedRemainingMs
  } else {
    // Timer not started or reset - use full duration
    remainingMs = timer.durationMs
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
  const progressColor = timer.isComplete ? '#3b82f6' : timer.isPaused ? '#d1d5db' : '#ef4444' // blue when complete, light grey when paused, red while running

  // State changes are now handled globally via Redux Zero - no need for callbacks

  // Update favicon dynamically with timer progress
  useDynamicFavicon({ 
    progress, 
    isRunning: timer.isRunning, 
    isComplete: timer.isComplete 
  })

  const handleStart = () => {
    console.log('▶️ Starting timer via Redux action')
    startTimer()
  }

  const handlePause = () => {
    console.log('⏸️ Pausing timer via Redux action')
    pauseTimer()
  }

  const handleAddTime = (minutes: number) => {
    console.log(`➕ Adding ${minutes} minutes via Redux action`)
    addTime(minutes)
  }

  const handleRemoveTime = (minutes: number) => {
    console.log(`➖ Removing ${minutes} minutes via Redux action`)
    removeTime(minutes)
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
                onClick={() => handleRemoveTime(5)}
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
                onClick={() => handleRemoveTime(1)}
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
                onClick={() => handleAddTime(1)}
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
                onClick={() => handleAddTime(5)}
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
              {!timer.isRunning ? (
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
        open={timer.isComplete}
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

// Connect the Timer component to Redux Zero
export const Timer = connect(
  ({ timer, ui }: AppState) => ({ timer, ui }),
  actions
)(TimerComponent)