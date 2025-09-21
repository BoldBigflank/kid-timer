# Kid Timer

A real-time synchronized timer application built with Preact, Material-UI, and PubNub. Perfect for coordinating activities across multiple devices and users.

## Features

- ⏱️ **Customizable Timer** - Set any duration in minutes
- 🔄 **Real-time Sync** - Timer state synchronized across all connected devices
- ⏸️ **Pause/Resume** - Full control over timer execution
- ➕➖ **Time Adjustment** - Add or remove time while running
- 🔒 **Wake Lock** - Prevents screen from sleeping during timer
- 🎨 **Dynamic Theming** - Beautiful gradient backgrounds that change over time
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile
- 🔔 **Visual Feedback** - Dynamic favicon shows timer progress

## Tech Stack

- **Frontend**: Preact with TypeScript
- **UI Components**: Material-UI (MUI)
- **State Management**: Redux Zero
- **Real-time Sync**: PubNub
- **Build Tool**: Vite
- **Styling**: Emotion + Material-UI theming

## Getting Started

1. **Install dependencies**:
   ```bash
   yarn install
   ```

2. **Set up PubNub** (for real-time sync):
   - See [PubNub Setup Instructions](PUBNUB_SETUP.md) for detailed configuration

3. **Start development server**:
   ```bash
   yarn dev
   ```

4. **Build for production**:
   ```bash
   yarn build
   ```

## Documentation

- [📡 PubNub Setup Instructions](PUBNUB_SETUP.md) - How to configure real-time synchronization
- [🔧 Redux Zero Integration](REDUX_ZERO_INTEGRATION.md) - State management architecture and implementation details

## Project Structure

```
src/
├── app.tsx              # Main app component with theming
├── timer.tsx            # Core timer component
├── main.tsx             # App entry point
├── store/               # Redux Zero state management
│   ├── index.ts         # Store configuration and state types
│   ├── actions.ts       # Timer and UI actions
│   └── pubnub-integration.tsx # Real-time sync component
├── theme.tsx            # Material-UI theme configuration
├── theme-context.tsx    # Theme context provider
├── pubnub-context.tsx   # PubNub client context
├── use-wake-lock.tsx    # Wake lock hook
└── use-dynamic-favicon.tsx # Dynamic favicon hook
```

## Usage

1. **Set Timer Duration**: Use the input field to set desired minutes
2. **Start Timer**: Click the play button to begin countdown
3. **Pause/Resume**: Toggle timer execution with the pause/play button
4. **Reset**: Return timer to original duration
5. **Adjust Time**: Use +/- buttons to add or remove time while running
6. **Multi-Device Sync**: Open the app on multiple devices to see real-time synchronization

## Development

The app uses Redux Zero for predictable state management and PubNub for real-time synchronization. All timer state is centralized and automatically synced across connected devices.

For debugging, Redux DevTools extension is supported and will automatically connect when available.

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

### GPL-3.0 License Summary

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
