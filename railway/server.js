require('dotenv').config();  // Load environment variables from .env file

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

// ========== LOAD CONFIGURATION FROM .env ==========
const PORT = process.env.PORT || 3000;

// Database configuration from .env file
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,  // This will be read from .env
    database: process.env.DB_NAME || 'railway_ed_system',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
};

let pool;

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: false, // Allow inline scripts for this demo
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.use(morgan('combined'));

// Rate limiting to prevent abuse
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Check if password is configured
if (!process.env.DB_PASSWORD || process.env.DB_PASSWORD === 'YOUR_MYSQL_PASSWORD_HERE') {
    console.error('\n❌ ERROR: MySQL password not configured in .env file!');
    console.error('   Please edit the .env file and set your MySQL password.\n');
    console.error('   Steps:');
    console.error('   1. Open .env file in a text editor');
    console.error('   2. Replace YOUR_MYSQL_PASSWORD_HERE with your actual MySQL password');
    console.error('   3. Save the file and restart the server\n');
    process.exit(1);
}

// Initialize database connection and create tables
async function initDatabase() {
    try {
        console.log('📡 Attempting to connect to MySQL...');
        console.log(`   Host: ${dbConfig.host}`);
        console.log(`   User: ${dbConfig.user}`);
        console.log(`   Database: ${dbConfig.database}`);
        
        // Create initial connection without database
        const connection = await mysql.createConnection({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password,
            port: dbConfig.port
        });
        
        console.log('✅ Connected to MySQL server');
        
        // Create database if not exists
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
        console.log(`✅ Database '${dbConfig.database}' ready`);
        await connection.end();
        
        // Create connection pool
        pool = mysql.createPool(dbConfig);
        
        // Create tables
        console.log('📋 Creating tables...');
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                empid INT PRIMARY KEY,
                password VARCHAR(255) NOT NULL,
                name VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS departments (
                deptno VARCHAR(5) PRIMARY KEY,
                deptdesc VARCHAR(50),
                arpan VARCHAR(10),
                status INT DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ed_codes (
                code VARCHAR(20) PRIMARY KEY,
                long_desc TEXT,
                short_desc VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS dept_ed_mapping (
                id INT AUTO_INCREMENT PRIMARY KEY,
                deptno VARCHAR(5),
                edcode VARCHAR(20),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (deptno) REFERENCES departments(deptno) ON DELETE CASCADE,
                FOREIGN KEY (edcode) REFERENCES ed_codes(code) ON DELETE CASCADE,
                UNIQUE KEY unique_mapping (deptno, edcode)
            )
        `);
        
        console.log('✅ Tables created/verified');
        
        // Insert sample data if tables are empty
        console.log('📊 Checking sample data...');
        
        const [users] = await pool.query('SELECT COUNT(*) as cnt FROM users');
        if (users[0].cnt === 0) {
            // Using bcrypt for password hashing (more secure)
            const hashedPassword = await bcrypt.hash('123', 10);
            await pool.query("INSERT INTO users (empid, password, name) VALUES (101, ?, 'Admin User')", [hashedPassword]);
            console.log('   ✅ Sample user created (ID: 101, Password: 123)');
        }
        
        const [depts] = await pool.query('SELECT COUNT(*) as cnt FROM departments');
        if (depts[0].cnt === 0) {
            const departments = [
                ['01', 'ACCOUNTS', 'ACC'], ['02', 'AUDIT', 'ADT'], ['03', 'GEN. ADMN.', 'ADM'],
                ['04', 'COMMERCIAL', 'COM'], ['05', 'ENGINEERING', 'ENG'], ['06', 'ELECTRICAL', 'ELE'],
                ['07', 'MECHANICAL', 'MEC'], ['08', 'MEDICAL', 'MED'], ['09', 'OPERATING', 'OPT'],
                ['10', 'PERSONNEL', 'PER'], ['11', 'SnT', 'SNT'], ['12', 'STORES', 'STR'], 
                ['13', 'SECURITY', 'SEC']
            ];
            for (const dept of departments) {
                await pool.query('INSERT INTO departments (deptno, deptdesc, arpan) VALUES (?, ?, ?)', dept);
            }
            console.log(`   ✅ ${departments.length} departments created`);
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
            
            // Batch insert for better performance
            for (const ed of ed_codes) {
                await pool.query('INSERT INTO ed_codes (code, long_desc, short_desc) VALUES (?, ?, ?)', ed);
            }
            console.log(`   ✅ ${ed_codes.length} ED codes created`);
        }
        
        const [mapping] = await pool.query('SELECT COUNT(*) as cnt FROM dept_ed_mapping');
        if (mapping[0].cnt === 0) {
            const mappings = [
                ['01', 'E0101'], ['01', 'EP001'], ['01', 'E0B02F'], ['01', 'E0B03F'],
                ['02', 'EB010'], ['02', 'E0101'],
                ['03', 'EW130'], ['03', 'EW700'],
                ['04', 'EW400'], ['04', 'EW600'],
                ['05', 'EW310'], ['05', 'EW860'], ['05', 'EW870'], ['05', 'EW920'],
                ['06', 'EW720'],
                ['07', 'EW500'], ['07', 'EW310'],
                ['08', 'EW200'], ['08', 'EM100'],
                ['09', 'EW340'], ['09', 'EW380'],
                ['10', 'EP001'], ['10', 'EB010'],
                ['11', 'EW720'],
                ['12', 'EW600'],
                ['13', 'EW340'], ['13', 'EW380']
            ];
            for (const map of mappings) {
                await pool.query('INSERT INTO dept_ed_mapping (deptno, edcode) VALUES (?, ?)', map);
            }
            console.log(`   ✅ ${mappings.length} department-ED mappings created`);
        }
        
        console.log('\n✅ MySQL database connected and initialized successfully!');
        return true;
    } catch (error) {
        console.error('\n❌ Database initialization failed:', error.message);
        console.log('\n⚠️  Please check:');
        console.log('   1. MySQL server is running');
        console.log('   2. The password in .env file is correct');
        console.log('   3. MySQL port (3306) is accessible');
        console.log('   4. The MySQL user has CREATE DATABASE permission\n');
        return false;
    }
}

// ========== API ROUTES ==========

// Login endpoint (with bcrypt password verification)
app.post('/api/login', async (req, res) => {
    try {
        const { empid, password } = req.body;
        
        if (!pool) {
            // Fallback for demo mode
            if (empid == 101 && password == '123') {
                return res.json({ success: true, valid: true });
            }
            return res.json({ success: true, valid: false });
        }
        
        const [rows] = await pool.query('SELECT * FROM users WHERE empid = ?', [empid]);
        
        if (rows.length === 0) {
            return res.json({ success: true, valid: false });
        }
        
        const user = rows[0];
        const isValid = await bcrypt.compare(password, user.password);
        
        res.json({ success: true, valid: isValid });
    } catch (error) {
        console.error('Login error:', error);
        res.json({ success: false, error: error.message });
    }
});

// Get all departments
app.get('/api/departments', async (req, res) => {
    try {
        if (!pool) {
            // Return demo data if no database
            return res.json({ 
                success: true, 
                data: [
                    { deptno: '01', deptdesc: 'ACCOUNTS', arpan: 'ACC', status: 1 },
                    { deptno: '02', deptdesc: 'AUDIT', arpan: 'ADT', status: 1 },
                    { deptno: '03', deptdesc: 'GEN. ADMN.', arpan: 'ADM', status: 1 },
                ]
            });
        }
        
        const [rows] = await pool.query('SELECT deptno, deptdesc, arpan, status FROM departments WHERE status = 1 ORDER BY deptno');
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching departments:', error);
        res.json({ success: false, error: error.message });
    }
});

// Get all ED codes
app.get('/api/edcodes', async (req, res) => {
    try {
        const { deptno, search } = req.query;
        
        if (!pool) {
            return res.json({ success: true, data: [] });
        }
        
        let query = 'SELECT code, long_desc as long, short_desc as short FROM ed_codes';
        let params = [];
        
        if (deptno) {
            query = `
                SELECT e.code, e.long_desc as long, e.short_desc as short 
                FROM ed_codes e
                INNER JOIN dept_ed_mapping m ON e.code = m.edcode
                WHERE m.deptno = ?
            `;
            params.push(deptno);
        }
        
        if (search) {
            query += deptno ? ' AND' : ' WHERE';
            query += ' (code LIKE ? OR long_desc LIKE ? OR short_desc LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }
        
        query += ' ORDER BY code LIMIT 500';
        
        const [rows] = await pool.query(query, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching ED codes:', error);
        res.json({ success: false, error: error.message });
    }
});

// Get department-ED mapping
app.get('/api/mapping', async (req, res) => {
    try {
        if (!pool) {
            return res.json({ success: true, data: [] });
        }
        
        const [rows] = await pool.query('SELECT deptno, edcode FROM dept_ed_mapping');
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching mapping:', error);
        res.json({ success: false, error: error.message });
    }
});

// Get ED codes for a specific department
app.get('/api/department/:deptno/edcodes', async (req, res) => {
    try {
        if (!pool) {
            return res.json({ success: true, data: [] });
        }
        
        const [rows] = await pool.query(`
            SELECT e.code, e.long_desc as long, e.short_desc as short
            FROM ed_codes e
            INNER JOIN dept_ed_mapping m ON e.code = m.edcode
            WHERE m.deptno = ?
            ORDER BY e.code
        `, [req.params.deptno]);
        
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching department ED codes:', error);
        res.json({ success: false, error: error.message });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        database: pool ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// Serve the HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
async function startServer() {
    const dbInitialized = await initDatabase();
    
    if (!dbInitialized) {
        console.log('\n⚠️  Starting server in DEMO mode without database connection...');
        console.log('   Some features may be limited.\n');
    }
    
    app.listen(PORT, () => {
        console.log(`\n🚀 Server running at http://localhost:${PORT}`);
        console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`   Database: ${dbInitialized ? 'Connected ✅' : 'Demo Mode ⚠️'}`);
        console.log('\n📝 Default login credentials:');
        console.log('   Employee ID: 101');
        console.log('   Password: 123\n');
    });
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n\n🛑 Shutting down gracefully...');
    if (pool) {
        await pool.end();
        console.log('✅ Database connections closed');
    }
    process.exit(0);
});

startServer();