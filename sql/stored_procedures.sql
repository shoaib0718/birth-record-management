Procedures
CREATE OR REPLACE PROCEDURE sp_update_birthrecord (
    p_birthid IN NUMBER,
    p_childname IN VARCHAR2,
    p_gender IN VARCHAR2,
    p_addressid IN NUMBER,
    p_hospitalid IN NUMBER,
    p_parentid IN NUMBER,
    p_fathername IN VARCHAR2,
    p_mothername IN VARCHAR2,
    p_dob IN DATE,
    p_contact IN VARCHAR2
) AS
BEGIN
    UPDATE BIRTHRECORD
    SET
        CHILDNAME = p_childname,
        GENDER = p_gender,
        ADDRESSID = p_addressid,
        HOSPITALID = p_hospitalid,
        PARENTID = p_parentid
    WHERE BIRTHID = p_birthid;

    UPDATE PARENT
    SET
        FATHERNAME = p_fathername,
        MOTHERNAME = p_mothername,
        DATEOFBIRTH = p_dob,
        PHONENUMBER = p_contact
    WHERE PARENTID = p_parentid;
END;
/
CREATE OR REPLACE PROCEDURE sp_delete_birthrecord(p_id IN NUMBER) AS
  dummy NUMBER;
BEGIN
  SELECT 1 INTO dummy FROM BIRTHRECORD WHERE BIRTHID = p_id FOR UPDATE;

  DELETE FROM BIRTHRECORD WHERE BIRTHID = p_id;

  COMMIT;
EXCEPTION
  WHEN NO_DATA_FOUND THEN

    RAISE_APPLICATION_ERROR(-20001, 'Record not found for deletion');
  WHEN OTHERS THEN
    ROLLBACK;
    RAISE;
END;
/
CREATE OR REPLACE PROCEDURE sp_insert_birthrecord (
    p_childname IN VARCHAR2,
    p_gender IN VARCHAR2,
    p_addressid IN NUMBER,
    p_hospitalid IN NUMBER,
    p_parentid IN NUMBER
) AS
BEGIN
    INSERT INTO BIRTHRECORD (
        BIRTHID,
        CHILDNAME,
        GENDER,
        ADDRESSID,
        HOSPITALID,
        PARENTID
    ) VALUES (
        birth_seq.NEXTVAL,
        p_childname,
        p_gender,
        p_addressid,
        p_hospitalid,
        p_parentid
    );
EXCEPTION
    WHEN OTHERS THEN
        RAISE_APPLICATION_ERROR(-20001, 'Error inserting birth record: ' || SQLERRM);
END;
/
Trigger
CREATE OR REPLACE TRIGGER trg_birth_insert_log
AFTER INSERT ON BIRTHRECORD
FOR EACH ROW
BEGIN
  INSERT INTO BIRTH_LOG (LOGID, BIRTHID, ACTION_DATE, ACTION_TYPE)
  VALUES (birth_log_seq.NEXTVAL, :NEW.BIRTHID, SYSDATE, 'INSERT');
END;
/
//cursor
CREATE OR REPLACE PROCEDURE sp_get_births_by_city (
    p_city IN VARCHAR2,
    p_result OUT SYS_REFCURSOR
) AS
BEGIN
    OPEN p_result FOR
        SELECT CHILDNAME, GENDER
        FROM BIRTHRECORD br
        JOIN ADDRESS a ON br.ADDRESSID = a.ADDRESSID
        WHERE a.CITY = p_city;
END;
sequences
CREATE SEQUENCE birth_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE birth_log_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE country_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE address_seq START WITH 1 INCREMENT BY 1;

