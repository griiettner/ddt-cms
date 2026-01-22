/**
 * Audit Logger Utility
 * Logs user actions for accountability and compliance
 */
import { getDb } from '../db/database.js';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'EXPORT' | 'COPY' | 'IMPORT';

// Minimal request interface for audit logging
interface AuditRequest {
  ip?: string;
  socket: { remoteAddress?: string };
  get(header: string): string | undefined;
  user?: {
    eid?: string;
    name?: string;
  };
}

interface AuditLogParams {
  req: AuditRequest;
  action: AuditAction;
  resourceType: string;
  resourceId?: number | bigint | null;
  resourceName?: string | null;
  releaseId?: number | string | null;
  details?: Record<string, unknown>;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
}

/**
 * Log an audit event to the database
 */
export const logAudit = (params: AuditLogParams): void => {
  try {
    const db = getDb();
    const user = params.req.user;

    db.prepare(
      `
      INSERT INTO audit_logs (
        user_eid, user_name, action, resource_type, resource_id,
        resource_name, release_id, details, ip_address, user_agent,
        old_value, new_value
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      user?.eid || 'anonymous',
      user?.name || null,
      params.action,
      params.resourceType,
      params.resourceId !== undefined ? Number(params.resourceId) : null,
      params.resourceName ?? null,
      params.releaseId !== undefined ? Number(params.releaseId) : null,
      params.details ? JSON.stringify(params.details) : null,
      params.req.ip || params.req.socket.remoteAddress || null,
      params.req.get('User-Agent') || null,
      params.oldValue ? JSON.stringify(params.oldValue) : null,
      params.newValue ? JSON.stringify(params.newValue) : null
    );
  } catch (err) {
    // Log error but don't throw - audit logging should not break the main operation
    console.error('Audit logging failed:', (err as Error).message);
  }
};

export default logAudit;
