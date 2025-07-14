// Sound utility for playing notification sounds
type SoundType = 'notification' | 'success' | 'error';

const sounds: Record<SoundType, string> = {
  notification: 'https://assets.mixkit.co/sfx/preview/mixkit-software-interface-remove-notification-2578.mp3',
  success: 'https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3',
  error: 'https://assets.mixkit.co/sfx/preview/mixkit-wrong-answer-fail-notification-946.mp3'
};

const audioElements: Record<string, HTMLAudioElement> = {};

export const playSound = (type: SoundType = 'notification') => {
  try {
    // Reuse audio element if it exists
    if (!audioElements[type]) {
      audioElements[type] = new Audio(sounds[type]);
      audioElements[type].volume = 0.5; // Set volume to 50%
    }
    
    // Reset and play
    const audio = audioElements[type];
    audio.currentTime = 0;
    audio.play().catch(error => {
      console.warn('Failed to play sound:', error);
    });
  } catch (error) {
    console.error('Error playing sound:', error);
  }
};

// Preload sounds when the app starts
if (typeof window !== 'undefined') {
  Object.values(sounds).forEach(soundUrl => {
    const audio = new Audio(soundUrl);
    audio.volume = 0; // Mute preload
    audio.load();
  });
}
