import type { Adapter, AdapterPayload } from "oidc-provider";

interface StoredOidcModel {
  payload: AdapterPayload;
  expiresAt: number;
}

const stores = new Map<string, Map<string, StoredOidcModel>>();

/** Stores only short-lived bridge interactions in one bounded game-server process. */
export class TransientOidcAdapter implements Adapter {
  private readonly store: Map<string, StoredOidcModel>;

  /** Selects the bounded per-model store required by oidc-provider's adapter contract. */
  constructor(modelName: string) {
    this.store = stores.get(modelName) ?? new Map();
    stores.set(modelName, this.store);
  }

  /** Inserts or replaces one OIDC model with its provider-supplied TTL. */
  async upsert(id: string, payload: AdapterPayload, expiresIn = 300): Promise<void> {
    this.purgeExpired();
    this.store.set(id, {
      payload: structuredClone(payload),
      expiresAt: Date.now() + Math.max(1, expiresIn) * 1_000,
    });
  }

  /** Finds one unexpired OIDC model by its primary identifier. */
  async find(id: string): Promise<AdapterPayload | undefined> {
    this.purgeExpired();
    const stored = this.store.get(id);
    return stored ? structuredClone(stored.payload) : undefined;
  }

  /** Finds one device-flow model by user code; the bridge does not enable this flow. */
  async findByUserCode(userCode: string): Promise<AdapterPayload | undefined> {
    return this.findByField("userCode", userCode);
  }

  /** Finds one interaction or session model by its stable UID. */
  async findByUid(uid: string): Promise<AdapterPayload | undefined> {
    return this.findByField("uid", uid);
  }

  /** Marks a one-time model consumed so oidc-provider can reject replay. */
  async consume(id: string): Promise<void> {
    this.purgeExpired();
    const stored = this.store.get(id);
    if (!stored) return;
    stored.payload.consumed = Math.floor(Date.now() / 1_000);
  }

  /** Removes one OIDC model by its primary identifier. */
  async destroy(id: string): Promise<void> {
    this.store.delete(id);
  }

  /** Removes all transient models associated with one grant. */
  async revokeByGrantId(grantId: string): Promise<void> {
    this.purgeExpired();
    for (const [id, stored] of this.store) {
      if (stored.payload.grantId === grantId) this.store.delete(id);
    }
  }

  /** Scans the bounded model store for one exact secondary identifier. */
  private async findByField(
    field: "uid" | "userCode",
    value: string,
  ): Promise<AdapterPayload | undefined> {
    this.purgeExpired();
    for (const stored of this.store.values()) {
      if (stored.payload[field] === value) return structuredClone(stored.payload);
    }
    return undefined;
  }

  /** Purges expired interactions before every access so transient state cannot grow without bound. */
  private purgeExpired(): void {
    const now = Date.now();
    for (const [id, stored] of this.store) {
      if (stored.expiresAt <= now) this.store.delete(id);
    }
  }
}

/** Creates the per-model adapter instance required by oidc-provider. */
export function createTransientOidcAdapter(modelName: string): Adapter {
  return new TransientOidcAdapter(modelName);
}
