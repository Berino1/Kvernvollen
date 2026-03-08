import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("narcotics.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS pockets (
    id INTEGER PRIMARY KEY,
    medicine_name TEXT DEFAULT '',
    strength REAL DEFAULT 0,
    current_stock INTEGER DEFAULT 0,
    unit TEXT DEFAULT 'stk'
  );

  CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    room TEXT,
    ln TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL COLLATE NOCASE,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'Helsefagarbeider'
  );

  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pocket_id INTEGER,
    patient_id INTEGER,
    user_name TEXT NOT NULL,
    witness_name TEXT NOT NULL,
    amount REAL NOT NULL,
    type TEXT CHECK(type IN ('withdrawal', 'restock')) NOT NULL,
    medicine_name TEXT,
    strength REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    signature TEXT,
    FOREIGN KEY(pocket_id) REFERENCES pockets(id),
    FOREIGN KEY(patient_id) REFERENCES patients(id)
  );
`);

// Migration: Add columns to logs if they don't exist
const logColumns = db.prepare("PRAGMA table_info(logs)").all() as any[];
const logColumnNames = logColumns.map(c => c.name);
console.log("Current logs columns:", logColumnNames);

if (!logColumnNames.includes('pocket_id')) {
  try {
    db.exec("ALTER TABLE logs ADD COLUMN pocket_id INTEGER;");
    console.log("Added 'pocket_id' column to logs table");
  } catch(e) {
    console.error("Migration failed: pocket_id", e);
    // If the table is empty, we can safely drop and recreate it
    const count = db.prepare("SELECT COUNT(*) as count FROM logs").get() as { count: number };
    if (count.count === 0) {
      db.exec("DROP TABLE logs;");
      db.exec(`
        CREATE TABLE logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          pocket_id INTEGER,
          patient_id INTEGER,
          user_name TEXT NOT NULL,
          witness_name TEXT NOT NULL,
          amount REAL NOT NULL,
          type TEXT CHECK(type IN ('withdrawal', 'restock')) NOT NULL,
          medicine_name TEXT,
          strength REAL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          signature TEXT,
          FOREIGN KEY(pocket_id) REFERENCES pockets(id),
          FOREIGN KEY(patient_id) REFERENCES patients(id)
        );
      `);
      console.log("Recreated logs table with correct schema");
    }
  }
}
if (!logColumnNames.includes('user_name')) {
  try { db.exec("ALTER TABLE logs ADD COLUMN user_name TEXT NOT NULL DEFAULT '';"); } catch(e) { console.error("Migration failed: user_name", e); }
}
if (!logColumnNames.includes('witness_name')) {
  try { db.exec("ALTER TABLE logs ADD COLUMN witness_name TEXT NOT NULL DEFAULT '';"); } catch(e) { console.error("Migration failed: witness_name", e); }
}
if (!logColumnNames.includes('amount')) {
  try { db.exec("ALTER TABLE logs ADD COLUMN amount REAL NOT NULL DEFAULT 0;"); } catch(e) { console.error("Migration failed: amount", e); }
}
if (!logColumnNames.includes('type')) {
  try { db.exec("ALTER TABLE logs ADD COLUMN type TEXT NOT NULL DEFAULT 'withdrawal';"); } catch(e) { console.error("Migration failed: type", e); }
}
if (!logColumnNames.includes('timestamp')) {
  try { db.exec("ALTER TABLE logs ADD COLUMN timestamp DATETIME DEFAULT CURRENT_TIMESTAMP;"); } catch(e) { console.error("Migration failed: timestamp", e); }
}
if (!logColumnNames.includes('signature')) {
  try { db.exec("ALTER TABLE logs ADD COLUMN signature TEXT;"); } catch(e) { console.error("Migration failed: signature", e); }
}
if (!logColumnNames.includes('patient_id')) {
  try { db.exec("ALTER TABLE logs ADD COLUMN patient_id INTEGER;"); } catch(e) { console.error("Migration failed: patient_id", e); }
}
if (!logColumnNames.includes('medicine_name')) {
  try { db.exec("ALTER TABLE logs ADD COLUMN medicine_name TEXT;"); } catch(e) { console.error("Migration failed: medicine_name", e); }
}
if (!logColumnNames.includes('strength')) {
  try { db.exec("ALTER TABLE logs ADD COLUMN strength REAL;"); } catch(e) { console.error("Migration failed: strength", e); }
}

// Migration: Add columns to pockets if they don't exist
const pocketColumns = db.prepare("PRAGMA table_info(pockets)").all() as any[];
const pocketColumnNames = pocketColumns.map(c => c.name);
if (!pocketColumnNames.includes('medicine_name')) {
  try { db.exec("ALTER TABLE pockets ADD COLUMN medicine_name TEXT DEFAULT '';"); } catch(e) { console.error("Migration failed: medicine_name in pockets", e); }
}
if (!pocketColumnNames.includes('strength')) {
  try { db.exec("ALTER TABLE pockets ADD COLUMN strength REAL DEFAULT 0;"); } catch(e) { console.error("Migration failed: strength in pockets", e); }
}
if (!pocketColumnNames.includes('current_stock')) {
  try { db.exec("ALTER TABLE pockets ADD COLUMN current_stock INTEGER DEFAULT 0;"); } catch(e) { console.error("Migration failed: current_stock in pockets", e); }
}
if (!pocketColumnNames.includes('unit')) {
  try { db.exec("ALTER TABLE pockets ADD COLUMN unit TEXT DEFAULT 'stk';"); } catch(e) { console.error("Migration failed: unit in pockets", e); }
}
const patientColumns = db.prepare("PRAGMA table_info(patients)").all() as any[];
const patientColumnNames = patientColumns.map(c => c.name);
if (!patientColumnNames.includes('ln')) {
  try {
    db.exec("ALTER TABLE patients ADD COLUMN ln TEXT NOT NULL DEFAULT ''");
    console.log("Added 'ln' column to patients table");
  } catch (e) {
    console.error("Migration failed: ln", e);
  }
}

// Seed initial users
const insertUserIfNotExists = (username: string, password: string, role: string) => {
  const existing = db.prepare("SELECT id FROM users WHERE username = ? COLLATE NOCASE").get(username);
  if (!existing) {
    db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)")
      .run(username, password, role);
  }
};

insertUserIfNotExists("Ber", "1234", "Sykepleier");
insertUserIfNotExists("Per", "1234", "Helsefagarbeider");
insertUserIfNotExists("Anne", "1234", "Lege");
insertUserIfNotExists("Sol", "1234", "Avdelingsleder");

// Seed 100 pockets if empty
const pocketCount = db.prepare("SELECT COUNT(*) as count FROM pockets").get() as { count: number };
if (pocketCount.count === 0) {
  const insertPocket = db.prepare("INSERT INTO pockets (id) VALUES (?)");
  for (let i = 1; i <= 100; i++) {
    insertPocket.run(i);
  }
  
  // Add some initial data to first few pockets for demo
  db.prepare("UPDATE pockets SET medicine_name = ?, strength = ?, current_stock = ?, unit = ? WHERE id = 1")
    .run("Morphine", 10, 50, "tab");
  db.prepare("UPDATE pockets SET medicine_name = ?, strength = ?, current_stock = ?, unit = ? WHERE id = 2")
    .run("OxyNorm", 5, 100, "kaps");
}

const patientCount = db.prepare("SELECT COUNT(*) as count FROM patients").get() as { count: number };
if (patientCount.count === 0) {
  const insertPatient = db.prepare("INSERT INTO patients (name, room, ln) VALUES (?, ?, ?)");
  insertPatient.run("Ola Nordmann", "101", "LN12345");
  insertPatient.run("Kari Nordmann", "102", "LN67890");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/pockets", (req, res) => {
    const pockets = db.prepare("SELECT * FROM pockets").all();
    res.json(pockets);
  });

  app.get("/api/patients", (req, res) => {
    const patients = db.prepare("SELECT * FROM patients").all();
    res.json(patients);
  });

  app.post("/api/patients", (req, res) => {
    const { name, room, ln } = req.body;
    try {
      db.prepare("INSERT INTO patients (name, room, ln) VALUES (?, ?, ?)")
        .run(name, room, ln);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.put("/api/patients/:id", (req, res) => {
    const { id } = req.params;
    const { name, room, ln } = req.body;
    try {
      db.prepare("UPDATE patients SET name = ?, room = ?, ln = ? WHERE id = ?")
        .run(name, room, ln, id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.get("/api/users", (req, res) => {
    const users = db.prepare("SELECT id, username, password, role FROM users").all();
    res.json(users);
  });

  app.post("/api/users", (req, res) => {
    const { username, password, role } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Brukernavn og passord er påkrevd" });
    }
    try {
      db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)")
        .run(username, password, role || 'Helsefagarbeider');
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Brukernavnet er allerede i bruk eller ugyldig" });
    }
  });

  app.put("/api/users/:id", (req, res) => {
    const { id } = req.params;
    const { username, password, role } = req.body;
    try {
      db.prepare("UPDATE users SET username = ?, password = ?, role = ? WHERE id = ?")
        .run(username, password, role, id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Kunne ikke oppdatere bruker" });
    }
  });

  app.put("/api/pockets/:id", (req, res) => {
    const { id } = req.params;
    const { medicine_name, strength, current_stock, unit } = req.body;
    try {
      db.prepare("UPDATE pockets SET medicine_name = ?, strength = ?, current_stock = ?, unit = ? WHERE id = ?")
        .run(medicine_name, strength, current_stock, unit, id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.get("/api/logs", (req, res) => {
    const logs = db.prepare(`
      SELECT l.*, pat.name as patient_name 
      FROM logs l
      LEFT JOIN patients pat ON l.patient_id = pat.id
      ORDER BY l.timestamp DESC
      LIMIT 100
    `).all();
    res.json(logs);
  });

  app.post("/api/transaction", (req, res) => {
    const { pocket_id, patient_id, user_name, user_password, witness_name, witness_password, amount, type, medicine_name, strength } = req.body;
    
    if (!user_name || !user_password || !witness_name || !witness_password) {
      return res.status(400).json({ error: "Alle signaturfelt må fylles ut" });
    }

    if (user_name.toLowerCase() === witness_name.toLowerCase()) {
      return res.status(400).json({ error: "To forskjellige ansatte må signere" });
    }

    const numAmount = parseFloat(amount);
    const numStrength = strength ? parseFloat(strength) : 0;
    
    if (isNaN(numAmount) || numAmount < 0) {
      return res.status(400).json({ error: "Ugyldig antall" });
    }

    if (type === 'withdrawal' && numAmount <= 0) {
      return res.status(400).json({ error: "Uttak må være mer enn 0" });
    }

    // Validate users (case-insensitive username)
    const user = db.prepare("SELECT * FROM users WHERE username = ? COLLATE NOCASE AND password = ?").get(user_name, user_password);
    const witness = db.prepare("SELECT * FROM users WHERE username = ? COLLATE NOCASE AND password = ?").get(witness_name, witness_password);

    if (!user) {
      console.log(`Auth failed for user: ${user_name}`);
      return res.status(401).json({ error: "Feil brukernavn eller passord for Bruker 1" });
    }
    if (!witness) {
      console.log(`Auth failed for witness: ${witness_name}`);
      return res.status(401).json({ error: "Feil brukernavn eller passord for Bruker 2" });
    }

    const transaction = db.transaction(() => {
      // Update pocket info if restock
      if (type === 'restock') {
        db.prepare("UPDATE pockets SET medicine_name = ?, strength = ?, current_stock = current_stock + ? WHERE id = ?")
          .run(medicine_name, numStrength || 0, numAmount, pocket_id);
      } else {
        // Check stock for withdrawal
        const pocket = db.prepare("SELECT current_stock FROM pockets WHERE id = ?").get(pocket_id) as { current_stock: number };
        if (!pocket) throw new Error("Lommen finnes ikke");
        if (pocket.current_stock < numAmount) {
          throw new Error("Ikke nok beholdning i lommen");
        }
        db.prepare("UPDATE pockets SET current_stock = current_stock - ? WHERE id = ?")
          .run(numAmount, pocket_id);
      }
      
      // Log transaction
      db.prepare(`
        INSERT INTO logs (pocket_id, patient_id, user_name, witness_name, amount, type, medicine_name, strength)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(pocket_id, patient_id || null, user_name, witness_name, numAmount, type, medicine_name, numStrength);
    });

    try {
      transaction();
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
