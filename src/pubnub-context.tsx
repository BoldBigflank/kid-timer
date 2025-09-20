import { createContext } from 'preact'
import { useContext, useEffect, useState, useRef } from 'preact/hooks'
import PubNub from 'pubnub'
import { PUBNUB_CONFIG, TIMER_CHANNEL, validatePubNubConfig } from './secrets'

export interface TimerState {
  durationMs: number // Total duration in milliseconds
  startTime: number | null // Epoch timestamp when timer started (null if not started)
  endTime: number | null // Epoch timestamp when timer should end (null if not started)
  isRunning: boolean
  pausedRemainingMs?: number // Remaining time when paused (null if not paused)
  lastUpdated: number // When this state was published
}

interface PubNubContextType {
  publishTimerState: (state: TimerState) => void
  timerState: TimerState | null
  isConnected: boolean
}

const PubNubContext = createContext<PubNubContextType | null>(null)

export function PubNubProvider({ children }: { children: any }) {
  const [pubnub] = useState(() => {
    // Validate configuration on initialization
    const validation = validatePubNubConfig()
    if (validation.usingDemo) {
      console.log('🔧 PubNub initialized with demo keys')
    } else {
      console.log('✅ PubNub initialized with custom keys')
    }
    
    return new PubNub(PUBNUB_CONFIG)
  })
  const [timerState, setTimerState] = useState<TimerState | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const lastPublishedState = useRef<TimerState | null>(null)

  useEffect(() => {
    // Add listener for incoming messages
    const listener = {
      message: (event: any) => {
        console.log('📨 Received PubNub message:', event)
        if (event.channel === TIMER_CHANNEL) {
          const newState = event.message as unknown as TimerState
          console.log('📥 Timer message received:', newState)
          console.log('📊 Current timerState:', timerState)
          
          // Only update if this is a newer state
          if (!timerState || newState.lastUpdated > timerState.lastUpdated) {
            console.log('✅ Updating timer state with newer message')
            setTimerState(newState)
          } else {
            console.log('⏸️ Ignoring older message')
          }
        }
      },
      status: (statusEvent: any) => {
        console.log('🔄 PubNub status event:', statusEvent)
        if (statusEvent.category === 'PNConnectedCategory') {
          console.log('✅ PubNub connected')
          setIsConnected(true)
        } else if (statusEvent.category === 'PNNetworkDownCategory' || 
                   statusEvent.category === 'PNNetworkIssuesCategory') {
          console.log('❌ PubNub disconnected')
          setIsConnected(false)
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
        const latestState = response.messages[0].entry as unknown as TimerState
        console.log('📜 Loaded timer state from history:', latestState)
        setTimerState(latestState)
      } else {
        console.log('📜 No timer history found')
      }
    }).catch((error) => {
      console.error('❌ Failed to get timer history:', error)
    })

    return () => {
      pubnub.removeListener(listener)
      pubnub.unsubscribe({
        channels: [TIMER_CHANNEL]
      })
    }
  }, [pubnub])

  const publishTimerState = (state: TimerState) => {
    console.log('🚀 publishTimerState called with:', state)
    console.log('🔗 isConnected:', isConnected)
    
    // Only publish if the state has actually changed
    const stateChanged = !lastPublishedState.current ||
      lastPublishedState.current.durationMs !== state.durationMs ||
      lastPublishedState.current.startTime !== state.startTime ||
      lastPublishedState.current.endTime !== state.endTime ||
      lastPublishedState.current.isRunning !== state.isRunning ||
      lastPublishedState.current.pausedRemainingMs !== state.pausedRemainingMs

    console.log('📊 State changed:', stateChanged, 'Last published:', lastPublishedState.current)

    if (stateChanged && isConnected) {
      const stateWithTimestamp = {
        ...state,
        lastUpdated: Date.now()
      }

      console.log('📤 Publishing to PubNub:', stateWithTimestamp)

      pubnub.publish({
        channel: TIMER_CHANNEL,
        message: stateWithTimestamp,
        storeInHistory: true
      }).then((response) => {
        console.log('✅ Published successfully:', response)
        lastPublishedState.current = stateWithTimestamp
      }).catch((error) => {
        console.error('❌ Failed to publish timer state:', error)
        console.error('❌ Error details:', error.message, error.status)
      })
    } else {
      console.log('⏸️ Not publishing - stateChanged:', stateChanged, 'isConnected:', isConnected)
    }
  }

  return (
    <PubNubContext.Provider value={{ publishTimerState, timerState, isConnected }}>
      {children}
    </PubNubContext.Provider>
  )
}

export function usePubNub() {
  const context = useContext(PubNubContext)
  if (!context) {
    throw new Error('usePubNub must be used within a PubNubProvider')
  }
  return context
}
