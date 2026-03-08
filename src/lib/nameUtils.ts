// Shared name normalization and matching utilities for LP assignments
// Used by LPStep2Teachers, LPComparisonCard, and pattern detection

/**
 * Normalize a name: strip diacritics, lowercase, trim.
 */
export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[-–]/g, ' ')  // treat hyphens as spaces for matching
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenize a name into sorted tokens for order-independent matching.
 */
function tokenize(name: string): string[] {
  return normalizeName(name).split(/\s+/).filter(Boolean).sort();
}

/**
 * Generate name variants for flexible matching:
 * "Müller Anna" → ["muller anna", "anna muller"]
 */
export function nameVariants(name: string): string[] {
  const norm = normalizeName(name);
  const parts = norm.split(/\s+/);
  if (parts.length >= 2) {
    const reversed = `${parts[parts.length - 1]} ${parts.slice(0, -1).join(' ')}`;
    return [norm, reversed];
  }
  return [norm];
}

/**
 * Check if two names match using multiple strategies:
 * 1. Direct normalized match
 * 2. Reversed name order ("Müller Anna" ↔ "Anna Müller")
 * 3. Token-based (order-independent, handles compound names like "Müller-Huber Anna")
 * 4. Partial token match (at least 2 tokens in common for names with 2+ parts)
 */
export function namesMatch(a: string, b: string): boolean {
  const aNorm = normalizeName(a);
  const bNorm = normalizeName(b);

  // Direct match
  if (aNorm === bNorm) return true;

  // Reversed match
  const aVars = nameVariants(a);
  const bVars = nameVariants(b);
  if (aVars.some(av => bVars.some(bv => av === bv))) return true;

  // Token-based exact match (order-independent)
  const aTokens = tokenize(a);
  const bTokens = tokenize(b);
  if (aTokens.length === bTokens.length && aTokens.every((t, i) => t === bTokens[i])) return true;

  // Partial token match: if both have 2+ tokens and share at least 2
  if (aTokens.length >= 2 && bTokens.length >= 2) {
    const commonTokens = aTokens.filter(t => bTokens.includes(t));
    if (commonTokens.length >= 2) return true;
  }

  return false;
}

/**
 * Simple Levenshtein distance for fuzzy matching.
 */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  // Use single-row optimization
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array(n + 1);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,      // deletion
        curr[j - 1] + 1,  // insertion
        prev[j - 1] + cost // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n];
}

/**
 * Fuzzy name match: returns true if Levenshtein distance is within threshold.
 * Threshold: max 2 edits for names > 6 chars, max 1 for shorter.
 */
export function fuzzyNameMatch(a: string, b: string): boolean {
  const aNorm = normalizeName(a);
  const bNorm = normalizeName(b);

  if (aNorm === bNorm) return true;

  const maxLen = Math.max(aNorm.length, bNorm.length);
  const threshold = maxLen > 6 ? 2 : 1;

  return levenshtein(aNorm, bNorm) <= threshold;
}

/**
 * Build a lookup map from persons for O(1) name matching.
 * Indexes by "nachname vorname" and "vorname nachname" (both normalized).
 */
export function buildPersonLookup<T extends { nachname: string; vorname: string }>(
  persons: T[]
): Map<string, T> {
  const map = new Map<string, T>();
  for (const p of persons) {
    const key1 = normalizeName(`${p.nachname} ${p.vorname}`);
    map.set(key1, p);
    const key2 = normalizeName(`${p.vorname} ${p.nachname}`);
    if (!map.has(key2)) map.set(key2, p);

    // Also index token-sorted key for compound names
    const tokenKey = tokenize(`${p.nachname} ${p.vorname}`).join(' ');
    if (!map.has(tokenKey)) map.set(tokenKey, p);
  }
  return map;
}

/**
 * Match a teacher name against the lookup map.
 * Tries: direct, reversed, token-sorted, then fuzzy Levenshtein.
 */
