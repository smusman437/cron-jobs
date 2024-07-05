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

module.exports.candidateHealthScreening = async () => {
  try {
    await startTransaction();

    const today = getToday();
    const candidateHealthScreenings = await getCandidateHealthScreenings(today);

    if (candidateHealthScreenings.length > 0) {
      const notificationResources = await createNotificationDetails(
        candidateHealthScreenings
      );
      await insertNotificationResources(notificationResources);
    }

    await commitTransaction();
  } catch (err) {
    await rollbackTransaction();
    console.error("Error executing query: candidateHealthScreening", err);
  }
};

// Helper functions

const getCandidateHealthScreenings = async (today) => {
  const sql = `
        SELECT 
        chs.id, 
        chs.fk_user_id, 
        chs.fk_health_screening_id, 
          h.id AS health_screening_id, 
          h.name AS health_screening_name,
          v.id AS vendor_id,
          v.name AS vendor_name
        FROM 
        candidate_health_screenings chs
        JOIN 
        health_screenings h ON chs.fk_health_screening_id = h.id
        LEFT JOIN 
          vendors v ON chs.fk_vendor_id = v.id
        WHERE 
        chs.expiration = ? AND 
        chs.archived = false AND 
          h.expirationDate = true;
      `;
  return await query(sql, [today]);
};

const createNotificationDetails = async (candidateHealthScreenings) => {
  const notificationResources = [];
  for (const candidateHealthScreening of candidateHealthScreenings) {
    const vendorText = candidateHealthScreening.vendor_name
      ? ` with ${candidateHealthScreening.vendor_name}`
      : "";

    const notificationDetailParams = [
      "candidate health screening",
      "Candidate Health Screening",
      `Your ${candidateHealthScreening.health_screening_name}${vendorText} has expired. Please update the health screening details.`,
      moment().tz(process.env.TIMEZONE).unix(),
      moment().tz(process.env.TIMEZONE).unix(),
    ];

    const notification = await createNotifications(
      notificationDetailParams,
      candidateHealthScreening.fk_user_id
    );
    notificationResources.push(notification);
  }
  return notificationResources;
};
