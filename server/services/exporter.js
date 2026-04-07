import JSZip from 'jszip';

const EXPORT_PACKAGE_VERSION = 1;
const JSON_EXPORT_FILENAME = 'trust-review-export.json';
const ZIP_EXPORT_FILENAME = 'trust-review-package.zip';
const EVIDENCE_MANIFEST_FILENAME = 'evidence/trust-evidence-manifest.json';
const AUDIT_EXPORT_FILENAME = 'audit/audit-events.json';
const CSV_EXPORT_FILENAME = 'reports/review-summary.csv';
const PACKAGE_MANIFEST_FILENAME = 'package-manifest.json';

const cloneValue = (value) => {
  if (Array.isArray(value)) {
    return value.map((entry) => cloneValue(entry));
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneValue(entry)]));
  }

  return value;
};

const normalizeText = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);

const buildReviewRecordEnvelope = (review) => ({
  review_id: String(review.id),
  public_id: review.publicId,
  workflow_mode: review.workflowMode,
  lifecycle_state: review.lifecycleState,
  state_schema_version: review.stateSchemaVersion,
  framework_version: review.frameworkVersion,
  current_revision_number: review.currentRevisionNumber,
  current_etag: review.currentEtag,
  created_at: review.createdAt,
  updated_at: review.updatedAt,
  created_by_user_id: String(review.createdByUserId),
  title_snapshot: review.titleSnapshot,
  primary_evaluator_user_id:
    review.primaryEvaluatorUserId === null ? null : String(review.primaryEvaluatorUserId),
  second_reviewer_user_id:
    review.secondReviewerUserId === null ? null : String(review.secondReviewerUserId),
  decision_owner_user_id:
    review.decisionOwnerUserId === null ? null : String(review.decisionOwnerUserId),
  submitted_at: review.submittedAt,
  finalized_at: review.finalizedAt,
  archived_at: review.archivedAt,
  current_state_json: cloneValue(review.currentStateJson),
});

const buildRevisionEnvelope = (revision) => ({
  review_id: String(revision.evaluationId),
  revision_number: revision.revisionNumber,
  workflow_mode: revision.workflowMode,
  lifecycle_state: revision.lifecycleState,
  state_schema_version: revision.stateSchemaVersion,
  framework_version: revision.frameworkVersion,
  state_json: cloneValue(revision.stateJson),
  saved_by_user_id: String(revision.savedByUserId),
  save_reason: revision.saveReason,
  created_at: revision.createdAt,
});

const buildEvidenceAssetExport = (asset) => ({
  asset_id: asset.assetId,
  asset_kind: asset.assetKind,
  source_type: asset.sourceType,
  original_filename: asset.originalName,
  mime_type: asset.mimeType,
  size_bytes: asset.sizeBytes,
  sha256: asset.contentHash,
  origin_url: asset.originUrl,
  origin_title: asset.originTitle,
  captured_at_client: asset.capturedAtClient,
  received_at_server: asset.receivedAtServer,
  storage_provider: asset.storageProvider,
  storage_key: asset.storageKey,
});

const buildEvidenceLinkExport = (link) => ({
  link_id: link.linkId,
  asset_id: link.assetId,
  target_scope: link.scopeType,
  section_id: link.scopeType === 'criterion' ? link.sectionId : null,
  criterion_code: link.criterionCode,
  evidence_type: link.evidenceType,
  note: link.note,
  linked_by_user_id: String(link.linkedByUserId),
  linked_at: link.linkedAt,
});

const buildLinkedTestPlanExport = ({ plan, revision, testSet, linkedByUser }) => ({
  review_test_plan_id: plan.id,
  test_set_id: plan.testSetId,
  test_set_revision_id: plan.testSetRevisionId,
  role: plan.role,
  linked_by_user_id: String(plan.linkedByUserId),
  linked_by_display_name:
    linkedByUser?.displayName ?? linkedByUser?.email ?? `User ${plan.linkedByUserId}`,
  linked_at: plan.linkedAt,
  test_set: testSet
    ? {
        id: testSet.id,
        slug: testSet.slug,
        title: testSet.title,
        visibility: testSet.visibility,
        status: testSet.status,
      }
    : null,
  revision: revision
    ? {
        id: revision.id,
        version_number: revision.versionNumber,
        status: revision.status,
        title_snapshot: revision.titleSnapshot,
        case_count: Array.isArray(revision.cases) ? revision.cases.length : 0,
        published_at: revision.publishedAt,
      }
    : null,
});

