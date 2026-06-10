USE railway;


CREATE TABLE DEPARTMENT (
    DEPTNO VARCHAR(2) PRIMARY KEY,
    DEPTDESC VARCHAR(50) NOT NULL,
    ARPAN_DEPT VARCHAR(10),
    STATUSFLG INT DEFAULT 1
    );



INSERT INTO DEPARTMENT (DEPTNO, DEPTDESC, ARPAN_DEPT, STATUSFLG) VALUES
('99', 'NA', 'NA', 0),
('20', 'RRB', 'RRB', 0),
('45', 'Gati Shakti/Construction', '', 1),
('01', 'ACCOUNTS', 'ACC', 1),
('02', 'AUDIT', 'ADT', 1),
('03', 'GEN. ADMN.', 'ADM', 1),
('04', 'COMMERCIAL', 'COM', 1),
('05', 'ENGINEERING', 'ENG', 1),
('06', 'ELECTRICAL', 'ELE', 1),
('07', 'MECHANICAL', 'MEC', 1),
('08', 'MEDICAL', 'MED', 1),
('09', 'OPERATING', 'OPT', 1),
('10', 'PERSONNEL', 'PER', 1),
('11', 'SnT', 'SNT', 1),
('12', 'STORES', 'STR', 1),
('13', 'SECURITY', 'SEC', 1),
('14', 'RCT', 'RCT', 0),
('15', 'RLY BOARD', 'OTH', 0);