const {
  query,
  startTransaction,
  commitTransaction,
  rollbackTransaction,
} = require("./dbConnection");
const moment = require("moment-timezone");
const { insertNotificationResources } = require("./utils");

module.exports.timesheetNotification = async () => {
  try {
    await startTransaction();

    const starting = moment()
      .tz(process.env.TIMEZONE)
      .subtract(1, "hour")
      .unix();
    const ending = moment().tz(process.env.TIMEZONE).unix();

    const orders = await getOrdersWithinTimeFrame(starting, ending);
    const orderIds = orders.map((order) => order.id);

    if (orderIds.length === 0) return await commitTransaction(); // Exit early if no orders found

    const orderTimesheets = await getOrderTimesheets(orderIds);
    const orderTimesheetIds = orderTimesheets.map(
      (timesheet) => timesheet.fk_order_id
    );

    const filteredOrders = orders.filter(
      (order) => !orderTimesheetIds.includes(order.id)
    );
    const candidateIds = filteredOrders.map(
      (order) => order.candidate_assigned
    );

    if (candidateIds.length === 0) return await commitTransaction(); // Exit early if no candidates found

    const preferenceCandidateIds = await getCandidateNotificationPreferences(
      candidateIds
    );

    const finalOrders = filteredOrders.filter((order) =>
      preferenceCandidateIds.includes(order.candidate_assigned)
    );

    if (finalOrders.length) {
      await createNotifications(finalOrders);
    }

    await commitTransaction();
  } catch (err) {
    await rollbackTransaction();
    console.error("Error executing query:", err);
  }
};

// Helper functions

const getOrdersWithinTimeFrame = async (starting, ending) => {
  return await query(
    `SELECT id, candidate_assigned FROM orders 
     WHERE shiftEnding >= ? AND shiftEnding <= ? AND status = ?`,
    [starting, ending, "Confirmed"]
  );
};

const getOrderTimesheets = async (orderIds) => {
  const placeholders = orderIds.map(() => "?").join(",");
  return await query(
    `SELECT fk_order_id FROM candidate_time_sheets WHERE fk_order_id IN (${placeholders})`,
    orderIds
  );
};

const getCandidateNotificationPreferences = async (candidateIds) => {
  const placeholders = candidateIds.map(() => "?").join(",");
  const preferences = await query(
    `SELECT fk_candidate_id FROM candidate_notification_preferences 
     WHERE fk_candidate_id IN (${placeholders}) AND timesheetCreation = true`,
    candidateIds
  );
  return preferences.map((pref) => pref.fk_candidate_id);
};

const createNotifications = async (orders) => {
  const details = orders.map((order) => ({
    title: "Timesheet Creation",
    type: "Timesheet Creation",
    description: `Please fill up the timesheet for order id: ${order.id}.`,
    createdAt: moment().tz(process.env.TIMEZONE).unix(),
    updatedAt: moment().tz(process.env.TIMEZONE).unix(),
  }));

  const notificationDetails = await insertNotificationDetails(details);
  const insertedDetails = await fetchInsertedDetails(
    notificationDetails.insertId,
    notificationDetails.affectedRows
  );

  const notificationResources = buildNotificationResources(
    insertedDetails,
    orders
  );

  await insertNotificationResources(notificationResources);
};

const insertNotificationDetails = async (details) => {
  const values = [];
  const placeholders = details
    .map((detail) => {
      values.push(
        detail.title,
        detail.type,
        detail.description,
        detail.createdAt,
        detail.updatedAt
      );
      return "(?, ?, ?, ?, ?)";
    })
    .join(", ");

  const queryText = `
    INSERT INTO notification_details (title, type, description, createdAt, updatedAt)
    VALUES ${placeholders}`;

  return await query(queryText, values);
};

const fetchInsertedDetails = async (firstInsertId, affectedRows) => {
  const lastInsertId = firstInsertId + affectedRows - 1;
  const queryText = `
    SELECT * FROM notification_details
    WHERE id BETWEEN ? AND ?`;

  return await query(queryText, [firstInsertId, lastInsertId]);
};

const buildNotificationResources = (insertedDetails, orders) => {
  return insertedDetails
    .map((detail) => {
      const orderIdMatch = detail.description.match(/\d+/);
      if (!orderIdMatch) return null;
      const orderId = parseInt(orderIdMatch[0], 10);
      const selectedOrder = orders.find((order) => order.id === orderId);

      return {
        fk_user_id: selectedOrder.candidate_assigned,
        fk_notification_detail: detail.id,
        createdAt: moment().tz(process.env.TIMEZONE).unix(),
        updatedAt: moment().tz(process.env.TIMEZONE).unix(),
      };
    })
    .filter((resource) => resource !== null);
};