const buildTestRunExport = ({ run, plan, revision, evidenceLinks, evidenceAssetIds }) => ({
  run_id: run.id,
  review_test_plan_id: run.reviewTestPlanId,
  test_set_id: run.testSetId,
  test_set_revision_id: run.testSetRevisionId,
  plan_role: plan?.role ?? null,
  revision_version_number: revision?.versionNumber ?? null,
  revision_title_snapshot: revision?.titleSnapshot ?? null,
  case_ordinal: run.caseOrdinal,
  case_title_snapshot: run.caseTitleSnapshot,
  criterion_code: run.criterionCode,
  status: run.status,
  result_summary: run.resultSummary,
  result_notes: run.resultNotes,
  linked_evidence_link_ids: run.linkedEvidenceLinkIds,
  linked_evidence_asset_ids: evidenceAssetIds,
  linked_evidence_count: evidenceLinks.length,
  executed_by_user_id: String(run.executedByUserId),
  started_at: run.startedAt,
  completed_at: run.completedAt,
  created_at: run.createdAt,
  updated_at: run.updatedAt,
});

const buildFinalDecisionRecord = (review) => {
  const fields = review.currentStateJson?.fields ?? {};

  if (!fields['s10c.finalStatus']) {
    return null;
  }

  return {
    final_status: fields['s10c.finalStatus'],
    rationale: fields['s10c.finalStatusRationale'] ?? '',
    publication_status: fields['s10c.publicationStatus'] ?? '',
    decision_meeting_date: fields['s10c.decisionMeetingDate'] ?? '',
    meeting_participants: fields['s10c.meetingParticipants'] ?? '',
  };
};

const toCsvValue = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;

const buildReviewSummaryCsv = ({ review, comments, auditEvents, evidence }) => {
  const rows = [
    ['review_id', String(review.id)],
    ['public_id', review.publicId],
    ['title_snapshot', review.titleSnapshot],
    ['workflow_mode', review.workflowMode],
    ['lifecycle_state', review.lifecycleState],
    ['current_revision_number', String(review.currentRevisionNumber)],
    ['comments_count', String(comments.length)],
    ['audit_event_count', String(auditEvents.length)],
    ['evidence_asset_count', String(evidence.assets.length)],
    ['evidence_link_count', String(evidence.links.length)],
  ];

  return ['key,value', ...rows.map(([key, value]) => `${toCsvValue(key)},${toCsvValue(value)}`)].join('\n');
};

const buildToolingAwareReviewSummaryCsv = ({
  review,
  comments,
  auditEvents,
  evidence,
  linkedTestPlans,
  testRuns,
}) => {
  const rows = [
    ['review_id', String(review.id)],
    ['public_id', review.publicId],
    ['title_snapshot', review.titleSnapshot],
    ['workflow_mode', review.workflowMode],
    ['lifecycle_state', review.lifecycleState],
    ['current_revision_number', String(review.currentRevisionNumber)],
    ['comments_count', String(comments.length)],
    ['audit_event_count', String(auditEvents.length)],
    ['evidence_asset_count', String(evidence.assets.length)],
    ['evidence_link_count', String(evidence.links.length)],
    ['linked_test_plan_count', String(linkedTestPlans.length)],
    ['test_run_count', String(testRuns.length)],
    ['test_run_completed_count', String(testRuns.filter((run) => run.status === 'completed').length)],
    [
      'linked_test_plan_revisions',
      linkedTestPlans
        .map((plan) => {
          const revisionLabel = plan.revision
            ? `${plan.testSet?.title ?? plan.revision.title_snapshot ?? 'Test set'} v${plan.revision.version_number}`
            : `${plan.testSet?.title ?? 'Test set'} revision missing`;
          return `${revisionLabel} (${plan.role})`;
        })
        .join(' | '),
    ],
  ];

  return ['key,value', ...rows.map(([key, value]) => `${toCsvValue(key)},${toCsvValue(value)}`)].join('\n');
};

