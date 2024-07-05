const { query } = require("./dbConnection");

const moment = require("moment-timezone");

const createNotifications = async (notificationDetailParams, fk_user_id) => {
  const notificationDetailSql = `
        INSERT INTO notification_details (title, type, description, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?)
      `;

  const notificationDetailResult = await query(
    notificationDetailSql,
    notificationDetailParams
  );
  const notificationDetailId = notificationDetailResult.insertId;

  return {
    fk_user_id: fk_user_id,
    fk_notification_detail: notificationDetailId,
    createdAt: moment().unix(),
    updatedAt: moment().unix(),
  };
};

const insertNotificationResources = async (notificationResources) => {
  const values = [];
  const placeholders = notificationResources
    .map((resource) => {
      values.push(
        resource.fk_user_id,
        resource.fk_notification_detail,
        resource.createdAt,
        resource.updatedAt
      );
      return "(?, ?, ?, ?)";
    })
    .join(", ");

  const queryText = `
        INSERT INTO notifications (fk_user_id, fk_notification_detail, createdAt, updatedAt)
        VALUES ${placeholders}
      `;
  await query(queryText, values);
};

const getToday = () => moment().tz(process.env.TIMEZONE).startOf("day").unix();

module.exports = {
  createNotifications,
  insertNotificationResources,
  getToday,
};
