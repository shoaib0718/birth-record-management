const oracledb = require('oracledb');
const { getConnection } = require('../db/oracle-connection');

exports.getAllRecords = async (req, res) => {
  let conn;
  try {
    conn = await getConnection();

    const result = await conn.execute(`
      SELECT 
        br.BIRTHID,
        br.CHILDNAME,
        br.GENDER,
        p.FATHERNAME,
        p.MOTHERNAME,
        TO_CHAR(p.DATEOFBIRTH, 'YYYY-MM-DD') AS DOB,
        p.PHONENUMBER AS CONTACT,
        h.HOSPITALNAME,
        a.CITY,       
        c.COUNTRYNAME
      FROM BIRTHRECORD br
      JOIN PARENT p ON br.PARENTID = p.PARENTID
      JOIN HOSPITAL h ON br.HOSPITALID = h.HOSPITALID
      JOIN ADDRESS a ON br.ADDRESSID = a.ADDRESSID
      JOIN COUNTRY c ON a.COUNTRYID = c.COUNTRYID
      ORDER BY br.BIRTHID ASC
    `, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });

    res.json(result.rows);

  } catch (err) {
    console.error('getAllRecords error:', err);
    res.status(500).json({ error: 'Database error' });
  } finally {
    if (conn) await conn.close();
  }
};


exports.getRecordById = async (req, res) => {
  let conn;
  try {
    const birthId = req.params.id;
    conn = await getConnection();

    const result = await conn.execute(`
      SELECT
        b.BIRTHID,
        b.CHILDNAME,
        b.GENDER,
        p.FATHERNAME,
        p.MOTHERNAME,
        TO_CHAR(p.DATEOFBIRTH, 'YYYY-MM-DD') AS DOB,
        p.PHONENUMBER AS CONTACT,
        h.HOSPITALNAME,
        a.CITY,
        c.COUNTRYNAME AS COUNTRY
      FROM BIRTHRECORD b
      JOIN ADDRESS a ON b.ADDRESSID = a.ADDRESSID
      JOIN COUNTRY c ON a.COUNTRYID = c.COUNTRYID
      JOIN HOSPITAL h ON b.HOSPITALID = h.HOSPITALID
      JOIN PARENT p ON b.PARENTID = p.PARENTID
      WHERE b.BIRTHID = :id
    `, [birthId], { outFormat: oracledb.OUT_FORMAT_OBJECT });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    console.log('Record fetched:', result.rows[0]);

    res.json(result.rows[0]);

  } catch (err) {
    console.error('getRecordById error:', err);
    res.status(500).json({ error: 'Database error' });
  } finally {
    if (conn) await conn.close();
  }
};
exports.getBirthsByCity = async (req, res) => {
  let conn;
  try {
    const city = req.params.city;

    conn = await getConnection();

    const result = await conn.execute(
      `BEGIN sp_get_births_by_city(:city, :cursor); END;`,
      {
        city,
        cursor: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
      }
    );

    const resultSet = result.outBinds.cursor;
    const rows = await resultSet.getRows();  
    await resultSet.close();

    const mappedRows = rows.map(row => ({
      CHILDNAME: row[0],
      GENDER: row[1]
    }));

    res.json(mappedRows);

  } catch (err) {
    console.error('getBirthsByCity error:', err);
    res.status(500).json({ error: 'Error fetching data by city' });
  } finally {
    if (conn) await conn.close();
  }
};

exports.addRecord = async (req, res) => {
  let conn;
  try {
    const {
      childname,
      fathername,
      mothername,
      gender,
      dob,
      hospitalname,
      city,
      country,
      contact
    } = req.body;

    conn = await getConnection();

    //Insert Country
    let countryId;
    const countryResult = await conn.execute(
      `SELECT COUNTRYID FROM COUNTRY WHERE COUNTRYNAME = :name`,
      [country],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (countryResult.rows.length > 0) {
      countryId = countryResult.rows[0].COUNTRYID;
    } else {
      const countryInsert = await conn.execute(
        `INSERT INTO COUNTRY (COUNTRYID, COUNTRYNAME) VALUES (country_seq.NEXTVAL, :name) RETURNING COUNTRYID INTO :id`,
        { name: country, id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT } },
        { autoCommit: true }
      );
      countryId = countryInsert.outBinds.id[0];
    }

    // Insert Address
    const addressInsert = await conn.execute(
      `INSERT INTO ADDRESS (ADDRESSID, STREET, CITY, COUNTRYID) VALUES (address_seq.NEXTVAL, '-', :city, :countryId) RETURNING ADDRESSID INTO :id`,
      { city, countryId, id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT } },
      { autoCommit: true }
    );
    const addressId = addressInsert.outBinds.id[0];

    //Insert Hospital
    let hospitalId;
    const hospitalResult = await conn.execute(
      `SELECT HOSPITALID FROM HOSPITAL WHERE HOSPITALNAME = :name`,
      [hospitalname],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (hospitalResult.rows.length > 0) {
      hospitalId = hospitalResult.rows[0].HOSPITALID;
    } else {
      const hospitalInsert = await conn.execute(
        `INSERT INTO HOSPITAL (HOSPITALID, HOSPITALNAME) VALUES (hospital_seq.NEXTVAL, :name) RETURNING HOSPITALID INTO :id`,
        { name: hospitalname, id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT } },
        { autoCommit: true }
      );
      hospitalId = hospitalInsert.outBinds.id[0];
    }

    // Insert Parent
    const parentInsert = await conn.execute(
      `INSERT INTO PARENT (PARENTID, FATHERNAME, MOTHERNAME, DATEOFBIRTH, PHONENUMBER) VALUES (parent_seq.NEXTVAL, :fathername, :mothername, TO_DATE(:dob, 'YYYY-MM-DD'), :contact) RETURNING PARENTID INTO :id`,
      {
        fathername,
        mothername,
        dob,
        contact,
        id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
      },
      { autoCommit: true }
    );
    const parentId = parentInsert.outBinds.id[0];

    // Insert BirthRecord procedure
    await conn.execute(
      `BEGIN sp_insert_birthrecord(:childname, :gender, :addressid, :hospitalid, :parentid); END;`,
      { childname, gender, addressid: addressId, hospitalid: hospitalId, parentid: parentId },
      { autoCommit: true }
    );

    res.status(201).json({ message: 'Record inserted successfully' });

  } catch (err) {
    console.error('addRecord error:', err);
    res.status(500).json({ error: 'Insertion failed: ' + err.message });
  } finally {
    if (conn) await conn.close();
  }
};

