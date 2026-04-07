import crypto from 'node:crypto';
import path from 'node:path';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';

const toBuffer = (value) => {
  if (Buffer.isBuffer(value)) {
    return value;
  }

  if (value instanceof Uint8Array) {
    return Buffer.from(value);
  }

  if (typeof value === 'string') {
    return Buffer.from(value);
  }

  throw new Error('Object-store writes require a Buffer, Uint8Array, or string payload.');
};

const normalizeStorageKey = (value) => {
  if (typeof value !== 'string') {
    throw new Error('A storage key is required.');
  }

  const normalized = path.posix.normalize(value.trim().replace(/\\/g, '/').replace(/^\/+/, ''));

  if (
    !normalized ||
    normalized === '.' ||
    normalized === '..' ||
    normalized.startsWith('../') ||
    normalized.includes('/../')
  ) {
    throw new Error('The storage key is invalid.');
  }

  return normalized;
};

const resolveStoreRootPath = (env) => {
  const configuredPath = env?.evidenceStoragePath ?? '.data/evidence';
  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.join(env?.projectRoot ?? process.cwd(), configuredPath);
};

const createMemoryObjectStore = () => {
  const objects = new Map();

  return {
    driver: 'memory',
    async writeObject({ key, body }) {
      const normalizedKey = normalizeStorageKey(key);
      const buffer = toBuffer(body);

      objects.set(normalizedKey, buffer);

      return Object.freeze({
        key: normalizedKey,
        sizeBytes: buffer.byteLength,
      });
    },
    async readObject(key) {
      const normalizedKey = normalizeStorageKey(key);
      const buffer = objects.get(normalizedKey) ?? null;

      if (!buffer) {
        const error = new Error(`Stored object not found for key ${normalizedKey}.`);
        error.code = 'ENOENT';
        throw error;
      }

      return Object.freeze({
        key: normalizedKey,
        body: Buffer.from(buffer),
        sizeBytes: buffer.byteLength,
      });
    },
    async deleteObject(key) {
      const normalizedKey = normalizeStorageKey(key);
      objects.delete(normalizedKey);
    },
    async exists(key) {
      const normalizedKey = normalizeStorageKey(key);
      return objects.has(normalizedKey);
    },
    async close() {},
  };
};

const createFileSystemObjectStore = ({ env }) => {
  const rootPath = resolveStoreRootPath(env);

  const resolveAbsolutePath = (key) => {
    const normalizedKey = normalizeStorageKey(key);
    const absolutePath = path.join(rootPath, ...normalizedKey.split('/'));
    const relative = path.relative(rootPath, absolutePath);

    if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`)) {
      throw new Error('The storage key resolves outside the configured object-store root.');
    }

    return { normalizedKey, absolutePath };
  };

  return {
    driver: 'fs',
    rootPath,
    async writeObject({ key, body }) {
      const buffer = toBuffer(body);
      const { normalizedKey, absolutePath } = resolveAbsolutePath(key);
      const directoryPath = path.dirname(absolutePath);
      const temporaryPath = `${absolutePath}.${crypto.randomUUID()}.tmp`;

      await mkdir(directoryPath, { recursive: true });
      await writeFile(temporaryPath, buffer);
      await rename(temporaryPath, absolutePath);

      return Object.freeze({
        key: normalizedKey,
        sizeBytes: buffer.byteLength,
      });
    },
    async readObject(key) {
      const { normalizedKey, absolutePath } = resolveAbsolutePath(key);
      const buffer = await readFile(absolutePath);

      return Object.freeze({
        key: normalizedKey,
        body: buffer,
        sizeBytes: buffer.byteLength,
      });
    },
    async deleteObject(key) {
      const { absolutePath } = resolveAbsolutePath(key);
      await rm(absolutePath, { force: true });
    },
    async exists(key) {
      const { absolutePath } = resolveAbsolutePath(key);

      try {
        const details = await stat(absolutePath);
        return details.isFile();
      } catch (error) {
        if (error?.code === 'ENOENT') {
          return false;
        }

        throw error;
      }
    },
    async close() {},
  };
};

export const createObjectStore = ({ env } = {}) => {
  const driver = String(env?.evidenceStorageDriver ?? 'fs').trim().toLowerCase();

  return driver === 'memory'
    ? createMemoryObjectStore()
    : createFileSystemObjectStore({ env });
};
