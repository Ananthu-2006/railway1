const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// ========== MYSQL CONFIGURATION - ENTER YOUR CREDENTIALS HERE ==========
const dbConfig = {
    host: 'localhost',        // Your MySQL host
    user: 'root',             // Your MySQL username
    password: '',  // ⬅️ ENTER YOUR MYSQL PASSWORD HERE
    database: 'railway_ed_system',
    waitForConnections: true,
    connectionLimit: 10
};

let pool;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Initialize database connection and create tables
async function initDatabase() {
    try {
        // Create initial connection without database
        const connection = await mysql.createConnection({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password
        });

        // Create database if not exists
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
        await connection.end();

        // Create connection pool
        pool = mysql.createPool(dbConfig);

        // Create tables
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                empid INT PRIMARY KEY,
                password VARCHAR(255) NOT NULL,
                name VARCHAR(100)
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS departments (
                deptno VARCHAR(5) PRIMARY KEY,
                deptdesc VARCHAR(50),
                arpan VARCHAR(10),
                status INT DEFAULT 1
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS ed_codes (
                code VARCHAR(20) PRIMARY KEY,
                long_desc TEXT,
                short_desc VARCHAR(50)
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS dept_ed_mapping (
                id INT AUTO_INCREMENT PRIMARY KEY,
                deptno VARCHAR(5),
                edcode VARCHAR(20),
                FOREIGN KEY (deptno) REFERENCES departments(deptno),
                FOREIGN KEY (edcode) REFERENCES ed_codes(code)
            )
        `);

        // Insert sample data if tables are empty
        const [users] = await pool.query('SELECT COUNT(*) as cnt FROM users');
        if (users[0].cnt === 0) {
            await pool.query("INSERT INTO users (empid, password, name) VALUES (101, '123', 'Admin User')");
        }

        const [depts] = await pool.query('SELECT COUNT(*) as cnt FROM departments');
        if (depts[0].cnt === 0) {
            const departments = [
                ['01', 'ACCOUNTS', 'ACC'], ['02', 'AUDIT', 'ADT'], ['03', 'GEN. ADMN.', 'ADM'],
                ['04', 'COMMERCIAL', 'COM'], ['05', 'ENGINEERING', 'ENG'], ['06', 'ELECTRICAL', 'ELE'],
                ['07', 'MECHANICAL', 'MEC'], ['08', 'MEDICAL', 'MED'], ['09', 'OPERATING', 'OPT'],
                ['10', 'PERSONNEL', 'PER'], ['11', 'SnT', 'SNT'], ['12', 'STORES', 'STR'], ['13', 'SECURITY', 'SEC']
            ];
            for (const dept of departments) {
                await pool.query('INSERT INTO departments (deptno, deptdesc, arpan) VALUES (?, ?, ?)', dept);
            }
        }

        const [edCodes] = await pool.query('SELECT COUNT(*) as cnt FROM ed_codes');
        if (edCodes[0].cnt === 0) {
            const ed_codes = [
                ['EW680', 'REMOTE LOCALITY ALLOWANCE', 'RLA'],
                ['EW70A', 'ARREARS OF SUMPTUARY ALLOWANCE', 'AR.SUM-ALL'],
                ['EWE10', 'NIGHT DUTY ALLOWANCE - INTERMITTENT', 'NDA-INTR'],
                ['EM2220', 'NEWS MAGAZINE-MTK', 'NEWSMAG'],
                ['E0211', 'PROV-CCA', 'PROV-CCA'],
                ['EWT810', 'RE-SPECIAL (DUTY) ALLOWANCE', 'RE-SDA'],
                ['EM122', 'REFUND COMMERCIAL DEBIT', 'REF COMRL-DEBIT'],
                ['EM005', 'GALANTRY AWARD', 'GALANTRY AWARD'],
                ['EW114', 'MELA ALLOWANCE', 'MELA-ALL'],
                ['EM101', 'REFUND OF REC.OF HOSP. DIET', 'RF HOS-DIET'],
                ['EP001', 'NPST-GOV', 'NPST-GOV'],
                ['EM062', 'REIMB-SOAP TOILET', 'REIMB-SOAP TOILET'],
                ['E0101', 'SUSP. PAY', 'SUSP. PAY'],
                ['EHS004', 'REFUND CENTRAL GOVT. HEALTH SCHEME.', 'REFUND CGHS'],
                ['EW11A', 'WASHING ALLOWANCE GENERAL ARREARS', 'AR W/AL'],
                ['EW12A', 'ARREAR LAUNDRY ALLOWANCE', 'AR-LAUNDRY-AL'],
                ['EW130', 'UNIFORM ALLOWANCE', 'UNIFORM-AL'],
                ['EW150', 'BAD CLIMATE ALLOWANCE', 'BCA'],
                ['EW200', 'NURSING ALLOWANCE', 'NURSING-AL'],
                ['EW250', 'POST GRADUATE ALLOWANCE', 'PG-ALLOW'],
                ['EW260', 'RESEARCH /ANNUAL ALLOWANCE', 'RESEARCH AL'],
                ['EW270', 'OFFICIATING ALLOWANCE/ NON-RUNNING', 'OFF-ALL(NR)'],
                ['EW280', 'OFFICIATING ALLOWANCE/RUNNING', 'OFF-ALL'],
                ['EW310', 'BREAKDOWN ALLOWANCE', 'BDA'],
                ['EW340', 'PARADE ALLOW.', 'PARADE ALL'],
                ['EW380', 'ISLAND ALLOW.', 'ISLAND ALL.'],
                ['EW400', 'MATCHING ALLOW.', 'MATC-ALL'],
                ['EW430', 'ANIMAL ALLOW.', 'ANIMAL ALL'],
                ['EW451', 'ACADEMIC ALLOWANCE', 'ACDMIC'],
                ['EW480', 'OUT-TURN ALLOW.', 'OUTTURN ALL'],
                ['EW500', 'KIT MAINTENANCE ALLOWANCE', 'KMT ALL'],
                ['EW510', 'ANNUAL ALLOWANCE', 'ANNL ALL'],
                ['EW530', 'PHYSIOTHERAPY ALLOWANCE', 'PHYSIO ALL'],
                ['EW540', 'OPERATION THEATRE ALLOWANCE', 'OP TH ALL'],
                ['EW550', 'HOSPITAL PATIENT CARE ALLOWANCE', 'HPTC-ALL'],
                ['EW560', 'PATIENT CARE ALLOWANCE', 'PTC-ALL'],
                ['EW570', 'LIBRARY ALLOWANCE', 'LIBALL'],
                ['EW600', 'RATION MONEY ALLOWANCE', 'R-M-ALL'],
                ['EW660', 'STITCHING ALLOWANCE', 'STITCH-ALL'],
                ['EW670', 'CAMP ALLOWANCE', 'CAMP-ALL'],
                ['EW700', 'SUMPTUARY ALLOWANCE', 'SUMPT. ALL'],
                ['EW720', 'MACHINE ALLOW.', 'MACHINE ALL.'],
                ['EW860', 'TOUGH LOCATION ALLOWANCE-II', 'TLA-II'],
                ['EW870', 'TOUGH LOCATION ALLOWANCE-III', 'TLA-III'],
                ['EW920', 'EXTRA WORK ALLOWANCE', 'EXTRA WORK ALL'],
                ['EW950', 'RISK AND HARDSHIP ALLOWANCE FOR TRACK MAINTAINERS', 'RISK ALL(TM)'],
                ['EW960', 'DRESS ALLOWANCE -ANNUAL', 'DRESS AL ANNUAL'],
                ['EW970', 'SPECIAL ALL CHILDCARE WOMEN H/CAP', 'SA-CCARE(WH)'],
                ['EW980', 'HEALTH AND MALARIA ALLOWANCE', 'HMA'],
                ['EW990', 'TROLLEY BAG ALLOWANCE(RUNNING)', 'TROLLEY BAG AL(R)'],
                ['EM014', 'HOSTEL SUBSIDY', 'HSTL SUB'],
                ['EM026', 'REIMBURSEMENT OF WATER BOTTLE', 'RE WATER BOTTLE'],
                ['EM100', 'MEDICAL REIMBURSEMENT', 'MED-REIM.'],
                ['EM159', 'BOX ALLOWANCE', 'BOX ALL'],
                ['EM500', 'FIXED TRANSPORT ALLOWANCE FOR RE-ENGAGED STAFF', 'TPT-RE-ENGAGED'],
                ['EMS001', 'MEDICAL REIMBURSEMENT RB', 'MED-REIM.RB'],
                ['EMS016', 'CHILDREN EDUCATION ALLOWANCE-RB', 'CH.EDU-ALL-RB'],
                ['EB010', 'PRODUCTIVITY LINKED BONUS', 'PLB'],
                ['EB030', 'HONORARIUM', 'HONORARIUM'],
                ['EA005', 'MOTOR CYCLE/SCOOTER ADVANCE', 'MOTORCYCLE ADV'],
                ['EA006', 'CYCLE ADVANCE', 'CYCLE ADV']
            ];
            for (const ed of ed_codes) {
                await pool.query('INSERT INTO ed_codes (code, long_desc, short_desc) VALUES (?, ?, ?)', ed);
            }
        }

        const [mapping] = await pool.query('SELECT COUNT(*) as cnt FROM dept_ed_mapping');
        if (mapping[0].cnt === 0) {
            // Sample mapping - you can expand this
            const mappings = [
                ['01', 'E0101'], ['01', 'EP001'], ['02', 'EB010'], ['03', 'EW130'],
                ['05', 'EW310'], ['08', 'EW200'], ['08', 'EM100'], ['10', 'EP001']
            ];
            for (const map of mappings) {
                await pool.query('INSERT INTO dept_ed_mapping (deptno, edcode) VALUES (?, ?)', map);
            }
        }

        console.log('✅ MySQL database connected and initialized');
        return true;
    } catch (error) {
        console.error('❌ Database initialization failed:', error.message);
        console.log('\n⚠️  Please check:');
        console.log('   1. MySQL server is running');
        console.log('   2. Username and password are correct in dbConfig');
        console.log('   3. MySQL port (3306) is accessible\n');
        return false;
    }
}

// API Routes
app.post('/api/login', async (req, res) => {
    try {
        const { empid, password } = req.body;
        const [rows] = await pool.query('SELECT * FROM users WHERE empid = ? AND password = ?', [empid, password]);
        res.json({ success: true, valid: rows.length > 0 });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

app.get('/api/departments', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT deptno, deptdesc, arpan, status FROM departments WHERE status = 1');
        res.json({ success: true, data: rows });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

app.get('/api/edcodes', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT code, long_desc as long, short_desc as short FROM ed_codes');
        res.json({ success: true, data: rows });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

app.get('/api/mapping', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT deptno, edcode FROM dept_ed_mapping');
        res.json({ success: true, data: rows });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Serve the HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
async function startServer() {
    const dbInitialized = await initDatabase();
    if (!dbInitialized) {
        console.log('\n⚠️  Starting server without database connection...');
        console.log('   The app will use fallback demo data.\n');
    }

    app.listen(PORT, () => {
        console.log(`\n🚀 Server running at http://localhost:${PORT}`);
        console.log('   Default login: Employee ID: 101, Password: 123\n');
    });
}

startServer();