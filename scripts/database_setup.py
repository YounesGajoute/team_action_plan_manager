# schemas/master_schema.py
"""
MASTER DATABASE SCHEMA - Single Source of Truth
All database initialization scripts MUST use this schema
"""

MASTER_SCHEMA = {
    "users": """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_id TEXT UNIQUE NOT NULL,
            username TEXT UNIQUE,
            password_hash TEXT,
            role TEXT CHECK (role IN ('manager', 'technician', 'commercial', 'other')),
            full_name TEXT,
            email TEXT,
            phone TEXT,
            status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'rejected')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP,
            profile_photo_url TEXT
        )
    """,
    
    "tasks": """
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
    """,
    
    "task_assignments": """
        CREATE TABLE IF NOT EXISTS task_assignments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES users(id),
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            assigned_by INTEGER REFERENCES users(id),
            is_primary BOOLEAN DEFAULT FALSE,
            UNIQUE(task_id, user_id)
        )
    """,
    
    "task_notes": """
        CREATE TABLE IF NOT EXISTS task_notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES users(id),
            note_text TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            note_type TEXT DEFAULT 'general' CHECK (note_type IN ('general', 'status_change', 'system'))
        )
    """,
    
    "activity_logs": """
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
    """,
    
    "files": """
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
    """,
    
    "user_availability": """
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
    """,
    
    "extra_time_requests": """
        CREATE TABLE IF NOT EXISTS extra_time_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER REFERENCES users(id),
            hours_requested REAL NOT NULL,
            reason TEXT NOT NULL,
            request_date DATE NOT NULL,
            status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
            approved_by INTEGER REFERENCES users(id),
            approval_date TIMESTAMP,
            approval_notes TEXT,
            extra_days_used REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """,
    
    "compensation_requests": """
        CREATE TABLE IF NOT EXISTS compensation_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER REFERENCES users(id),
            days_requested REAL NOT NULL,
            reason TEXT NOT NULL,
            request_date DATE NOT NULL,
            status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
            approved_by INTEGER REFERENCES users(id),
            approval_date TIMESTAMP,
            approval_notes TEXT,
            extra_days_used REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """,
    
    "system_logs": """
        CREATE TABLE IF NOT EXISTS system_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            log_level TEXT CHECK (log_level IN ('info', 'warning', 'error', 'critical')) NOT NULL,
            component TEXT NOT NULL,
            message TEXT NOT NULL,
            user_id INTEGER REFERENCES users(id),
            additional_data TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """
}

MASTER_INDEXES = [
    "CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id)",
    "CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)",
    "CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)",
    "CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)",
    "CREATE INDEX IF NOT EXISTS idx_tasks_city ON tasks(customer_city)",
    "CREATE INDEX IF NOT EXISTS idx_tasks_travel ON tasks(travel_required)",
    "CREATE INDEX IF NOT EXISTS idx_tasks_created ON tasks(created_at)",
    "CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(task_type)",
    "CREATE INDEX IF NOT EXISTS idx_assignments_task ON task_assignments(task_id)",
    "CREATE INDEX IF NOT EXISTS idx_assignments_user ON task_assignments(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_notes_task ON task_notes(task_id)",
    "CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_logs(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_activity_date ON activity_logs(start_time)",
    "CREATE INDEX IF NOT EXISTS idx_activity_task ON activity_logs(task_id)",
    "CREATE INDEX IF NOT EXISTS idx_files_task ON files(task_id)",
    "CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by)",
    "CREATE INDEX IF NOT EXISTS idx_availability_user ON user_availability(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_availability_dates ON user_availability(start_date, end_date)",
    "CREATE INDEX IF NOT EXISTS idx_extra_time_user ON extra_time_requests(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_extra_time_status ON extra_time_requests(status)",
    "CREATE INDEX IF NOT EXISTS idx_compensation_user ON compensation_requests(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_compensation_status ON compensation_requests(status)",
    "CREATE INDEX IF NOT EXISTS idx_logs_level ON system_logs(log_level)",
    "CREATE INDEX IF NOT EXISTS idx_logs_component ON system_logs(component)",
    "CREATE INDEX IF NOT EXISTS idx_logs_created ON system_logs(created_at)",
    "CREATE INDEX IF NOT EXISTS idx_logs_user ON system_logs(user_id)"
]

def create_database_from_master_schema(db_path="data/techmac.db"):
    """Create database using master schema"""
    import sqlite3
    import os
    
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Enable foreign keys and UTF-8
    cursor.execute("PRAGMA foreign_keys = ON")
    cursor.execute("PRAGMA encoding = 'UTF-8'")
    
    # Create all tables
    for table_name, schema_sql in MASTER_SCHEMA.items():
        cursor.execute(schema_sql)
        print(f"? Created table: {table_name}")
    
    # Create all indexes
    for index_sql in MASTER_INDEXES:
        cursor.execute(index_sql)
    
    print(f"? Created {len(MASTER_INDEXES)} indexes")
    
    conn.commit()
    conn.close()
    
    print(f"? Master database created: {db_path}")

if __name__ == "__main__":
    create_database_from_master_schema()