import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  GRID_COLUMNS,
  RECORDING_CATALOG,
  gridCellForFrame,
  splitForRgbFrame,
  thermalFrameFor,
  type RecordingInfo,
  type RecordingOption,
} from '../data/mockData'

const TICK_MS = 140

interface MissionPlaybackValue {
  catalog: readonly RecordingOption[]
  recordingId: string
  recordingLabel: string
  recording: RecordingInfo
  rgbFrameId: number
  thermalFrameId: number
  gridCell: string
  split: ReturnType<typeof splitForRgbFrame>
  playing: boolean
  selectRecording: (id: string) => void
  setRgbFrameId: (frameId: number) => void
  play: () => void
  pause: () => void
  togglePlayback: () => void
}

const MissionPlaybackContext = createContext<MissionPlaybackValue | null>(null)

export function MissionPlaybackProvider({ children }: { children: ReactNode }) {
  const [recordingId, setRecordingId] = useState(RECORDING_CATALOG[0].id)
  const option =
    RECORDING_CATALOG.find((entry) => entry.id === recordingId) ?? RECORDING_CATALOG[0]
  const recording = option.recording
  const [rgbFrameId, setRgbFrameIdState] = useState(recording.rgb.firstFrameId)
  const [playing, setPlaying] = useState(false)

  const clampFrame = useCallback(
    (frameId: number) =>
      Math.min(recording.rgb.lastFrameId, Math.max(recording.rgb.firstFrameId, frameId)),
    [recording.rgb.firstFrameId, recording.rgb.lastFrameId],
  )

  const setRgbFrameId = useCallback(
    (frameId: number) => {
      setRgbFrameIdState(clampFrame(frameId))
    },
    [clampFrame],
  )

  useEffect(() => {
    setRgbFrameIdState(recording.rgb.firstFrameId)
    setPlaying(false)
  }, [recordingId, recording.rgb.firstFrameId])

  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => {
      setRgbFrameIdState((current) => {
        if (current >= recording.rgb.lastFrameId) {
          return recording.rgb.firstFrameId
        }
        return current + 1
      })
    }, TICK_MS)
    return () => window.clearInterval(timer)
  }, [playing, recording.rgb.firstFrameId, recording.rgb.lastFrameId])

  const value = useMemo<MissionPlaybackValue>(
    () => ({
      catalog: RECORDING_CATALOG,
      recordingId: option.id,
      recordingLabel: option.label,
      recording,
      rgbFrameId,
      thermalFrameId: thermalFrameFor(rgbFrameId, recording.frameOffset),
      gridCell: gridCellForFrame(rgbFrameId, GRID_COLUMNS),
      split: splitForRgbFrame(rgbFrameId),
      playing,
      selectRecording: setRecordingId,
      setRgbFrameId,
      play: () => setPlaying(true),
      pause: () => setPlaying(false),
      togglePlayback: () => setPlaying((on) => !on),
    }),
    [option.id, option.label, recording, rgbFrameId, playing, setRgbFrameId],
  )

  return (
    <MissionPlaybackContext.Provider value={value}>
      {children}
    </MissionPlaybackContext.Provider>
  )
}

export function useMissionPlayback() {
  const value = useContext(MissionPlaybackContext)
  if (!value) {
    throw new Error('useMissionPlayback must be used inside MissionPlaybackProvider')
  }
  return value
}
