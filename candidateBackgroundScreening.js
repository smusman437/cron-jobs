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

module.exports.candidateBackgroundScreening = async () => {
  try {
    await startTransaction();

    const today = getToday();
    const candidateBackgroundScreenings =
      await getCandidateBackgroundScreenings(today);

    if (candidateBackgroundScreenings.length > 0) {
      const notificationResources = await createNotificationDetails(
        candidateBackgroundScreenings
      );
      await insertNotificationResources(notificationResources);
    }

    await commitTransaction();
  } catch (err) {
    await rollbackTransaction();
    console.error("Error executing query: candidateBackgroundScreening", err);
  }
};

// Helper functions

const getCandidateBackgroundScreenings = async (today) => {
  const sql = `
  SELECT 
  cbs.id, 
  cbs.fk_user_id, 
  cbs.fk_background_screening_id, 
    b.id AS background_screening_id, 
    b.name AS background_screening_name,
    v.id AS vendor_id,
    v.name AS vendor_name
  FROM 
  candidate_background_screenings cbs
  JOIN 
  background_screenings b ON cbs.fk_background_screening_id = b.id
  LEFT JOIN 
  vendors v ON cbs.fk_vendor_id = v.id
  WHERE 
  cbs.expiration = ? AND 
  cbs.archived = false AND 
    b.expirationDate = true
      `;
  return await query(sql, [today]);
};

const createNotificationDetails = async (candidateBackgroundScreenings) => {
  const notificationResources = [];
  for (const candidateBackgroundScreening of candidateBackgroundScreenings) {
    const vendorText = candidateBackgroundScreening.vendor_name
      ? ` with ${candidateBackgroundScreening.vendor_name}`
      : "";

    const notificationDetailParams = [
      "candidate background screening",
      "Candidate Background Screening",
      `Your ${candidateBackgroundScreening.background_screening_name}${vendorText} has expired. Please update the background screening details.`,
      moment().tz(process.env.TIMEZONE).unix(),
      moment().tz(process.env.TIMEZONE).unix(),
    ];

    const notification = await createNotifications(
      notificationDetailParams,
      candidateBackgroundScreening.fk_user_id
    );
    notificationResources.push(notification);
  }

  return notificationResources;
};
