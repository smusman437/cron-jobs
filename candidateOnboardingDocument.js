const {
  query,
  startTransaction,
  commitTransaction,
  rollbackTransaction,
} = require("./dbConnection");
const {
  createNotifications,
  insertNotificationResources,
  getToday,
} = require("./utils");
const moment = require("moment-timezone");

module.exports.candidateOnboardingDocument = async () => {
  try {
    await startTransaction();

    const today = getToday();
    const candidateOnboardingDocuments = await getCandidateOnboardingDocuments(
      today
    );

    if (candidateOnboardingDocuments.length > 0) {
      const notificationResources = await createNotificationDetails(
        candidateOnboardingDocuments
      );
      await insertNotificationResources(notificationResources);
    }

    await commitTransaction();
  } catch (err) {
    await rollbackTransaction();
    console.error("Error executing query: CandidateOnboardingDocument", err);
  }
};

// Helper functions

const getCandidateOnboardingDocuments = async (today) => {
  const sql = `
  SELECT 
        cobd.id, 
        cobd.fk_user_id, 
        cobd.fk_onboarding_doc_id, 
          obd.id AS onboarding_doc_id, 
          obd.name AS onboarding_doc_name,
          v.id AS vendor_id,
          v.name AS vendor_name
        FROM 
        candidate_onboarding_documents cobd
        JOIN 
        onboarding_documents obd ON cobd.fk_onboarding_doc_id = obd.id
        LEFT JOIN 
          vendors v ON cobd.fk_vendor_id = v.id
        WHERE 
        cobd.expiration = ? AND 
        cobd.archived = false AND 
          obd.expirationDate = true
      `;
  return await query(sql, [today]);
};

const createNotificationDetails = async (candidateOnboardingDocuments) => {
  const notificationResources = [];
  for (const candidateOnboardingDocument of candidateOnboardingDocuments) {
    const vendorText = candidateOnboardingDocument.vendor_name
      ? ` with ${candidateOnboardingDocument.vendor_name}`
      : "";

    const notificationDetailParams = [
      "candidate onboarding document",
      "Candidate Onboarding Document",
      `Your ${candidateOnboardingDocument.onboarding_doc_name}${vendorText} has expired. Please update the onboarding document details.`,
      moment().tz(process.env.TIMEZONE).unix(),
      moment().tz(process.env.TIMEZONE).unix(),
    ];

    const notification = await createNotifications(
      notificationDetailParams,
      candidateOnboardingDocument.fk_user_id
    );
    notificationResources.push(notification);
  }
  return notificationResources;
};
