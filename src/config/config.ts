// PubNub configuration from environment variables
export const PUBNUB_CONFIG = {
  publishKey: import.meta.env.VITE_PUBNUB_PUBLISH_KEY || 'demo',
  subscribeKey: import.meta.env.VITE_PUBNUB_SUBSCRIBE_KEY || 'demo',
  userId: import.meta.env.VITE_PUBNUB_USER_ID || `user-${Math.random().toString(36).substr(2, 9)}`,
}

// Log the configuration being used (without exposing actual keys)
console.log('🔧 PubNub Config:', {
  publishKey: PUBNUB_CONFIG.publishKey === 'demo' ? 'demo' : 'custom',
  subscribeKey: PUBNUB_CONFIG.subscribeKey === 'demo' ? 'demo' : 'custom',
  userId: PUBNUB_CONFIG.userId,
})

// Validation function to check if required environment variables are set
export const validatePubNubConfig = () => {
  const requiredVars = [
    'VITE_PUBNUB_PUBLISH_KEY',
    'VITE_PUBNUB_SUBSCRIBE_KEY'
  ]

  const missing = requiredVars.filter(varName => !import.meta.env[varName])
  
  if (missing.length > 0) {
    console.warn('⚠️  Missing PubNub environment variables:', missing.join(', '))
    console.warn('⚠️  Using demo keys. For production, set these in your .env file.')
    console.warn('⚠️  Demo keys have limited functionality and are shared across all demo users.')
  }

  return {
    isValid: missing.length === 0,
    missing,
    usingDemo: missing.length > 0
  }
}

// Channel configuration
export const TIMER_CHANNEL = import.meta.env.VITE_PUBNUB_CHANNEL || 'kid-timer-sync'
