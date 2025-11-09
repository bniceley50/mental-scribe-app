/**
 * Local encrypted storage (STUB)
 * 
 * This is a stub implementation. After exporting the project, install:
 *   npm install dexie@4.0.11
 * 
 * Then uncomment the real implementation below.
 */

import { encrypt, decrypt, type EncryptedData } from "../crypto/vault";

export interface LocalSession {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  title: string;
  clientId?: string;
  programId?: string;
  vaultSalt: number[];
}

export interface LocalArtifact {
  id: string;
  sessionId: string;
  kind: "transcript" | "soap" | "entities" | "risk" | "recording";
  createdAt: Date;
  enc_iv: number[];
  enc_ct: number[];
}

export interface LocalAuditLog {
  id: string;
  sessionId: string;
  timestamp: Date;
  action: string;
  resourceType: string;
  metadata?: Record<string, unknown>;
}

// Stub implementation using memory (for build purposes)
class LocalDatabaseStub {
  private sessions: Map<string, LocalSession> = new Map();
  private artifacts: Map<string, LocalArtifact> = new Map();
  private auditLogs: Map<string, LocalAuditLog> = new Map();

  async getSessions(limit = 50): Promise<LocalSession[]> {
    return Array.from(this.sessions.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async addSession(session: LocalSession): Promise<void> {
    this.sessions.set(session.id, session);
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
    // Delete related artifacts and logs
    for (const [id, artifact] of this.artifacts.entries()) {
      if (artifact.sessionId === sessionId) {
        this.artifacts.delete(id);
      }
    }
    for (const [id, log] of this.auditLogs.entries()) {
      if (log.sessionId === sessionId) {
        this.auditLogs.delete(id);
      }
    }
  }

  async addArtifact(artifact: LocalArtifact): Promise<void> {
    this.artifacts.set(artifact.id, artifact);
  }

  async getArtifact(id: string): Promise<LocalArtifact | undefined> {
    return this.artifacts.get(id);
  }

  async getArtifactsBySession(sessionId: string): Promise<LocalArtifact[]> {
    return Array.from(this.artifacts.values()).filter(
      (a) => a.sessionId === sessionId
    );
  }

  async addAuditLog(log: LocalAuditLog): Promise<void> {
    this.auditLogs.set(log.id, log);
  }
}

export const localDb = new LocalDatabaseStub();

/**
 * Storage adapter with encryption
 */
export class LocalStorageAdapter {
  constructor(private dek: CryptoKey) {}

  async saveArtifact(
    sessionId: string,
    kind: LocalArtifact["kind"],
    data: unknown
  ): Promise<string> {
    const encrypted = await encrypt(this.dek, data);

    const artifact: LocalArtifact = {
      id: crypto.randomUUID(),
      sessionId,
      kind,
      createdAt: new Date(),
      enc_iv: encrypted.iv,
      enc_ct: encrypted.ct,
    };

    await localDb.addArtifact(artifact);

    await localDb.addAuditLog({
      id: crypto.randomUUID(),
      sessionId,
      timestamp: new Date(),
      action: "artifact_created",
      resourceType: kind,
      metadata: { artifactId: artifact.id },
    });

    return artifact.id;
  }

  async getArtifact<T = unknown>(artifactId: string): Promise<T | null> {
    const artifact = await localDb.getArtifact(artifactId);
    if (!artifact) return null;

    return decrypt<T>(this.dek, {
      iv: artifact.enc_iv,
      ct: artifact.enc_ct,
    });
  }

  async getSessionArtifacts(
    sessionId: string,
    kind?: LocalArtifact["kind"]
  ): Promise<Array<{ id: string; kind: string; data: unknown }>> {
    let artifacts = await localDb.getArtifactsBySession(sessionId);

    if (kind) {
      artifacts = artifacts.filter((a) => a.kind === kind);
    }

    const decrypted = await Promise.all(
      artifacts.map(async (artifact) => ({
        id: artifact.id,
        kind: artifact.kind,
        data: await decrypt(this.dek, {
          iv: artifact.enc_iv,
          ct: artifact.enc_ct,
        }),
      }))
    );

    return decrypted;
  }

  async createSession(
    title: string,
    vaultSalt: Uint8Array,
    metadata?: { clientId?: string; programId?: string }
  ): Promise<string> {
    const session: LocalSession = {
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      title,
      clientId: metadata?.clientId,
      programId: metadata?.programId,
      vaultSalt: Array.from(vaultSalt),
    };

    await localDb.addSession(session);

    await localDb.addAuditLog({
      id: crypto.randomUUID(),
      sessionId: session.id,
      timestamp: new Date(),
      action: "session_created",
      resourceType: "session",
      metadata: { title },
    });

    return session.id;
  }

  async getSessions(limit = 50): Promise<LocalSession[]> {
    return localDb.getSessions(limit);
  }

  async deleteSession(sessionId: string): Promise<void> {
    await localDb.deleteSession(sessionId);
  }
}