const buildArchivePath = (asset) =>
  asset.storageKey
    ? `evidence/files/${asset.assetId}--${(normalizeText(asset.sanitizedName) ?? normalizeText(asset.originalName) ?? 'evidence').replace(/[^A-Za-z0-9._-]+/g, '-')}`
    : null;

const buildAttachmentIndex = ({ assets, includeEvidenceFiles }) =>
  assets.map((asset) => ({
    asset_id: asset.assetId,
    archive_path: includeEvidenceFiles ? buildArchivePath(asset) : null,
    original_filename: asset.originalName,
    mime_type: asset.mimeType,
    size_bytes: asset.sizeBytes,
    sha256: asset.contentHash,
  }));

export const createExporter = ({
  evaluationRepository,
  revisionsRepository,
  evidenceService,
  evidenceAssetRepository,
  evidenceLinkRepository,
  reviewTestPlansRepository,
  testSetRevisionsRepository,
  testRunsRepository,
  assignmentsRepository,
  workflowTransitionsRepository,
  commentsRepository,
  auditEventsRepository,
  exportJobsRepository,
  objectStore,
  userRepository,
  testSetsRepository,
} = {}) =>
  Object.freeze({
    async listExportJobs(evaluationId) {
      return exportJobsRepository.listByEvaluationId(evaluationId);
    },

    async createExportJob({
      evaluationId,
      actorUser,
      format = 'json',
      includeEvidenceFiles = format === 'zip',
      includeReportingCsv = format === 'zip',
    } = {}) {
      const review = await evaluationRepository.getVisibleById(evaluationId, actorUser.id, {
        userRole: actorUser.role,
      });

      if (!review) {
        throw new Error('Review not found.');
      }

      const created = await exportJobsRepository.create({
        evaluationId: Number(evaluationId),
        requestedByUserId: Number(actorUser.id),
        format: format === 'zip' ? 'zip' : 'json',
        includeEvidenceFiles: Boolean(includeEvidenceFiles),
        includeReportingCsv: Boolean(includeReportingCsv),
        status: 'completed',
        fileName: format === 'zip' ? ZIP_EXPORT_FILENAME : JSON_EXPORT_FILENAME,
        byteSize: 0,
        packageVersion: EXPORT_PACKAGE_VERSION,
      });

      return created;
    },

    async buildCanonicalExport({ evaluationId, actorUser, exportJob } = {}) {
      const review = await evaluationRepository.getVisibleById(evaluationId, actorUser.id, {
        userRole: actorUser.role,
      });

      if (!review) {
        throw new Error('Review not found.');
      }

      const [
        revisions,
        evidence,
        manifest,
        assignments,
        workflowTransitions,
        comments,
        auditEvents,
        reviewTestPlans,
        testRuns,
      ] =
        await Promise.all([
          revisionsRepository.listByEvaluationId(review.id),
          (async () => {
            const [assets, links] = await Promise.all([
              evidenceAssetRepository.getByIds(
                [
                  ...new Set(
                    (await evidenceLinkRepository.listByEvaluationId(review.id)).map((link) => link.assetId),
                  ),
                ],
              ),
              evidenceLinkRepository.listByEvaluationId(review.id),
            ]);

            return {
              assets: assets.filter((asset) => !asset.deletedAt),
              links: links.filter((link) => !link.deletedAt),
            };
          })(),
          evidenceService.getManifest({ evaluationId: review.id, actorUserId: actorUser.id }),
          assignmentsRepository.listActiveByEvaluationId(review.id),
          workflowTransitionsRepository.listByEvaluationId(review.id),
          commentsRepository.listByEvaluationId(review.id),
          auditEventsRepository.listByEvaluationId(review.id),
          reviewTestPlansRepository?.listByEvaluationId(review.id) ?? [],
          testRunsRepository?.listByEvaluationId(review.id) ?? [],
        ]);

      const linkedPlanDependencies = await Promise.all(
        reviewTestPlans.map(async (plan) => {
          const [testSet, revision, linkedByUser] = await Promise.all([
            testSetsRepository?.getById?.(plan.testSetId) ?? null,
            testSetRevisionsRepository?.getById?.(plan.testSetRevisionId) ?? null,
            userRepository?.getById?.(plan.linkedByUserId) ?? null,
          ]);

          return buildLinkedTestPlanExport({
            plan,
            revision,
            testSet,
            linkedByUser,
          });
        }),
      );
      const evidenceLinkMap = new Map(evidence.links.map((link) => [link.linkId, link]));
      const toolingRuns = await Promise.all(
        testRuns.map(async (run) => {
          const [plan, revision] = await Promise.all([
            reviewTestPlans.find((entry) => entry.id === run.reviewTestPlanId) ?? null,
            testSetRevisionsRepository?.getById?.(run.testSetRevisionId) ?? null,
          ]);
          const linkedEvidenceLinks = run.linkedEvidenceLinkIds
            .map((linkId) => evidenceLinkMap.get(linkId) ?? null)
            .filter(Boolean);
          const evidenceAssetIds = [
            ...new Set(linkedEvidenceLinks.map((link) => link.assetId).filter(Boolean)),
          ];

          return buildTestRunExport({
            run,
            plan,
            revision,
            evidenceLinks: linkedEvidenceLinks,
            evidenceAssetIds,
          });
        }),
      );

      const attachmentIndex = buildAttachmentIndex({
        assets: evidence.assets,
        includeEvidenceFiles: Boolean(exportJob.includeEvidenceFiles),
      });
      const canonical = {
        package: {
          package_type: 'trust_review_export',
          package_version: EXPORT_PACKAGE_VERSION,
          serialization: exportJob.format,
          exported_at: new Date().toISOString(),
          exported_by_user_id: String(actorUser.id),
          review_id: String(review.id),
          public_id: review.publicId,
          state_schema_version: review.stateSchemaVersion,
          framework_version: review.frameworkVersion,
          includes: {
            revisions: true,
            legacy_manifest_v1: true,
            audit_events: true,
            reporting_csv: Boolean(exportJob.includeReportingCsv),
            evidence_files: Boolean(exportJob.includeEvidenceFiles),
          },
        },
        review: {
          record: buildReviewRecordEnvelope(review),
          tool: {
            tool_name: review.currentStateJson?.fields?.['s0.toolName'] ?? '',
          },
          tooling: {
            linked_test_plans: linkedPlanDependencies,
            test_runs: toolingRuns,
          },
        },
        revisions: revisions.map((revision) => buildRevisionEnvelope(revision)),
        evidence: {
          assets: evidence.assets.map((asset) => buildEvidenceAssetExport(asset)),
          links: evidence.links.map((link) => buildEvidenceLinkExport(link)),
          legacy_manifest_v1: manifest,
        },
        collaboration: {
          assignments: assignments.map((assignment) => ({
            id: assignment.id,
            role: assignment.role,
            user_id: String(assignment.userId),
            assigned_by_user_id: String(assignment.assignedByUserId),
            assigned_at: assignment.assignedAt,
            unassigned_at: assignment.unassignedAt ?? null,
          })),
          workflow_transitions: workflowTransitions.map((transition) => ({
            id: transition.id,
            transition_id: transition.transitionId,
            from_lifecycle_state: transition.fromLifecycleState,
            to_lifecycle_state: transition.toLifecycleState,
            resulting_workflow_mode: transition.resultingWorkflowMode,
            resulting_revision_number: transition.resultingRevisionNumber,
            actor_user_id: String(transition.actorUserId),
            reason: transition.reason,
            created_at: transition.createdAt,
          })),
          comments: comments.map((comment) => ({
            id: comment.id,
            scope_type: comment.scopeType,
            section_id: comment.sectionId,
            criterion_code: comment.criterionCode,
            body: comment.body,
            created_by_user_id: String(comment.createdByUserId),
            created_at: comment.createdAt,
          })),
          final_decision: buildFinalDecisionRecord(review),
        },
        audit: {
          events: auditEvents.map((event) => ({
            id: event.id,
            evaluation_id: String(event.evaluationId),
            actor_user_id: event.actorUserId === null ? null : String(event.actorUserId),
            event_type: event.eventType,
            summary: event.summary,
            scope_type: event.scopeType,
            section_id: event.sectionId,
            criterion_code: event.criterionCode,
            related_comment_id: event.relatedCommentId,
            related_asset_id: event.relatedAssetId,
            related_link_id: event.relatedLinkId,
            related_revision_number: event.relatedRevisionNumber,
            related_export_job_id: event.relatedExportJobId,
            related_import_record_id: event.relatedImportRecordId,
            metadata_json: cloneValue(event.metadataJson ?? {}),
            created_at: event.createdAt,
          })),
        },
        attachments: {
          files_included: Boolean(exportJob.includeEvidenceFiles),
          items: attachmentIndex,
        },
      };

      return {
        review,
        canonical,
        manifest,
        auditEvents,
        comments,
        evidence,
        attachmentIndex,
        reportingCsv: buildToolingAwareReviewSummaryCsv({
          review,
          comments,
          auditEvents,
          evidence,
          linkedTestPlans: linkedPlanDependencies,
          testRuns: toolingRuns,
        }),
      };
    },

    async renderDownload({ evaluationId, actorUser, jobId } = {}) {
      const exportJob = await exportJobsRepository.getByJobId(evaluationId, jobId);

      if (!exportJob) {
        throw new Error('Export job not found.');
      }

      const rendered = await this.buildCanonicalExport({
        evaluationId,
        actorUser,
        exportJob,
      });

      if (exportJob.format === 'json') {
        const json = JSON.stringify(rendered.canonical, null, 2);
        const body = Buffer.from(json, 'utf8');
        await exportJobsRepository.updateCompletion({
          evaluationId,
          jobId,
          byteSize: body.byteLength,
          fileName: JSON_EXPORT_FILENAME,
        });
        return {
          contentType: 'application/json; charset=utf-8',
          fileName: JSON_EXPORT_FILENAME,
          body,
        };
      }

      const zip = new JSZip();
      zip.file(JSON_EXPORT_FILENAME, JSON.stringify(rendered.canonical, null, 2));
      zip.file(
        PACKAGE_MANIFEST_FILENAME,
        JSON.stringify(
          {
            package_type: 'trust_review_export',
            package_version: EXPORT_PACKAGE_VERSION,
            serialization: 'zip',
            review_id: String(rendered.review.id),
            public_id: rendered.review.publicId,
            review_export_path: JSON_EXPORT_FILENAME,
            evidence_manifest_path: EVIDENCE_MANIFEST_FILENAME,
            audit_events_path: AUDIT_EXPORT_FILENAME,
            includes: {
              reporting_csv: Boolean(exportJob.includeReportingCsv),
              evidence_files: Boolean(exportJob.includeEvidenceFiles),
            },
          },
          null,
          2,
        ),
      );
      zip.file(EVIDENCE_MANIFEST_FILENAME, JSON.stringify(rendered.manifest, null, 2));
      zip.file(
        AUDIT_EXPORT_FILENAME,
        JSON.stringify({ events: rendered.auditEvents }, null, 2),
      );

      if (exportJob.includeReportingCsv) {
        zip.file(CSV_EXPORT_FILENAME, rendered.reportingCsv);
      }

      if (exportJob.includeEvidenceFiles) {
        for (const asset of rendered.evidence.assets) {
          if (!asset.storageKey) {
            continue;
          }

          const stored = await objectStore.readObject(asset.storageKey);
          const archivePath = buildArchivePath(asset);

          if (archivePath) {
            zip.file(archivePath, stored.body);
          }
        }
      }

      const body = await zip.generateAsync({ type: 'nodebuffer' });
      await exportJobsRepository.updateCompletion({
        evaluationId,
        jobId,
        byteSize: body.byteLength,
        fileName: ZIP_EXPORT_FILENAME,
      });

      return {
        contentType: 'application/zip',
        fileName: ZIP_EXPORT_FILENAME,
        body,
      };
    },
  });

export {
  EXPORT_PACKAGE_VERSION,
  JSON_EXPORT_FILENAME,
  ZIP_EXPORT_FILENAME,
  EVIDENCE_MANIFEST_FILENAME,
  AUDIT_EXPORT_FILENAME,
  CSV_EXPORT_FILENAME,
  PACKAGE_MANIFEST_FILENAME,
};
