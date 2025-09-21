# Redux Zero Integration

This document describes the Redux Zero state management implementation in the Kid Timer project.

## Overview

The project has been successfully integrated with [Redux Zero](https://github.com/redux-zero/redux-zero), a lightweight state container based on Redux. This integration centralizes all timer state management and provides better predictability and debugging capabilities.

## Architecture

### Store Structure (`src/store/index.ts`)
```typescript
interface AppState {
  timer: {
    durationMs: number
    startTime: number | null
    endTime: number | null
    isRunning: boolean
    pausedRemainingMs?: number
    lastUpdated: number
    isComplete: boolean // Computed state
    isPaused: boolean   // Computed state
  }
  ui: {
    isConnected: boolean
    currentTime: number
  }
}
```

### Actions (`src/store/actions.ts`)
- `startTimer()` - Starts or resumes the timer
- `pauseTimer()` - Pauses the timer and stores remaining time
- `resetTimer(initialMinutes?)` - Resets timer to initial or specified duration
- `addTime(minutes)` - Adds time to the timer
- `removeTime(minutes)` - Removes time from the timer (minimum 1 minute)
- `syncTimerState(timerState)` - Syncs state from PubNub
- `setConnected(isConnected)` - Updates connection status
- `updateCurrentTime(currentTime)` - Updates current time for calculations

### PubNub Integration (`src/store/pubnub-integration.tsx`)
The PubNub integration component:
- Connects to PubNub for real-time synchronization
- Publishes state changes to all connected devices
- Receives and syncs incoming state changes
- Manages connection status
- Updates current time every second for real-time calculations

## Components

### Timer Component (`src/timer-redux.tsx`)
- Connected to Redux Zero store via `connect()`
- Uses Redux actions for all timer operations
- Maintains all original functionality (wake lock, favicon updates, etc.)
- Calculates derived values from centralized state

### App Component (`src/app-redux.tsx`)
- Connected to Redux Zero store for UI state
- Displays connection status from centralized state
- Handles theme switching and background gradients

## Key Benefits

1. **Centralized State**: All timer state is managed in one place
2. **Predictable Updates**: State changes only happen through actions
3. **Better Debugging**: Redux DevTools integration for state inspection
4. **Real-time Sync**: Seamless PubNub integration with state management
5. **Type Safety**: Full TypeScript support with typed actions and state

## Migration Notes

- Original components are preserved as backups (`timer.tsx.backup`)
- New Redux-integrated components use `-redux` suffix
- All original functionality is maintained
- PubNub synchronization continues to work as before

## Development

The Redux DevTools extension will automatically connect if available, allowing you to:
- Inspect current state
- View action dispatches
- Time-travel debug state changes

## Usage

The integration is transparent to end users. All timer functionality works exactly as before, but now with centralized state management and better debugging capabilities.
