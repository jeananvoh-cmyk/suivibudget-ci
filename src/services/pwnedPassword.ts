/**
 * Vérifie un nouveau mot de passe contre Pwned Passwords (Have I Been Pwned).
 *
 * Le calcul SHA-1 reste dans le navigateur. Seuls les 5 premiers caractères
 * du hash sont transmis à HIBP (k-anonymity) ; le mot de passe et son hash
 * complet ne quittent jamais le navigateur.
 *
 * En cas d'indisponibilité du service, l'opération échoue de manière fermée :
 * aucun nouveau mot de passe n'est accepté sans contrôle.
 */
export async function assertPasswordNotPwned(password: string): Promise<void> {
  if (!password) throw new Error('Saisissez un mot de passe.');

  if (!globalThis.crypto?.subtle || typeof TextEncoder === 'undefined') {
    throw new Error('Le contrôle de sécurité des mots de passe est indisponible sur cet appareil.');
  }

  const bytes = new TextEncoder().encode(password);
  const digest = await globalThis.crypto.subtle.digest('SHA-1', bytes);
  const hash = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  let response: Response;
  try {
    response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      method: 'GET',
      headers: { 'Add-Padding': 'true' },
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
  } catch {
    throw new Error('Impossible de vérifier ce mot de passe. Réessayez lorsque le service de contrôle sera disponible.');
  }

  if (!response.ok) {
    throw new Error('Le service de contrôle des mots de passe est indisponible. Aucun changement n’a été effectué.');
  }

  const entries = (await response.text()).split(/\r?\n/);
  const match = entries.find(line => {
    const [candidate, count] = line.trim().split(':');
    return candidate?.toUpperCase() === suffix && Number(count) > 0;
  });

  if (match) {
    const count = Number(match.trim().split(':')[1]);
    throw new Error(`Ce mot de passe figure dans des fuites connues (${count.toLocaleString('fr-FR')} occurrences). Choisissez-en un autre.`);
  }
}
