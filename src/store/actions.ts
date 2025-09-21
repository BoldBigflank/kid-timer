import type { AppState } from './index'

export interface TimerActions {
  // Timer control actions
  startTimer: (state: AppState) => AppState
  pauseTimer: (state: AppState) => AppState
  resetTimer: (state: AppState, initialMinutes?: number) => AppState
  
  // Timer adjustment actions
  addTime: (state: AppState, minutes: number) => AppState
  removeTime: (state: AppState, minutes: number) => AppState
  
  // Duration setting
  setDuration: (state: AppState, durationMs: number) => AppState
  
  // State synchronization from PubNub
  syncTimerState: (state: AppState, timerState: any) => AppState
  
  // UI state actions
  setConnected: (state: AppState, isConnected: boolean) => AppState
  updateCurrentTime: (state: AppState, currentTime: number) => AppState
  
  // Computed state updates
  updateComputedState: (state: AppState) => AppState
}

// Helper function to calculate computed states
const calculateComputedState = (timer: AppState['timer'], currentTime: number) => {
  const isComplete = !timer.isRunning && timer.startTime && timer.endTime && currentTime >= timer.endTime
  const isPaused = !timer.isRunning && timer.pausedRemainingMs !== undefined && timer.pausedRemainingMs !== null
  
  return {
    ...timer,
    isComplete: Boolean(isComplete),
    isPaused: Boolean(isPaused)
  }
}

