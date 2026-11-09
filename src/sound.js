// Petits signaux sonores, sans fichier audio.
// Un contexte audio non fermé reste ouvert : au fil du service, le navigateur finit par les refuser.
function playTones(frequencies, { volume = 0.2, duration = 0.4, gap = 0.18 } = {}) {
  try {
    const ctx = new AudioContext();
    frequencies.forEach((frequency, i) => {
      const start = ctx.currentTime + i * gap;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(volume, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      osc.connect(gain).connect(ctx.destination);
      if (i === frequencies.length - 1) osc.onended = () => ctx.close();
      osc.start(start);
      osc.stop(start + duration);
    });
  } catch {}
}

// Nouvelle commande au comptoir.
export const beep = () => playTones([880]);

// Commande prête (écran de salle, téléphone du client) : deux notes montantes, plus douces.
export const chime = () => playTones([660, 990], { volume: 0.15, duration: 0.5 });
