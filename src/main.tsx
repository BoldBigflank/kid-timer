import { render } from 'preact'
import CssBaseline from '@mui/material/CssBaseline'
import { Provider } from 'redux-zero/preact'
import { AppThemeProvider } from './theme-context'
import { App } from './app.tsx'
import store from './store'
import { PubNubIntegrationProvider } from './store/pubnub-integration'

render(
  <Provider store={store}>
    <PubNubIntegrationProvider>
      <AppThemeProvider>
        <CssBaseline />
        <App />
      </AppThemeProvider>
    </PubNubIntegrationProvider>
  </Provider>, 
  document.getElementById('app')!
)
