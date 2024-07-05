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

module.exports.candidateCertificate = async () => {
  try {
    await startTransaction();

    const today = getToday();
    const candidateCertificates = await getCandidateCertificates(today);

    if (candidateCertificates.length > 0) {
      const notificationResources = await createNotificationDetails(
        candidateCertificates
      );
      await insertNotificationResources(notificationResources);
    }

    await commitTransaction();
  } catch (err) {
    await rollbackTransaction();
    console.error("Error executing query: candidatCertificate", err);
  }
};

// Helper functions

const getCandidateCertificates = async (today) => {
  const sql = `
        SELECT 
        cc.id, 
        cc.fk_user_id, 
        cc.fk_certification_id, 
          c.id AS certificate_id, 
          c.name AS certificate_name,
          v.id AS vendor_id,
          v.name AS vendor_name
        FROM 
        candidate_certifications cc
        JOIN 
        certifications c ON cc.fk_certification_id = c.id
        LEFT JOIN 
          vendors v ON cc.fk_vendor_id = v.id
        WHERE 
        cc.expiration = ? AND 
        cc.archived = false AND 
          c.expirationDate = true;
      `;
  return await query(sql, [today]);
};

const createNotificationDetails = async (candidateCertificates) => {
  const notificationResources = [];
  for (const candidateCertificate of candidateCertificates) {
    const vendorText = candidateCertificate.vendor_name
      ? ` with ${candidateCertificate.vendor_name}`
      : "";

    const notificationDetailParams = [
      "candidate certification",
      "Candidate Certification",
      `Your ${candidateCertificate.certificate_name}${vendorText} has expired. Please update the certificate details.`,
      moment().tz(process.env.TIMEZONE).unix(),
      moment().tz(process.env.TIMEZONE).unix(),
    ];

    const notification = await createNotifications(
      notificationDetailParams,
      candidateCertificate.fk_user_id
    );
    notificationResources.push(notification);
  }
  return notificationResources;
};
