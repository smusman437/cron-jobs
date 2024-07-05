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

module.exports.candidateSkill = async () => {
  try {
    await startTransaction();

    const today = getToday();
    const candidateSkills = await getCandidateSkills(today);

    if (candidateSkills.length > 0) {
      const notificationResources = await createNotificationDetails(
        candidateSkills
      );
      await insertNotificationResources(notificationResources);
    }

    await commitTransaction();
  } catch (err) {
    await rollbackTransaction();
    console.error("Error executing query: CandidateSkill", err);
  }
};

// Helper functions

const getCandidateSkills = async (today) => {
  const sql = `
  SELECT 
        cs.id, 
        cs.fk_user_id, 
        cs.fk_skill_id, 
          s.id AS skill_id, 
          s.name AS skill_name,
          v.id AS vendor_id,
          v.name AS vendor_name
        FROM 
        candidate_skills cs
        JOIN 
        skills s ON cs.fk_skill_id = s.id
        LEFT JOIN 
          vendors v ON cs.fk_vendor_id = v.id
        WHERE 
        cs.expiration = ? AND 
        cs.archived = false AND 
          s.expirationDate = true
      `;
  return await query(sql, [today]);
};

const createNotificationDetails = async (candidateSkills) => {
  const notificationResources = [];
  for (const candidateSkill of candidateSkills) {
    const vendorText = candidateSkill.vendor_name
      ? ` with ${candidateSkill.vendor_name}`
      : "";

    const notificationDetailParams = [
      "candidate skill",
      "Candidate Skill",
      `Your ${candidateSkill.skill_name}${vendorText} has expired. Please update the skill details.`,
      moment().tz(process.env.TIMEZONE).unix(),
      moment().tz(process.env.TIMEZONE).unix(),
    ];

    const notification = await createNotifications(
      notificationDetailParams,
      candidateSkill.fk_user_id
    );
    notificationResources.push(notification);
  }
  return notificationResources;
};
