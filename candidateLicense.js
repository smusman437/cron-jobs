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

module.exports.candidateLicense = async () => {
  try {
    await startTransaction();

    const today = getToday();
    const candidateLicenses = await getCandidateLicenses(today);

    if (candidateLicenses.length > 0) {
      const notificationResources = await createNotificationDetails(
        candidateLicenses
      );
      await insertNotificationResources(notificationResources);
    }

    await commitTransaction();
  } catch (err) {
    await rollbackTransaction();
    console.error("Error executing query: candidateLicense", err);
  }
};

// Helper functions

const getCandidateLicenses = async (today) => {
  const sql = `
      SELECT 
        cl.id, 
        cl.fk_user_id, 
        cl.fk_license_id, 
        l.id AS license_id, 
        l.name AS license_name,
        v.id AS vendor_id,
        v.name AS vendor_name
      FROM 
        candidate_licenses cl
      JOIN 
        licenses l ON cl.fk_license_id = l.id
      LEFT JOIN 
        vendors v ON cl.fk_vendor_id = v.id
      WHERE 
        cl.expiration = ? AND 
        cl.archived = false AND 
        l.expirationDate = true;
    `;
  return await query(sql, [today]);
};

const createNotificationDetails = async (candidateLicenses) => {
  const notificationResources = [];
  for (const candidateLicense of candidateLicenses) {
    const vendorText = candidateLicense.vendor_name
      ? ` with ${candidateLicense.vendor_name}`
      : "";

    const notificationDetailParams = [
      "candidate license",
      "Candidate License",
      `Your ${candidateLicense.license_name}${vendorText} has expired. Please update the license details.`,
      moment().tz(process.env.TIMEZONE).unix(),
      moment().tz(process.env.TIMEZONE).unix(),
    ];
    const notification = await createNotifications(
      notificationDetailParams,
      candidateLicense.fk_user_id
    );
    notificationResources.push(notification);
  }
  return notificationResources;
};
