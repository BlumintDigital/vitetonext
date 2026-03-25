// Patch fs.readlink + fs.promises.readlink to handle Windows EISDIR bug
// (Node.js on Windows returns EISDIR instead of EINVAL for readlink on regular files)
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');

function makeEINVAL(path) {
  return Object.assign(
    new Error(`EINVAL: invalid argument, readlink '${path}'`),
    { code: 'EINVAL', syscall: 'readlink', path }
  );
}

// Callback-based readlink
const origReadlink = fs.readlink.bind(fs);
fs.readlink = function patchedReadlink(path, options, callback) {
  const cb = typeof options === 'function' ? options : callback;
  const opts = typeof options === 'function' ? undefined : options;
  const wrapped = (err, result) => {
    if (err && err.code === 'EISDIR') return cb(makeEINVAL(path), undefined);
    cb(err, result);
  };
  opts ? origReadlink(path, opts, wrapped) : origReadlink(path, wrapped);
};

// Promise-based readlink (used by Next.js async internals)
const origReadlinkP = fs.promises.readlink.bind(fs.promises);
fs.promises.readlink = async function patchedReadlinkP(path, options) {
  try {
    return await (options ? origReadlinkP(path, options) : origReadlinkP(path));
  } catch (err) {
    if (err && err.code === 'EISDIR') throw makeEINVAL(path);
    throw err;
  }
};

// realpath — returns path as-is on EISDIR (no symlink resolution)
const origRealpath = fs.realpath.bind(fs);
fs.realpath = function patchedRealpath(path, options, callback) {
  const cb = typeof options === 'function' ? options : callback;
  const opts = typeof options === 'function' ? undefined : options;
  const wrapped = (err, result) => {
    if (err && err.code === 'EISDIR') return cb(null, String(path));
    cb(err, result);
  };
  opts ? origRealpath(path, opts, wrapped) : origRealpath(path, wrapped);
};

const origRealpathSync = fs.realpathSync.bind(fs);
fs.realpathSync = function patchedRealpathSync(path, options) {
  try { return origRealpathSync(path, options); }
  catch (err) { if (err && err.code === 'EISDIR') return String(path); throw err; }
};

const origRealpathP = fs.promises.realpath.bind(fs.promises);
fs.promises.realpath = async function patchedRealpathP(path, options) {
  try { return await (options ? origRealpathP(path, options) : origRealpathP(path)); }
  catch (err) { if (err && err.code === 'EISDIR') return String(path); throw err; }
};

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
  webpack: (config) => {
    config.resolve.symlinks = false;
    return config;
  },
};

export default nextConfig;
