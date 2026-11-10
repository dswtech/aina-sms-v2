// Pure helpers for the transaction detail modal. No `@/` imports: node --test runs this file directly.

const RIGHT_MIN = 160;
const LEFT_MIN = 300;

export const clampPanelWidth = (requested: number, container: number) =>
    Math.max(RIGHT_MIN, Math.min(container - LEFT_MIN, requested));

export const daysInStageLabel = (days: number | null) =>
    days === null
        ? null
        : days === 0
          ? 'Baru pindah tahap hari ini'
          : `${days} hari di tahap ini`;

/** `page` is newest first; the result reads oldest to newest and never repeats a key. */
export function mergeEarlier<T extends { key: string }>(
    shown: T[],
    page: T[],
): T[] {
    const known = new Set(shown.map((event) => event.key));

    return [...[...page].reverse().filter((e) => !known.has(e.key)), ...shown];
}

/** `null` while the choice is incomplete: nothing may be sent yet. */
export function areaPatch(chosen: string[]) {
    const [region, second] = chosen;
    if (!region) return { area: null };
    if (region === 'other')
        return second?.trim()
            ? {
                  area: {
                      region_code: 'other',
                      district_code: null,
                      other_city: second.trim(),
                  },
              }
            : null;

    return second
        ? {
              area: {
                  region_code: region,
                  district_code: second,
                  other_city: null,
              },
          }
        : null;
}

/** Credit needs every step: leasing (and its name for Kredit Lain), then tenor, then insurance. */
export function financingPatch(chosen: string[]) {
    const [type, leasing, ...rest] = chosen;
    if (!type) return { financing: null };
    if (type === 'cash')
        return {
            financing: {
                type: 'cash',
                leasing_id: null,
                other_name: null,
                tenor_months: null,
                insurance_type: null,
            },
        };
    if (!leasing) return null;
    const other = leasing === 'other';
    const [name, tenor, insurance] = other ? rest : [null, ...rest];
    if ((other && !name?.trim()) || !tenor || !insurance) return null;

    return {
        financing: {
            type: 'credit',
            leasing_id: leasing,
            other_name: other ? name!.trim() : null,
            tenor_months: Number(tenor),
            insurance_type: insurance,
        },
    };
}

/** Tells the reader when the stage list holds fewer moves than the transaction has. */
export const stageCutoffLabel = (shown: number, total: number) =>
    total > shown
        ? `Menampilkan ${shown} perpindahan terbaru dari ${total}.`
        : null;

/** Remount key for the comment form: edit and reply on the same comment must not share state. */
export const composerKey = (
    editing: { id: number } | null,
    replyTo: { id: number } | null,
) => (editing ? `edit-${editing.id}` : replyTo ? `reply-${replyTo.id}` : 'new');

/** Pages are newest first and may overlap when a comment arrived in between; result is oldest to newest. */
export function combinePages<T extends { key: string }>(pages: T[][]): T[] {
    const seen = new Set<string>();

    return pages
        .flat()
        .filter((event) => !seen.has(event.key) && seen.add(event.key))
        .reverse();
}
