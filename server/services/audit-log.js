export const AUDIT_EVENT_TYPES = Object.freeze({
  REVIEW_CREATED: 'review_created',
  REVIEW_STATE_SAVED: 'review_state_saved',
  ASSIGNMENTS_UPDATED: 'assignments_updated',
  LIFECYCLE_TRANSITION: 'lifecycle_transition',
  CAPTURE_INITIALIZED: 'capture_initialized',
  EVIDENCE_ASSET_UPLOADED: 'evidence_asset_uploaded',
  EVIDENCE_LINK_CREATED: 'evidence_link_created',
  EVIDENCE_LINK_UPDATED: 'evidence_link_updated',
  EVIDENCE_LINK_DELETED: 'evidence_link_deleted',
  EVIDENCE_ASSET_DELETED: 'evidence_asset_deleted',
  COMMENT_CREATED: 'comment_created',
  EXPORT_CREATED: 'export_created',
  IMPORT_COMPLETED: 'import_completed',
});

export const createAuditLogService = ({ auditEventsRepository } = {}) =>
  Object.freeze({
    async record(event) {
      if (!auditEventsRepository) {
        return null;
      }

      return auditEventsRepository.append({
        metadataJson: {},
        ...event,
        createdAt: event.createdAt ?? new Date().toISOString(),
      });
    },
    async listByEvaluationId(evaluationId) {
      return auditEventsRepository?.listByEvaluationId(evaluationId) ?? [];
    },
  });
