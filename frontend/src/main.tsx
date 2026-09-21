import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { MissionPlaybackProvider } from './context/MissionPlaybackContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <MissionPlaybackProvider>
        <App />
      </MissionPlaybackProvider>
    </BrowserRouter>
  </StrictMode>,
)
