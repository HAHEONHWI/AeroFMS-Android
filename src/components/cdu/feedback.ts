import * as Haptics from 'expo-haptics'
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio'
import type { AudioPlayer } from 'expo-audio'

/** Original synthesized key sounds (assets/sounds) + light haptic tick. */
let soft: AudioPlayer | undefined
let classic: AudioPlayer | undefined

function player(kind: 'soft' | 'classic'): AudioPlayer | undefined {
  try {
    if (kind === 'soft') soft ??= createAudioPlayer(require('../../../assets/sounds/key-soft.wav'))
    else classic ??= createAudioPlayer(require('../../../assets/sounds/key-classic.wav'))
    return kind === 'soft' ? soft : classic
  } catch {
    return undefined
  }
}

void setAudioModeAsync({ playsInSilentMode: false }).catch(() => undefined)

export function keyFeedback(sound: 'off' | 'soft' | 'classic', haptic: boolean): void {
  if (haptic) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined)
  if (sound === 'off') return
  const p = player(sound)
  if (!p) return
  try {
    void p.seekTo(0)
    p.play()
  } catch {
    // audio optional
  }
}
