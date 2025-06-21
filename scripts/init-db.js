const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'techmac.db');

console.log('???  Initializing Techmac database...');

(async () => {
  try {
    // Generate bcrypt hash outside of db.serialize()
    const adminPassword = await bcrypt.hash("admin123", 12);

    const db = new sqlite3.Database(dbPath);

    db.serialize(() => {
      // Users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT CHECK (role IN ('manager', 'technician', 'commercial', 'other')) NOT NULL,
          full_name TEXT NOT NULL,
          email TEXT,
          phone TEXT,
          telegram_id TEXT UNIQUE,
          status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_login TIMESTAMP,
          profile_photo_url TEXT
        )
      `);

      // Tasks table
      db.run(`
        CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_code TEXT UNIQUE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          task_type TEXT CHECK (task_type IN ('technical_task', 'support_ticket')) NOT NULL,
          category TEXT NOT NULL,
          description TEXT NOT NULL,
          customer_name TEXT,
          customer_city TEXT,
          customer_area TEXT,
          travel_required BOOLEAN DEFAULT FALSE,
          company_type TEXT CHECK (company_type IN ('SARL', 'ZF')),
          status TEXT DEFAULT 'to_do' CHECK (status IN ('to_do', 'in_progress', 'pending', 'blocked', 'completed')),
          priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'critical')),
          created_by INTEGER REFERENCES users(id),
          completion_date TIMESTAMP,
          estimated_hours REAL,
          actual_hours REAL,
          block_reason TEXT
        )
      `);

      // Task assignments table
      db.run(`
        CREATE TABLE IF NOT EXISTS task_assignments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id),
          assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          assigned_by INTEGER REFERENCES users(id),
          is_primary BOOLEAN DEFAULT FALSE,
          UNIQUE(task_id, user_id)
        )
      `);

      // Task notes table
      db.run(`
        CREATE TABLE IF NOT EXISTS task_notes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id),
          note_text TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          note_type TEXT DEFAULT 'general' CHECK (note_type IN ('general', 'status_change', 'system'))
        )
      `);

      // Activity logs table
      db.run(`
        CREATE TABLE IF NOT EXISTS activity_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER REFERENCES users(id),
          activity_type TEXT NOT NULL,
          description TEXT,
          start_time TIMESTAMP NOT NULL,
          end_time TIMESTAMP,
          duration_minutes INTEGER,
          task_id INTEGER REFERENCES tasks(id),
          location_notes TEXT,
          billable BOOLEAN DEFAULT TRUE,
          company_type TEXT CHECK (company_type IN ('SARL', 'ZF')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Files table
      db.run(`
        CREATE TABLE IF NOT EXISTS files (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
          filename TEXT NOT NULL,
          original_filename TEXT NOT NULL,
          file_type TEXT NOT NULL,
          file_size INTEGER,
          upload_method TEXT DEFAULT 'telegram',
          uploaded_by INTEGER REFERENCES users(id),
          uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          onedrive_path TEXT,
          description TEXT,
          classification TEXT
        )
      `);

      // User availability table
      db.run(`
        CREATE TABLE IF NOT EXISTS user_availability (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER REFERENCES users(id),
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          availability_type TEXT CHECK (availability_type IN ('absent', 'traveling', 'limited')) NOT NULL,
          reason TEXT,
          destination_city TEXT,
          destination_area TEXT,
          related_task_id INTEGER REFERENCES tasks(id),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Indexes
      db.run("CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)");
      db.run("CREATE INDEX IF NOT EXISTS idx_tasks_city ON tasks(customer_city)");
      db.run("CREATE INDEX IF NOT EXISTS idx_tasks_travel ON tasks(travel_required)");
      db.run("CREATE INDEX IF NOT EXISTS idx_tasks_created ON tasks(created_at)");
      db.run("CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_logs(user_id)");
      db.run("CREATE INDEX IF NOT EXISTS idx_activity_date ON activity_logs(start_time)");
      db.run("CREATE INDEX IF NOT EXISTS idx_files_task ON files(task_id)");

      // Insert admin user
      db.run(`
        INSERT OR IGNORE INTO users (username, password_hash, role, full_name, email, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `, ["admin", adminPassword, "manager", "System Administrator", "admin@techmac.ma", "active"], function(err) {
        if (err) {
          console.error('? Error creating admin user:', err);
        } else {
          console.log('? Admin user created (username: admin, password: admin123)');
        }
      });

      console.log('? Database tables created successfully');
    });

    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('?? Database initialization completed!');
        console.log('?? Database location:', dbPath);
      }
    });
  } catch (error) {
    console.error('Fatal error during initialization:', error);
  }
})();
