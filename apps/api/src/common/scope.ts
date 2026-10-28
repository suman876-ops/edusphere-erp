/**
 * Campus filter helper. Campus-owned data must never be queried without a
 * scope, so a null scope is a bug rather than "show everything".
 */
export function campusWhere(campusId: string | null): { campusId: string } {
  if (!campusId) {
    throw new Error('Campus scope missing: pass X-Campus-Id for group-level users');
  }
  return { campusId };
}

export function optionalCampusWhere(campusId: string | null): { campusId?: string } {
  return campusId ? { campusId } : {};
}

export function paiseToRupees(paise: number): number {
  return Math.round(paise) / 100;
}
