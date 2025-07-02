const { getConnection } = require('../db/oracle-connection');

exports.registerUser = async (req, res) => {
  const { firstName, lastName, email, password, dob, contact, city } = req.body;

  try {
    const connection = await getConnection();

    const result = await connection.execute(`SELECT user_seq.NEXTVAL AS ID FROM dual`);
    const newId = result.rows[0].ID;

    console.log('Generated new user ID:', newId);

    // Insert new user
    await connection.execute(
      `INSERT INTO USERS (ID, FIRST_NAME, LAST_NAME, EMAIL, PASSWORD, DOB, CONTACT, CITY)
       VALUES (:id, :firstName, :lastName, :email, :password, TO_DATE(:dob, 'YYYY-MM-DD'), :contact, :city)`,
      {
        id: newId,
        firstName,
        lastName,
        email,
        password,
        dob,
        contact,
        city
      },
      { autoCommit: true }
    );

    await connection.close();
    res.status(200).send('User registered successfully');

  } catch (err) {
    console.error('Register Error:', err);
    res.status(500).send('Registration failed: ' + err.message);
  }
};

exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const connection = await getConnection();

    const result = await connection.execute(
      `SELECT * FROM USERS WHERE EMAIL = :email AND PASSWORD = :password`,
      { email, password }
    );

    await connection.close();

    if (result.rows.length > 0) {
      res.status(200).send('Login successful');
    } else {
      res.status(401).send('Invalid email or password');
    }
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).send('Login failed');
  }
};
