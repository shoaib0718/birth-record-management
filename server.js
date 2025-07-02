
const express = require('express');
const oracledb = require('oracledb');
const cors = require('cors');
const path = require('path');
const PORT = process.env.PORT || 3000;


const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Oracle DB for controllers
const dbConfig = {
  user: "shoaib",
  password: "1234",
  connectString: "localhost:1521/XE"
};
app.locals.dbConfig = dbConfig;

// Routes
const recordsRoutes = require('./routes/records');
app.use('/api/records', recordsRoutes);
const usersRoutes = require('./routes/users');
app.use('/api/users', usersRoutes);
const recordsRouter = require('./routes/records');


// Start server
const { initialize } = require('./db/oracle-connection');

initialize()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('Failed to initialize DB pool', err);
    process.exit(1);
  });
