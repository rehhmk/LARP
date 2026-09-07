import { createHash, sign, verify } from 'node:crypto';

export class ApprovalProvenanceError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'ApprovalProvenanceError';
    this.code = code;
    this.details = details;
  }
}

function canonicalize(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(',')}}`;
  }
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  throw new ApprovalProvenanceError('APPROVAL_SCHEMA_INVALID', `Approval contains unsupported value type ${typeof value}.`);
}

export function trustStoreFingerprint(trustStore) {
  return createHash('sha256').update(canonicalize(trustStore)).digest('hex');
}

export function projectApprovalTrustStoreFingerprint(project) {
  const anchors = Object.values(project?.nodes ?? {}).filter((node) => (
    node.kind === 'Authority'
    && node.lifecycle === 'ACTIVE'
    && typeof node.data?.approvalTrustStoreFingerprint === 'string'
  ));
  if (anchors.length !== 1) {
    throw new ApprovalProvenanceError(
      'APPROVAL_TRUST_NOT_CONFIGURED',
      'The canonical project must contain exactly one active human-approval trust anchor.',
      { activeTrustAnchors: anchors.map(({ id }) => id) },
    );
  }
  const fingerprint = anchors[0].data.approvalTrustStoreFingerprint;
  if (!/^[a-f0-9]{64}$/.test(fingerprint)) {
    throw new ApprovalProvenanceError(
      'APPROVAL_TRUST_NOT_CONFIGURED',
      `Approval trust anchor ${anchors[0].id} has an invalid trust-store fingerprint.`,
      { authorityId: anchors[0].id },
    );
  }
  return fingerprint;
}

export function approvalSigningPayload(approval) {
  const provenance = approval?.provenance ?? {};
  const unsigned = {
    ...approval,
    provenance: {
      scheme: provenance.scheme,
      algorithm: provenance.algorithm,
      keyId: provenance.keyId,
    },
  };
  return Buffer.from(canonicalize(unsigned), 'utf8');
}

export function signHumanApproval(approval, { keyId, privateKey }) {
  const candidate = {
    ...approval,
    provenance: {
      scheme: 'digital-signature',
      algorithm: 'Ed25519',
      keyId,
    },
  };
  return {
    ...candidate,
    provenance: {
      ...candidate.provenance,
      signature: sign(null, approvalSigningPayload(candidate), privateKey).toString('base64'),
    },
  };
}

function trustedKeyFor(trustStore, keyId) {
  const entry = trustStore?.approvers?.[keyId];
  if (typeof entry === 'string') return { publicKey: entry, status: 'ACTIVE' };
  if (entry && typeof entry === 'object') {
    return {
      publicKey: entry.publicKeyPem ?? entry.publicKey,
      status: entry.status ?? 'ACTIVE',
      algorithm: entry.algorithm ?? 'Ed25519',
    };
  }
  return null;
}

export function verifyHumanApprovalProvenance(approval, trustStore, expectedTrustStoreFingerprint) {
  if (typeof expectedTrustStoreFingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(expectedTrustStoreFingerprint)) {
    throw new ApprovalProvenanceError(
      'APPROVAL_TRUST_NOT_CONFIGURED',
      'The canonical project does not pin an external human-approval trust store.',
    );
  }
  const actualTrustStoreFingerprint = trustStoreFingerprint(trustStore);
  if (actualTrustStoreFingerprint !== expectedTrustStoreFingerprint) {
    throw new ApprovalProvenanceError(
      'APPROVAL_TRUST_ANCHOR_MISMATCH',
      'The supplied approval trust store does not match the canonical project trust anchor.',
      { expected: expectedTrustStoreFingerprint, actual: actualTrustStoreFingerprint },
    );
  }

  const provenance = approval?.provenance;
  if (provenance?.scheme !== 'digital-signature' || provenance?.algorithm !== 'Ed25519') {
    throw new ApprovalProvenanceError(
      'APPROVAL_PROVENANCE_UNTRUSTED',
      'Human approval requires an Ed25519 signature from a configured external trust anchor.',
    );
  }
  if (typeof provenance.keyId !== 'string' || provenance.keyId.trim() === '') {
    throw new ApprovalProvenanceError('APPROVAL_PROVENANCE_UNTRUSTED', 'Human approval provenance requires keyId.');
  }
  if (approval.actor?.id !== provenance.keyId) {
    throw new ApprovalProvenanceError(
      'APPROVAL_PROVENANCE_UNTRUSTED',
      'Approval actor id must match its external trust-anchor key id.',
      { actorId: approval.actor?.id ?? null, keyId: provenance.keyId },
    );
  }
  if (typeof provenance.signature !== 'string' || provenance.signature.trim() === '') {
    throw new ApprovalProvenanceError('APPROVAL_PROVENANCE_UNTRUSTED', 'Human approval provenance requires a signature.');
  }

  const trusted = trustedKeyFor(trustStore, provenance.keyId);
  if (!trusted || typeof trusted.publicKey !== 'string' || trusted.status !== 'ACTIVE' || trusted.algorithm !== 'Ed25519') {
    throw new ApprovalProvenanceError(
      'APPROVAL_PROVENANCE_UNTRUSTED',
      `No active Ed25519 trust anchor exists for ${provenance.keyId}.`,
      { keyId: provenance.keyId },
    );
  }

  let valid = false;
  try {
    valid = verify(
      null,
      approvalSigningPayload(approval),
      trusted.publicKey,
      Buffer.from(provenance.signature, 'base64'),
    );
  } catch {
    valid = false;
  }
  if (!valid) {
    throw new ApprovalProvenanceError(
      'APPROVAL_SIGNATURE_INVALID',
      'Human approval signature does not match the trusted external key.',
      { keyId: provenance.keyId },
    );
  }

  return {
    scheme: provenance.scheme,
    algorithm: provenance.algorithm,
    keyId: provenance.keyId,
    trustStoreFingerprint: actualTrustStoreFingerprint,
    publicKeyFingerprint: createHash('sha256').update(trusted.publicKey).digest('hex'),
    verified: true,
  };
}
