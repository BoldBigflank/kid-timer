import { connect } from 'redux-zero/preact'
import { Timer } from './timer'
import { useTheme } from '../contexts/theme-context'
import { TIMER_CHANNEL } from '../config/config'
import { Container, Typography, Box, Chip, IconButton, Tooltip } from '@mui/material'
import { 
  FiberManualRecord as FiberManualRecordIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon
} from '@mui/icons-material'
import type { AppState } from '../store'

interface AppContentProps {
  timer: AppState['timer']
  ui: AppState['ui']
}

function AppContentComponent({ timer, ui }: AppContentProps) {
  const { mode, toggleTheme } = useTheme()

  // Create background with subtle tinting based on timer state from Redux store
  const getBackgroundGradient = () => {
    if (mode === 'light') {
      if (timer.isComplete) {
        // Blue tint for completed state
        return 'linear-gradient(135deg, #f8faff 0%, #e6f3ff 100%)'
      } else if (timer.isRunning) {
        // Red tint for running state  
        return 'linear-gradient(135deg, #fff8f8 0%, #ffe6e6 100%)'
      } else if (timer.isPaused) {
        // Grey tint for paused state
        return 'linear-gradient(135deg, #f9f9f9 0%, #f0f0f0 100%)'
      } else {
        // Default light background
        return 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
      }
    } else {
      if (timer.isComplete) {
        // Blue tint for completed state (dark mode)
        return 'linear-gradient(135deg, #0f1621 0%, #1a1f3a 100%)'
      } else if (timer.isRunning) {
        // Red tint for running state (dark mode)
        return 'linear-gradient(135deg, #1a0f14 0%, #2e1a1f 100%)'
      } else if (timer.isPaused) {
        // Grey tint for paused state (dark mode)
        return 'linear-gradient(135deg, #141419 0%, #1f1f2e 100%)'
      } else {
        // Default dark background
        return 'linear-gradient(135deg, #0f1419 0%, #1a1f2e 100%)'
      }
    }
  }

  return (
    <Container 
      maxWidth={false}
      sx={{ 
        minHeight: '100dvh',
        maxHeight: '100dvh', // Prevent y overflow
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 2,
        overflow: 'hidden', // Prevent scrolling
        background: getBackgroundGradient(),
        transition: 'background 0.5s ease', // Smooth transition between states
        '@media (max-width:480px)': {
          justifyContent: 'flex-start',
          pt: 2,
          py: 1,
        },
        '@media (max-height:600px) and (orientation: landscape)': {
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          py: 1,
          px: 2,
          gap: 2,
          maxWidth: '100vw',
        },
      }}
    >
      {/* Header Section */}
      <Box 
        sx={{ 
          mb: 3, 
          textAlign: 'center',
          position: 'relative',
          width: '100%',
          flexShrink: 0,
          '@media (max-width:480px)': {
            mb: 2,
          },
          '@media (max-height:600px) and (orientation: landscape)': {
            position: 'absolute',
            top: 8,
            left: 16,
            width: 'auto',
            mb: 0,
            zIndex: 10,
          },
        }}
      >
        {/* Theme Toggle Button */}
        <Box 
          sx={{ 
            position: 'absolute',
            top: 0,
            right: 0,
            '@media (max-width:480px)': {
              right: -8,
              top: -8,
            },
            '@media (max-height:600px) and (orientation: landscape)': {
              position: 'fixed',
              top: 8,
              right: 16,
              zIndex: 20,
            },
          }}
        >
          <Tooltip title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}>
            <IconButton 
              onClick={toggleTheme}
              sx={{
                color: 'text.primary',
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              }}
              aria-label={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}
            >
              {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
            </IconButton>
          </Tooltip>
        </Box>
        
        <Typography 
          variant="h1" 
          component="h1" 
          gutterBottom
          sx={{
            '@media (max-height:600px) and (orientation: landscape)': {
              fontSize: '1.5rem',
              mb: 0.5,
            },
          }}
        >
          Kid Timer
        </Typography>
        
        <Tooltip title={`PubNub Channel: ${TIMER_CHANNEL}`}>
          <Chip
            icon={<FiberManualRecordIcon sx={{ fontSize: '8px !important' }} />}
            label={ui.isConnected ? 'Synced with all users' : 'Connecting...'}
            color={ui.isConnected ? 'success' : 'error'}
            variant="outlined"
            size="small"
            sx={{
              '& .MuiChip-icon': {
                animation: ui.isConnected ? 'pulse 2s infinite' : 'none',
              },
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.5 },
              },
              '@media (max-height:600px) and (orientation: landscape)': {
                fontSize: '0.7rem',
                height: '20px',
              },
            }}
          />
        </Tooltip>
      </Box>
      
      {/* Timer Section - Takes remaining space */}
      <Box 
        sx={{
          flex: 1,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 0, // Allow flex shrinking
          '@media (max-height:600px) and (orientation: landscape)': {
            width: '100%',
            height: '100%',
          },
        }}
      >
        <Timer initialMinutes={5} />
      </Box>
    </Container>
  )
}

// Connect the AppContent component to Redux Zero
const AppContent = connect(
  ({ timer, ui }: AppState) => ({ timer, ui })
)(AppContentComponent)

export function App() {
  return <AppContent />
}