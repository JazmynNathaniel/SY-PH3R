export type DraftRecord = {
  id: string;
  roomId: string;
  body: string;
  disappearingWindow: "off" | "8h" | "24h";
  updatedAt: string;
};

export type DraftVaultState = {
  version: 1;
  drafts: DraftRecord[];
};

export const EMPTY_DRAFT_VAULT: DraftVaultState = {
  version: 1,
  drafts: []
};

export function upsertDraft(
  state: DraftVaultState,
  nextDraft: Omit<DraftRecord, "updatedAt"> & { updatedAt?: string }
) {
  const draft: DraftRecord = {
    ...nextDraft,
    updatedAt: nextDraft.updatedAt ?? new Date().toISOString()
  };

  const drafts = state.drafts.filter((item) => item.id !== draft.id);
  drafts.unshift(draft);

  return {
    ...state,
    drafts
  };
}