const actions = (_store: any): TimerActions => ({
  startTimer: (state: AppState) => {
    const now = Date.now()
    let timeToRun = state.timer.durationMs
    
    // If timer was paused, use the stored paused remaining time
    if (!state.timer.isRunning && state.timer.pausedRemainingMs !== undefined) {
      timeToRun = state.timer.pausedRemainingMs
    }
    
    const newStartTime = now
    const newEndTime = now + timeToRun
    
    const newTimer = calculateComputedState({
      ...state.timer,
      isRunning: true,
      startTime: newStartTime,
      endTime: newEndTime,
      pausedRemainingMs: undefined, // Clear paused state when resuming
      lastUpdated: now
    }, state.ui.currentTime)

    console.log('▶️ Redux: Starting timer:', { newStartTime, newEndTime, timeToRun })
    
    return {
      ...state,
      timer: newTimer
    }
  },

  pauseTimer: (state: AppState) => {
    const now = Date.now()
    
    // Calculate remaining time
    let remainingMs = state.timer.durationMs
    if (state.timer.isRunning && state.timer.endTime) {
      remainingMs = Math.max(0, state.timer.endTime - now)
    }
    
    const newTimer = calculateComputedState({
      ...state.timer,
      startTime: null,
      endTime: null,
      isRunning: false,
      pausedRemainingMs: remainingMs, // Store remaining time when paused
      lastUpdated: now
    }, state.ui.currentTime)

    console.log('⏸️ Redux: Pausing timer:', { remainingMs })
    
    return {
      ...state,
      timer: newTimer
    }
  },

  resetTimer: (state: AppState, initialMinutes = 5) => {
    const initialDurationMs = initialMinutes * 60 * 1000
    const now = Date.now()
    
    // Don't use calculateComputedState for reset - we want explicit control
    const newTimer = {
      durationMs: initialDurationMs,
      startTime: null,
      endTime: null,
      isRunning: false,
      pausedRemainingMs: undefined, // Clear paused state when resetting
      lastUpdated: now,
      isComplete: false,
      isPaused: false
    }

    console.log('🔄 Redux: Resetting timer to', initialMinutes, 'minutes')
    
    return {
      ...state,
      timer: newTimer
    }
  },

  addTime: (state: AppState, minutes: number) => {
    const additionalMs = minutes * 60 * 1000
    const newDurationMs = state.timer.durationMs + additionalMs
    const now = Date.now()
    
    let newTimer = { ...state.timer, durationMs: newDurationMs }
    
    if (state.timer.isRunning && state.timer.startTime && state.timer.endTime) {
      // If running, extend the end time
      newTimer.endTime = state.timer.endTime + additionalMs
    } else if (state.timer.isComplete) {
      // If completed, clear the completed state and set new duration
      newTimer = {
        ...newTimer,
        startTime: null,
        endTime: null,
        isRunning: false,
        pausedRemainingMs: undefined,
      }
    } else if (state.timer.pausedRemainingMs !== undefined) {
      // If paused, adjust the paused remaining time
      newTimer.pausedRemainingMs = state.timer.pausedRemainingMs + additionalMs
    }
    
    newTimer.lastUpdated = now
    newTimer = calculateComputedState(newTimer, state.ui.currentTime)

    console.log(`➕ Redux: Adding ${minutes} minutes to timer`)
    
    return {
      ...state,
      timer: newTimer
    }
  },

  removeTime: (state: AppState, minutes: number) => {
    const reductionMs = minutes * 60 * 1000
    const newDurationMs = Math.max(60 * 1000, state.timer.durationMs - reductionMs) // Minimum 1 minute
    const now = Date.now()
    
    let newTimer = { ...state.timer, durationMs: newDurationMs }
    
    if (state.timer.isRunning && state.timer.startTime && state.timer.endTime) {
      // If running, reduce the end time but don't go below current time
      const maxReduction = state.timer.endTime - now - 1000 // Leave at least 1 second
      const actualReduction = Math.min(reductionMs, Math.max(0, maxReduction))
      newTimer.endTime = state.timer.endTime - actualReduction
    } else if (state.timer.isComplete) {
      // If completed, clear the completed state and set new duration
      newTimer = {
        ...newTimer,
        startTime: null,
        endTime: null,
        isRunning: false,
        pausedRemainingMs: undefined,
      }
    } else if (state.timer.pausedRemainingMs !== undefined) {
      // If paused, adjust the paused remaining time
      newTimer.pausedRemainingMs = Math.max(60 * 1000, state.timer.pausedRemainingMs - reductionMs)
    }
    
    newTimer.lastUpdated = now
    newTimer = calculateComputedState(newTimer, state.ui.currentTime)

    console.log(`➖ Redux: Removing ${minutes} minutes from timer`)
    
    return {
      ...state,
      timer: newTimer
    }
  },

  setDuration: (state: AppState, durationMs: number) => {
    const newTimer = calculateComputedState({
      ...state.timer,
      durationMs,
      lastUpdated: Date.now()
    }, state.ui.currentTime)

    return {
      ...state,
      timer: newTimer
    }
  },

  syncTimerState: (state: AppState, timerState: any) => {
    // Sync with incoming PubNub state, but preserve computed states
    // Convert null back to undefined for pausedRemainingMs (PubNub converts undefined to null)
    const newTimer = calculateComputedState({
      durationMs: timerState.durationMs,
      startTime: timerState.startTime,
      endTime: timerState.endTime,
      isRunning: timerState.isRunning,
      pausedRemainingMs: timerState.pausedRemainingMs === null ? undefined : timerState.pausedRemainingMs,
      lastUpdated: timerState.lastUpdated,
      isComplete: false, // Will be recalculated
      isPaused: false // Will be recalculated
    }, state.ui.currentTime)

    console.log('🔄 Redux: Syncing timer state from PubNub:', timerState)
    
    return {
      ...state,
      timer: newTimer
    }
  },

  setConnected: (state: AppState, isConnected: boolean) => ({
    ...state,
    ui: {
      ...state.ui,
      isConnected
    }
  }),

  updateCurrentTime: (state: AppState, currentTime: number) => {
    // Update current time and recalculate computed states
    let newTimer = { ...state.timer }
    let timerChanged = false
    
    // Check if running timer should auto-stop
    if (state.timer.isRunning && state.timer.endTime && currentTime >= state.timer.endTime) {
      console.log('⏰ Timer completed, auto-stopping')
      newTimer = {
        ...newTimer,
        isRunning: false,
        lastUpdated: currentTime
      }
      timerChanged = true
    }
    
    // Only recalculate computed state if timer actually changed
    if (timerChanged) {
      newTimer = calculateComputedState(newTimer, currentTime)
    } else {
      // Just update computed states without creating new timer object
      const computedTimer = calculateComputedState(newTimer, currentTime)
      // Only update if computed states actually changed
      if (computedTimer.isComplete !== newTimer.isComplete || computedTimer.isPaused !== newTimer.isPaused) {
        newTimer = computedTimer
        timerChanged = true
      }
    }
    
    return {
      ...state,
      ui: {
        ...state.ui,
        currentTime
      },
      timer: timerChanged ? newTimer : state.timer // Only update timer if it actually changed
    }
  },

  updateComputedState: (state: AppState) => {
    const newTimer = calculateComputedState(state.timer, state.ui.currentTime)
    
    return {
      ...state,
      timer: newTimer
    }
  }
})

export default actions
