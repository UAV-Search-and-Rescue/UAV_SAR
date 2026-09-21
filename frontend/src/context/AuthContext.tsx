import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { googleLogout } from '@react-oauth/google'

const SESSION_KEY = 'uav-sar.operator-session'

export interface OperatorSession {
  sub: string
  email: string
  name: string
  picture?: string
}

interface AuthValue {
  operator: OperatorSession | null
  signInWithGoogleCredential: (credential: string) => boolean
  signOut: () => void
}

const AuthContext = createContext<AuthValue | null>(null)

function decodeGoogleCredential(credential: string): OperatorSession | null {
  try {
    const segment = credential.split('.')[1]
    if (!segment) return null
    const normalized = segment.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    const payload = JSON.parse(window.atob(padded)) as {
      sub?: unknown
      email?: unknown
      name?: unknown
      picture?: unknown
    }
    if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') {
      return null
    }
    return {
      sub: payload.sub,
      email: payload.email,
      name: typeof payload.name === 'string' ? payload.name : payload.email,
      picture: typeof payload.picture === 'string' ? payload.picture : undefined,
    }
  } catch {
    return null
  }
}

function readStoredSession(): OperatorSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<OperatorSession>
    if (!parsed.sub || !parsed.email || !parsed.name) return null
    return {
      sub: parsed.sub,
      email: parsed.email,
      name: parsed.name,
      picture: parsed.picture,
    }
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [operator, setOperator] = useState<OperatorSession | null>(readStoredSession)

  const signInWithGoogleCredential = useCallback((credential: string) => {
    const session = decodeGoogleCredential(credential)
    if (!session) return false
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
    setOperator(session)
    return true
  }, [])

  const signOut = useCallback(() => {
    googleLogout()
    sessionStorage.removeItem(SESSION_KEY)
    setOperator(null)
  }, [])

  const value = useMemo<AuthValue>(
    () => ({ operator, signInWithGoogleCredential, signOut }),
    [operator, signInWithGoogleCredential, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return value
}
