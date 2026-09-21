import { useState } from 'react'
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import { Crosshair, ShieldAlert } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { TacticalField } from './ui/TacticalField'
import { GlassPanel } from './ui/GlassPanel'
import { HudHeading } from './ui/HudHeading'
import { StatusBadge } from './ui/StatusBadge'

export function LoginGate() {
  const { signInWithGoogleCredential } = useAuth()
  const [error, setError] = useState<string | null>(null)

  function handleSuccess(response: CredentialResponse) {
    if (!response.credential) {
      setError('Google did not return an identity token.')
      return
    }
    const accepted = signInWithGoogleCredential(response.credential)
    if (!accepted) {
      setError('Identity token could not be decoded. Access remains locked.')
    }
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center bg-tactical px-4 text-slate-200">
      <TacticalField />

      <GlassPanel className="relative z-10 w-full max-w-md p-8" lift={false}>
        <p className="flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300 drop-shadow-[0_0_8px_rgba(56,189,248,0.6)]">
          <Crosshair className="h-3.5 w-3.5" />
          UAV SAR
        </p>

        <div className="mt-5 flex items-center justify-center gap-2 rounded-md border border-orange-500/40 bg-orange-500/10 px-3 py-2 text-center shadow-[0_0_18px_rgba(249,115,22,0.18)]">
          <ShieldAlert className="h-4 w-4 shrink-0 text-orange-400" />
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-300">
            Restricted access — Level 4 clearance
          </p>
        </div>

        <HudHeading className="mt-6 justify-center">Operator authentication</HudHeading>
        <p className="mt-2 text-center text-sm text-slate-400">
          Authenticate with a Google identity to unlock the tactical command
          shell. Replay data stays local to this session.
        </p>

        <div className="mt-6 flex flex-col items-center gap-3">
          <StatusBadge tone="cyan">Google sign-in required</StatusBadge>
          <div className="rounded-md border border-cyan-400/40 bg-slate-950/70 p-3 shadow-[0_0_22px_rgba(56,189,248,0.16)]">
            <GoogleLogin
              theme="filled_black"
              size="large"
              shape="rectangular"
              text="signin_with"
              logo_alignment="left"
              width={280}
              ux_mode="popup"
              onSuccess={handleSuccess}
              onError={() =>
                setError('Google sign-in failed or was cancelled.')
              }
            />
          </div>
        </div>

        {error ? (
          <p className="mt-4 text-center font-mono text-xs text-orange-300">
            {error}
          </p>
        ) : (
          <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-wide text-slate-500">
            Session stored in this browser tab only
          </p>
        )}
      </GlassPanel>
    </div>
  )
}
