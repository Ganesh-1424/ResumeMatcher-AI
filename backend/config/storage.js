const path = require('path');
const fs = require('fs');

/**
 * Resolves the upload directory path for resume files.
 * If UPLOADS_DIR is set (e.g. on Render Persistent Disks, Docker volumes, or cloud mounts),
 * it points to that persistent directory.
 * Defaults to backend/uploads for local development.
 *
 * Resumes are private files and are NEVER served statically or publicly.
 */
const getUploadDir = () => {
  const dir = process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR)
    : path.resolve(__dirname, '..', 'uploads');

  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (err) {
      console.warn(`[Storage Warning]: Could not create uploads directory ${dir}:`, err.message);
    }
  }

  return dir;
};

/**
 * Searches across known upload paths for a given resume filename.
 * Prevents directory traversal attacks by using path.basename.
 */
const findResumeFile = (filename) => {
  if (!filename || typeof filename !== 'string') return null;
  const safeFilename = path.basename(filename);
  const candidateDirs = [
    getUploadDir(),
    path.resolve(__dirname, '..', 'uploads'),
    path.resolve(__dirname, '..', '..', 'uploads'),
    path.resolve(__dirname, '..', '..', 'backend', 'uploads')
  ];

  for (const dir of candidateDirs) {
    const full = path.join(dir, safeFilename);
    if (fs.existsSync(full)) {
      return full;
    }
  }

  return path.join(getUploadDir(), safeFilename);
};

module.exports = {
  getUploadDir,
  findResumeFile
};
