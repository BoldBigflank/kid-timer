import { createContext } from 'preact'
import { useContext, useEffect, useRef } from 'preact/hooks'
import { connect } from 'redux-zero/preact'
import PubNub from 'pubnub'
import { PUBNUB_CONFIG, TIMER_CHANNEL, validatePubNubConfig } from '../secrets'
import actions from './actions'
import type { AppState } from './index'

interface PubNubIntegrationContextType {
  pubnub: PubNub | null
}

const PubNubIntegrationContext = createContext<PubNubIntegrationContextType>({ pubnub: null })

// Component that handles PubNub integration with Redux Zero
function PubNubIntegrationComponent({ 
  timer, 
  ui, 
  syncTimerState, 
  setConnected,
  updateCurrentTime,
  children 
}: {
  timer: AppState['timer']
  ui: AppState['ui']
  syncTimerState: (timerState: any) => void
  setConnected: (isConnected: boolean) => void
  updateCurrentTime: (currentTime: number) => void
  children: any
}) {
  const pubnubRef = useRef<PubNub | null>(null)
  const lastPublishedState = useRef<any>(null)
  const isInitialized = useRef(false)

  // Initialize PubNub
  useEffect(() => {
    const validation = validatePubNubConfig()
    if (validation.usingDemo) {
      console.log('🔧 PubNub initialized with demo keys')
    } else {
      console.log('✅ PubNub initialized with custom keys')
    }
    
    pubnubRef.current = new PubNub(PUBNUB_CONFIG)
    const pubnub = pubnubRef.current

    // Add listener for incoming messages
    const listener = {
      message: (event: any) => {
        console.log('📨 Received PubNub message:', event)
        if (event.channel === TIMER_CHANNEL) {
          const newState = event.message
          console.log('📥 Timer message received:', newState)
          
          // Only update if this is a newer state
          if (!timer || newState.lastUpdated > timer.lastUpdated) {
            console.log('✅ Updating timer state with newer message')
            syncTimerState(newState)
          } else {
            console.log('⏸️ Ignoring older message')
          }
        }
      },
      status: (statusEvent: any) => {
        console.log('🔄 PubNub status event:', statusEvent)
        if (statusEvent.category === 'PNConnectedCategory') {
          console.log('✅ PubNub connected')
          setConnected(true)
        } else if (statusEvent.category === 'PNNetworkDownCategory' || 
                   statusEvent.category === 'PNNetworkIssuesCategory') {
          console.log('❌ PubNub disconnected')
          setConnected(false)
        }
      }
    }

    pubnub.addListener(listener)

    // Subscribe to the timer channel
    console.log('🔔 Subscribing to channel:', TIMER_CHANNEL)
    pubnub.subscribe({
      channels: [TIMER_CHANNEL]
    })

    // Get current state from history
    console.log('📜 Fetching timer history...')
    pubnub.history({
      channel: TIMER_CHANNEL,
      count: 1
    }).then((response) => {
      console.log('📜 History response:', response)
      if (response.messages.length > 0) {
        const latestState = response.messages[0].entry
        console.log('📜 Loaded timer state from history:', latestState)
        syncTimerState(latestState)
      } else {
        console.log('📜 No timer history found')
      }
      isInitialized.current = true
    }).catch((error) => {
      console.error('❌ Failed to get timer history:', error)
      isInitialized.current = true
    })

    return () => {
      pubnub.removeListener(listener)
      pubnub.unsubscribe({
        channels: [TIMER_CHANNEL]
      })
    }
  }, [syncTimerState, setConnected])

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      updateCurrentTime(Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [updateCurrentTime])

  // Publish state changes to PubNub
  useEffect(() => {
    if (!pubnubRef.current || !ui.isConnected || !isInitialized.current) return

    // Check if state has changed
    const stateChanged = !lastPublishedState.current ||
      lastPublishedState.current.durationMs !== timer.durationMs ||
      lastPublishedState.current.startTime !== timer.startTime ||
      lastPublishedState.current.endTime !== timer.endTime ||
      lastPublishedState.current.isRunning !== timer.isRunning ||
      lastPublishedState.current.pausedRemainingMs !== timer.pausedRemainingMs

    if (stateChanged) {
      const stateToPublish = {
        durationMs: timer.durationMs,
        startTime: timer.startTime,
        endTime: timer.endTime,
        isRunning: timer.isRunning,
        pausedRemainingMs: timer.pausedRemainingMs,
        lastUpdated: timer.lastUpdated
      }

      console.log('📤 Publishing timer state to PubNub:', stateToPublish)

      pubnubRef.current.publish({
        channel: TIMER_CHANNEL,
        message: stateToPublish,
        storeInHistory: true
      }).then((response) => {
        console.log('✅ Published successfully:', response)
        lastPublishedState.current = stateToPublish
      }).catch((error) => {
        console.error('❌ Failed to publish timer state:', error)
      })
    }
  }, [timer, ui.isConnected])

  return (
    <PubNubIntegrationContext.Provider value={{ pubnub: pubnubRef.current }}>
      {children}
    </PubNubIntegrationContext.Provider>
  )
}

// Connected component
const ConnectedPubNubIntegration = connect(
  ({ timer, ui }: AppState) => ({ timer, ui }),
  actions
)(PubNubIntegrationComponent)

export function PubNubIntegrationProvider({ children }: { children: any }) {
  return <ConnectedPubNubIntegration>{children}</ConnectedPubNubIntegration>
}

export function usePubNubIntegration() {
  return useContext(PubNubIntegrationContext)
}
