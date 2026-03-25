// Patch fs.readlink / fs.realpathSync / fs.promises.* to handle Windows EISDIR bug
// Node.js on Windows returns EISDIR instead of EINVAL when calling readlink on regular files
process.stderr.write('[patch-readlink] loaded in pid ' + process.pid + '\n');

const fs = require('fs');

// ── 1. Callback-based fs.readlink ──────────────────────────────────────────
const origReadlink = fs.readlink;
fs.readlink = function patchedReadlink(path, options, callback) {
  const cb = typeof options === 'function' ? options : callback;
  const opts = typeof options === 'function' ? undefined : options;
  const done = (err, result) => {
    if (err && err.code === 'EISDIR') {
      return cb(Object.assign(
        new Error(`EINVAL: invalid argument, readlink '${path}'`),
        { code: 'EINVAL', syscall: 'readlink', path }
      ), undefined);
    }
    cb(err, result);
  };
  opts !== undefined ? origReadlink.call(fs, path, opts, done) : origReadlink.call(fs, path, done);
};

// ── 2. Sync fs.readlinkSync ────────────────────────────────────────────────
const origReadlinkSync = fs.readlinkSync;
fs.readlinkSync = function patchedReadlinkSync(path, options) {
  try {
    return origReadlinkSync.call(fs, path, options);
  } catch (err) {
    if (err && err.code === 'EISDIR') {
      throw Object.assign(
        new Error(`EINVAL: invalid argument, readlink '${path}'`),
        { code: 'EINVAL', syscall: 'readlink', path }
      );
    }
    throw err;
  }
};

// ── 3. Promise-based fs.promises.readlink (THE KEY ONE for async Next.js) ──
const origReadlinkPromise = fs.promises.readlink;
fs.promises.readlink = async function patchedReadlinkPromise(path, options) {
  try {
    return await origReadlinkPromise.call(fs.promises, path, options);
  } catch (err) {
    if (err && err.code === 'EISDIR') {
      throw Object.assign(
        new Error(`EINVAL: invalid argument, readlink '${path}'`),
        { code: 'EINVAL', syscall: 'readlink', path }
      );
    }
    throw err;
  }
};

// ── 4. fs.realpath (callback) — realpath calls readlink internally ─────────
const origRealpath = fs.realpath;
fs.realpath = function patchedRealpath(path, options, callback) {
  const cb = typeof options === 'function' ? options : callback;
  const opts = typeof options === 'function' ? undefined : options;
  const done = (err, result) => {
    if (err && err.code === 'EISDIR') {
      // Can't resolve symlinks; return path as-is (non-symlink treatment)
      return cb(null, typeof path === 'string' ? path : String(path));
    }
    cb(err, result);
  };
  opts !== undefined ? origRealpath.call(fs, path, opts, done) : origRealpath.call(fs, path, done);
};

// ── 5. fs.realpathSync ─────────────────────────────────────────────────────
const origRealpathSync = fs.realpathSync;
fs.realpathSync = function patchedRealpathSync(path, options) {
  try {
    return origRealpathSync.call(fs, path, options);
  } catch (err) {
    if (err && err.code === 'EISDIR') {
      return typeof path === 'string' ? path : String(path);
    }
    throw err;
  }
};

// ── 6. fs.promises.realpath ────────────────────────────────────────────────
const origRealpathPromise = fs.promises.realpath;
fs.promises.realpath = async function patchedRealpathPromise(path, options) {
  try {
    return await origRealpathPromise.call(fs.promises, path, options);
  } catch (err) {
    if (err && err.code === 'EISDIR') {
      return typeof path === 'string' ? path : String(path);
    }
    throw err;
  }
};

// ── 7. Also patch fs/promises module (separate from fs.promises object) ────
try {
  const fsPromises = require('fs/promises');
  const origFpReadlink = fsPromises.readlink;
  fsPromises.readlink = async function(path, options) {
    try {
      return await origFpReadlink.call(fsPromises, path, options);
    } catch (err) {
      if (err && err.code === 'EISDIR') {
        throw Object.assign(
          new Error(`EINVAL: invalid argument, readlink '${path}'`),
          { code: 'EINVAL', syscall: 'readlink', path }
        );
      }
      throw err;
    }
  };
  const origFpRealpath = fsPromises.realpath;
  fsPromises.realpath = async function(path, options) {
    try {
      return await origFpRealpath.call(fsPromises, path, options);
    } catch (err) {
      if (err && err.code === 'EISDIR') {
        return typeof path === 'string' ? path : String(path);
      }
      throw err;
    }
  };
} catch (_) { /* fs/promises not available */ }

// ── 8. Last-resort: swallow uncaught EISDIR readlink errors ───────────────
const origEmit = process.emit.bind(process);
process.emit = function(event, ...args) {
  if (event === 'uncaughtException' || event === 'unhandledRejection') {
    const err = args[0] instanceof Error ? args[0] : (args[0] && args[0].reason);
    if (err && err.code === 'EISDIR' && err.syscall === 'readlink') {
      process.stderr.write('[patch-readlink] swallowed EISDIR readlink: ' + err.path + '\n');
      return;
    }
  }
  return origEmit(event, ...args);
};