exports.updateRecord = async (req, res) => {
  let conn;
  try {
    const birthId = req.params.id;
    const {
      childname,
      fathername,
      mothername,
      gender,
      dob,
      contact,
      hospitalname,
      city,
      country
    } = req.body;

    console.log('Request body:', req.body);

    conn = await getConnection();

    //Insert Country
    let countryId;
    const countryResult = await conn.execute(
      `SELECT COUNTRYID FROM COUNTRY WHERE COUNTRYNAME = :country`,
      [country],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (countryResult.rows.length > 0) {
      countryId = countryResult.rows[0].COUNTRYID;
    } else {
      const countryInsert = await conn.execute(
        `INSERT INTO COUNTRY (COUNTRYID, COUNTRYNAME) VALUES (country_seq.NEXTVAL, :name) RETURNING COUNTRYID INTO :id`,
        { name: country, id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT } },
        { autoCommit: true }
      );
      countryId = countryInsert.outBinds.id[0];
    }

    // Get AddressID from birth record
    const addressIdResult = await conn.execute(
      `SELECT ADDRESSID FROM BIRTHRECORD WHERE BIRTHID = :birthId`,
      [birthId],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (addressIdResult.rows.length === 0) {
      return res.status(404).json({ error: 'Birth record not found' });
    }

    const addressId = addressIdResult.rows[0].ADDRESSID;

    // Update address city and country
    await conn.execute(
      `UPDATE ADDRESS
       SET CITY = :city,
           COUNTRYID = :countryId
       WHERE ADDRESSID = :addressId`,
      { city, countryId, addressId },
      { autoCommit: true }
    );

    //Get HospitalID
    const hospitalResult = await conn.execute(
      `SELECT HOSPITALID FROM HOSPITAL WHERE HOSPITALNAME = :hospitalName`,
      [hospitalname],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (hospitalResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid Hospital Name' });
    }

    const hospitalId = hospitalResult.rows[0].HOSPITALID;

    //Get ParentID from birthrecord
    const birthRecordResult = await conn.execute(
      `SELECT PARENTID FROM BIRTHRECORD WHERE BIRTHID = :birthId`,
      [birthId],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (birthRecordResult.rows.length === 0) {
      return res.status(404).json({ error: 'Birth record not found' });
    }

    const parentId = birthRecordResult.rows[0].PARENTID;

    // Update Parent info
    await conn.execute(
      `UPDATE PARENT
       SET FATHERNAME = :fathername,
           MOTHERNAME = :mothername,
           DATEOFBIRTH = TO_DATE(:dob, 'YYYY-MM-DD'),
           PHONENUMBER = :contact
       WHERE PARENTID = :parentId`,
      { fathername, mothername, dob, contact, parentId },
      { autoCommit: true }
    );

    // Call stored procedure to update Birth Record
    await conn.execute(
      `BEGIN
        sp_update_birthrecord(
          :birthId, 
          :childname, 
          :gender, 
          :addressId, 
          :hospitalId, 
          :parentId, 
          :fathername, 
          :mothername, 
          TO_DATE(:dob, 'YYYY-MM-DD'), 
          :contact
        );
      END;`,
      {
        birthId,
        childname,
        gender,
        addressId,
        hospitalId,
        parentId,
        fathername,
        mothername,
        dob,
        contact
      },
      { autoCommit: true }
    );

    res.json({ message: 'Record updated successfully' });

  } catch (err) {
    console.error('updateRecord error:', err);
    res.status(500).json({ error: 'Update failed: ' + err.message });
  } finally {
    if (conn) await conn.close();
  }
};


exports.deleteRecord = async (req, res) => {
  let conn;
  try {
    const id = req.params.id;
    conn = await getConnection();

    await conn.execute(
      `BEGIN sp_delete_birthrecord(:id); END;`,
      [id],
      { autoCommit: true }
    );

    res.json({ message: 'Record deleted successfully' });

  } catch (err) {
    console.error('deleteRecord error:', err);
    res.status(500).json({ error: 'Delete failed' });
  } finally {
    if (conn) await conn.close();
  }
};
