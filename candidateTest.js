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

module.exports.candidateTest = async () => {
  try {
    await startTransaction();

    const today = getToday();
    const candidateTests = await getCandidateTests(today);

    if (candidateTests.length > 0) {
      const notificationResources = await createNotificationDetails(
        candidateTests
      );
      await insertNotificationResources(notificationResources);
    }

    await commitTransaction();
  } catch (err) {
    await rollbackTransaction();
    console.error("Error executing query: CandidateTest", err);
  }
};

// Helper functions

const getCandidateTests = async (today) => {
  const sql = `
  SELECT 
        ct.id, 
        ct.fk_user_id, 
        ct.fk_test_id, 
          t.id AS test_id, 
          t.name AS test_name,
          v.id AS vendor_id,
          v.name AS vendor_name
        FROM 
        candidate_tests ct
        JOIN 
        tests t ON ct.fk_test_id = t.id
        LEFT JOIN 
          vendors v ON ct.fk_vendor_id = v.id
        WHERE 
        ct.expiration = ? AND 
        ct.archived = false AND 
          t.expirationDate = true
      `;
  return await query(sql, [today]);
};

const createNotificationDetails = async (candidateTests) => {
  const notificationResources = [];
  for (const candidateTest of candidateTests) {
    const vendorText = candidateTest.vendor_name
      ? ` with ${candidateTest.vendor_name}`
      : "";

    const notificationDetailParams = [
      "candidate test",
      "Candidate Test",
      `Your ${candidateTest.test_name}${vendorText} has expired. Please update the test details.`,
      moment().tz(process.env.TIMEZONE).unix(),
      moment().tz(process.env.TIMEZONE).unix(),
    ];

    const notification = await createNotifications(
      notificationDetailParams,
      candidateTest.fk_user_id
    );
    notificationResources.push(notification);
  }
  return notificationResources;
};
