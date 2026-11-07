const fs = require('fs');
const path = require('path');
const { getUploadDir } = require('./storage');

/**
 * Disk-Backed Fallback Persistence Store
 * Ensures that if MySQL is temporarily offline, in-memory state is synchronized
 * to and restored from a local JSON file across process restarts.
 */
function getStoreFilePath() {
  const uploadDir = getUploadDir();
  return path.join(uploadDir, 'fallback_store.json');
}

function loadFallbackStore() {
  try {
    const filePath = getStoreFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(raw);
      return {
        users: Array.isArray(data.users) ? data.users : [],
        analyses: Array.isArray(data.analyses) ? data.analyses : [],
        savedResumes: Array.isArray(data.savedResumes) ? data.savedResumes : []
      };
    }
  } catch (err) {
    console.warn('[PersistentStore Notice]: Could not load disk fallback store:', err.message);
  }
  return { users: [], analyses: [], savedResumes: [] };
}

function saveFallbackStore(data) {
  try {
    const filePath = getStoreFilePath();
    const payload = JSON.stringify({
      users: data.users || [],
      analyses: data.analyses || [],
      savedResumes: data.savedResumes || [],
      updatedAt: new Date().toISOString()
    }, null, 2);
    fs.writeFileSync(filePath, payload, 'utf8');
  } catch (err) {
    console.warn('[PersistentStore Notice]: Could not write disk fallback store:', err.message);
  }
}

module.exports = {
  loadFallbackStore,
  saveFallbackStore
};
