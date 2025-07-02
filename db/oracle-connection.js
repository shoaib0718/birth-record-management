const oracledb = require('oracledb');


oracledb.initOracleClient({ libDir: 'C:\\Users\\User\\Desktop\\Coracleinstantclient_19_26\\instantclient_19_26' });


const dbConfig = {
  user: 'shoaib',
  password: '1234',
  connectString: 'localhost:1521/XE',
  poolMin: 2,
  poolMax: 10,
  poolIncrement: 1,
};

let pool;

async function initialize() {
  try {
    pool = await oracledb.createPool(dbConfig);
    console.log('Oracle DB connection pool created');
  } catch (err) {
    console.error('Error creating Oracle DB pool:', err);
    throw err;
  }
}

async function closePool() {
  try {
    await pool.close(10); // 10 seconds to wait before force close
    console.log('Oracle DB connection pool closed');
  } catch (err) {
    console.error('Error closing Oracle DB pool:', err);
  }
}

async function getConnection() {
  if (!pool) {
    await initialize();
  }
  return await pool.getConnection();
}

module.exports = {
  getConnection,
  initialize,
  closePool,
};
