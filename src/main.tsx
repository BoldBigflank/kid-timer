import { render } from 'preact'
import CssBaseline from '@mui/material/CssBaseline'
import { AppThemeProvider } from './theme-context'
import { App } from './app.tsx'

render(
  <AppThemeProvider>
    <CssBaseline />
    <App />
  </AppThemeProvider>, 
  document.getElementById('app')!
)
