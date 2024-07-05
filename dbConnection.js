const mysql = require("mysql2/promise");
let connection;

async function getConnection() {
  if (!connection) {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER_NAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DATABASE_NAME,
    });
    console.log("New DB connection established");
  } else {
    console.log("Using existing DB connection");
  }

  console.log(`process.env.DB_HOST: `, process.env.DB_HOST);

  return connection;
}

async function query(sql, params, type = "execute") {
  const conn = await getConnection();
  if (type === "execute") {
    const [results] = await conn.execute(sql, params);
    return results;
  } else {
    return await conn.query(sql, params);
  }
}

const startTransaction = async () => {
  await query(`START TRANSACTION`, {}, "query");
};

const commitTransaction = async () => {
  await query(`COMMIT`, {}, "query");
};

const rollbackTransaction = async () => {
  await query(`ROLLBACK`, {}, "query");
};

module.exports = {
  query,
  startTransaction,
  commitTransaction,
  rollbackTransaction,
};