export function findPersonByName<T extends { nachname: string; vorname: string }>(
  name: string,
  lookupMap: Map<string, T>,
  allPersons: T[]
): T | null {
  const normalized = normalizeName(name);

  // Direct lookup
  const direct = lookupMap.get(normalized);
  if (direct) return direct;

  // Reversed
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    const reversed = normalizeName(`${parts[parts.length - 1]} ${parts.slice(0, -1).join(' ')}`);
    const rev = lookupMap.get(reversed);
    if (rev) return rev;
  }

  // Token-sorted
  const tokenKey = tokenize(name).join(' ');
  const tokenMatch = lookupMap.get(tokenKey);
  if (tokenMatch) return tokenMatch;

  // Fuzzy: check all persons with Levenshtein
  for (const p of allPersons) {
    const fullName = `${p.nachname} ${p.vorname}`;
    if (fuzzyNameMatch(name, fullName) || fuzzyNameMatch(name, `${p.vorname} ${p.nachname}`)) {
      return p;
    }
  }

  return null;
}

/**
 * Match a LO class name to a PUPIL class name using multiple strategies:
 * 1. Case-insensitive prefix match (PUPIL starts with LO)
 * 2. Bidirectional prefix (LO starts with PUPIL) 
 * 3. Whitespace-normalized substring
 * 4. Fuzzy Levenshtein on core class identifier
 */
export function matchClassName(loKlasse: string, pupilClasses: { klassenname: string }[]): string | null {
  const loNorm = loKlasse.trim().toLowerCase();
  const loCompact = loNorm.replace(/\s+/g, '');

  // Strategy 1: PUPIL class starts with LO class name (exact prefix)
  for (const pc of pupilClasses) {
    const pupilNorm = pc.klassenname.trim().toLowerCase();
    if (pupilNorm.startsWith(loNorm)) {
      return pc.klassenname;
    }
  }

  // Strategy 2: Whitespace-insensitive prefix match
  for (const pc of pupilClasses) {
    const pupilCompact = pc.klassenname.trim().toLowerCase().replace(/\s+/g, '');
    if (pupilCompact.startsWith(loCompact)) {
      return pc.klassenname;
    }
  }

  // Strategy 3: LO name starts with PUPIL (reverse prefix, e.g. PUPIL has shorter name)
  for (const pc of pupilClasses) {
    const pupilNorm = pc.klassenname.trim().toLowerCase();
    if (loNorm.startsWith(pupilNorm) && pupilNorm.length >= 3) {
      return pc.klassenname;
    }
  }

  // Strategy 4: Substring match (LO name contained in PUPIL name)
  if (loCompact.length >= 3) {
    for (const pc of pupilClasses) {
      const pupilCompact = pc.klassenname.trim().toLowerCase().replace(/\s+/g, '');
      if (pupilCompact.includes(loCompact)) {
        return pc.klassenname;
      }
    }
  }

  // Strategy 5: Levenshtein on compact forms (max distance 2)
  let bestMatch: string | null = null;
  let bestDist = Infinity;
  for (const pc of pupilClasses) {
    const pupilCompact = pc.klassenname.trim().toLowerCase().replace(/\s+/g, '');
    // Only compare if lengths are similar (within 30% + small suffix tolerance)
    const lenDiff = Math.abs(pupilCompact.length - loCompact.length);
    if (lenDiff > Math.max(loCompact.length * 0.5, 10)) continue;

    // Compare the first N chars (core identifier, ignoring long PUPIL suffixes)
    const compareLen = Math.min(loCompact.length, pupilCompact.length);
    const loSub = loCompact.slice(0, compareLen);
    const pupilSub = pupilCompact.slice(0, compareLen);
    const dist = levenshtein(loSub, pupilSub);

    if (dist <= 2 && dist < bestDist) {
      bestDist = dist;
      bestMatch = pc.klassenname;
    }
  }

  return bestMatch;
}
