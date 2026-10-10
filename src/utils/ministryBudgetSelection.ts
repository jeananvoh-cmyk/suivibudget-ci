/** Select the card/detail amount from the same source without hiding unknowns.
 * A present institution store record supersedes the directory's static value,
 * including when its amount is null or exactly zero.
 * This function does NOT certify the amount against an official PDF.
 */
export function selectMinistryBudgetAmount(
  directoryAmount: number | null | undefined,
  storeRecordExists: boolean,
  storeAmount?: number | null,
): number | undefined {
  if (storeRecordExists) return storeAmount ?? undefined;
  return directoryAmount ?? undefined;
}
