const {
  candidateBackgroundScreening,
} = require("./candidateBackgroundScreening");
const { candidateCertificate } = require("./candidateCertificate");
const { candidateHealthScreening } = require("./candidateHealthScreening");
const { candidateLicense } = require("./candidateLicense");
const {
  candidateOnboardingDocument,
} = require("./candidateOnboardingDocument");
const { candidateProfileDocument } = require("./candidateProfileDocument");
const { candidateSkill } = require("./candidateSkill");
const { candidateTest } = require("./candidateTest");
const { timesheetNotification } = require("./createTimesheet");

module.exports = {
  candidateBackgroundScreening,
  candidateCertificate,
  candidateHealthScreening,
  candidateLicense,
  candidateOnboardingDocument,
  candidateProfileDocument,
  candidateSkill,
  candidateTest,
  timesheetNotification,
};
