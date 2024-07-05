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

module.exports.candidateProfileDocument = async () => {
  try {
    await startTransaction();

    const today = getToday();
    const candidateProfileDocuments = await getCandidateProfileDocuments(today);

    if (candidateProfileDocuments.length > 0) {
      const notificationResources = await createNotificationDetails(
        candidateProfileDocuments
      );
      await insertNotificationResources(notificationResources);
    }

    await commitTransaction();
  } catch (err) {
    await rollbackTransaction();
    console.error("Error executing query: CandidateProfileDocument", err);
  }
};

// Helper functions

const getCandidateProfileDocuments = async (today) => {
  const sql = `
  SELECT 
  cpd.id, 
  cpd.fk_user_id, 
  cpd.fk_document_id, 
    fd.id AS facility_doc_id, 
    fd.name AS facility_doc_name,
    v.id AS vendor_id,
    v.name AS vendor_name
  FROM 
  candidate_profile_documents cpd
  JOIN 
  facility_documents fd ON cpd.fk_document_id = fd.id
  LEFT JOIN 
    vendors v ON cpd.fk_vendor_id = v.id
  WHERE 
  cpd.expiration = ? AND 
  cpd.archived = false AND 
    fd.expirationDate = true
      `;
  return await query(sql, [today]);
};

const createNotificationDetails = async (candidateProfileDocuments) => {
  const notificationResources = [];
  for (const candidateProfileDocument of candidateProfileDocuments) {
    const vendorText = candidateProfileDocument.vendor_name
      ? ` with ${candidateProfileDocument.vendor_name}`
      : "";

    const notificationDetailParams = [
      "candidate facility document",
      "Candidate Facility Document",
      `Your ${candidateProfileDocument.facility_doc_name}${vendorText} has expired. Please update the facilty document details.`,
      moment().tz(process.env.TIMEZONE).unix(),
      moment().tz(process.env.TIMEZONE).unix(),
    ];

    const notification = await createNotifications(
      notificationDetailParams,
      candidateProfileDocument.fk_user_id
    );
    notificationResources.push(notification);
  }
  return notificationResources;
};
