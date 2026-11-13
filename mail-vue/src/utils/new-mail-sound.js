let context
let playingUntil = 0
let resuming

export function prepareNewMailSound() {
  try {
    const Audio = window.AudioContext || window.webkitAudioContext
    if (!Audio) return
    context ??= new Audio()
    if (context.state !== 'running') {
      resuming ??= context.resume().catch(() => {}).finally(() => { resuming = undefined })
      return resuming
    }
  } catch {
    // Browser audio may be unavailable or restricted.
  }
}

export async function playNewMailSound(shouldPlay = () => true) {
  if (resuming) await resuming
  if (!shouldPlay()) return
  if (context?.state !== 'running' || context.currentTime < playingUntil) return
  const start = context.currentTime
  playingUntil = start + 0.32
  for (const [frequency, offset] of [[660, 0], [880, 0.09]]) {
    const at = start + offset
    const tone = context.createOscillator()
    const volume = context.createGain()
    tone.frequency.value = frequency
    volume.gain.setValueAtTime(0, at)
    volume.gain.linearRampToValueAtTime(0.08, at + 0.025)
    volume.gain.exponentialRampToValueAtTime(0.001, at + 0.22)
    tone.connect(volume)
    volume.connect(context.destination)
    tone.onended = () => { tone.disconnect(); volume.disconnect() }
    tone.start(at)
    tone.stop(at + 0.23)
  }
}

export async function previewNewMailSound() {
  await prepareNewMailSound()
  await playNewMailSound()
}
