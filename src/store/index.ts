import createStore from 'redux-zero'
import { applyMiddleware } from 'redux-zero/middleware'
import { connect } from 'redux-zero/devtools'

export interface TimerState {
  durationMs: number // Total duration in milliseconds
  startTime: number | null // Epoch timestamp when timer started (null if not started)
  endTime: number | null // Epoch timestamp when timer should end (null if not started)
  isRunning: boolean
  pausedRemainingMs?: number // Remaining time when paused (null if not paused)
  lastUpdated: number // When this state was published
  isComplete: boolean // Computed state for UI
  isPaused: boolean // Computed state for UI
}

export interface AppState {
  timer: TimerState
  ui: {
    isConnected: boolean
    currentTime: number // For real-time calculations
    lastUpdateFromPubNub: boolean // Track if last update came from PubNub
  }
}

const initialState: AppState = {
  timer: {
    durationMs: 5 * 60 * 1000, // 5 minutes default
    startTime: null,
    endTime: null,
    isRunning: false,
    pausedRemainingMs: undefined,
    lastUpdated: Date.now(),
    isComplete: false,
    isPaused: false,
  },
  ui: {
    isConnected: false,
    currentTime: Date.now(),
    lastUpdateFromPubNub: false,
  }
}

// Setup Redux DevTools if available
const middlewares = connect ? applyMiddleware(connect(initialState)) : []

const store = createStore(initialState, middlewares)

export default store
