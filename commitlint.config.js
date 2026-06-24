// Enforce Conventional Commits (CODING_PRINCIPLES §13). Used by the commit-msg
// git hook (.githooks/commit-msg) and the CI commitlint job.
module.exports = { extends: ["@commitlint/config-conventional"] };
