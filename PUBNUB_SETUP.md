# PubNub Setup Instructions

The Kid Timer app uses PubNub for real-time synchronization across multiple users. It's configured to use environment variables for secure key management.

## Getting PubNub Keys

1. **Sign up for PubNub**: Go to [https://www.pubnub.com/](https://www.pubnub.com/) and create a free account
2. **Create a new app**: In your PubNub dashboard, create a new app
3. **Get your keys**: Copy the Publish Key and Subscribe Key from your app's key set

## Environment Setup

1. **Copy the example file**:
   ```bash
   cp .env.example .env
   ```

2. **Update your .env file** with your actual PubNub keys:
   ```bash
   VITE_PUBNUB_PUBLISH_KEY=your_actual_publish_key
   VITE_PUBNUB_SUBSCRIBE_KEY=your_actual_subscribe_key
   VITE_PUBNUB_USER_ID=optional_custom_user_id
   VITE_PUBNUB_CHANNEL=kid-timer-sync
   ```

3. **Restart your development server** after updating the .env file:
   ```bash
   yarn dev
   ```

## Demo Keys

The app currently uses PubNub's demo keys (`demo`) which work for testing but have limitations:
- Limited to 100 messages per day
- Shared across all demo users
- Not suitable for production

## Features

With PubNub integration, the timer now supports:
- ✅ **Real-time synchronization** across all connected users
- ✅ **State persistence** - timer state is saved and restored
- ✅ **Conflict resolution** - uses timestamps to handle simultaneous updates
- ✅ **Connection status** - shows when users are connected/disconnected
- ✅ **Optimized publishing** - only publishes when state actually changes

## Testing Multi-User Sync

1. Open the app in multiple browser tabs/windows
2. Start the timer in one tab - watch it sync to all others
3. Adjust time in any tab - see changes reflected everywhere
4. The sync indicator shows connection status

## Channel

The app uses the channel `kid-timer-sync` for all timer state synchronization.
