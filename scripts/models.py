# -*- coding: utf-8 -*-
"""
Data models and database operations for Team Action Plan Manager
Handles all database interactions with proper access control
"""

import sqlite3
import hashlib
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict
from enum import Enum

from config import config


class UserStatus(Enum):
    PENDING = "pending"
    ACTIVE = "active"
    REJECTED = "rejected"


class UserRole(Enum):
    MANAGER = "manager"
    TECHNICIAN = "technician"
    COMMERCIAL = "commercial"
    OTHER = "other"


class TaskStatus(Enum):
    TO_DO = "to_do"
    IN_PROGRESS = "in_progress"
    PENDING = "pending"
    BLOCKED = "blocked"
    COMPLETED = "completed"


class TaskPriority(Enum):
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class User:
    """User model with security considerations"""
    id: Optional[int] = None
    telegram_id: Optional[str] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    status: str = UserStatus.PENDING.value
    role: Optional[str] = None
    created_at: Optional[str] = None
    last_login: Optional[str] = None


@dataclass
class Task:
    """Task model for global data access"""
    id: Optional[int] = None
    task_code: Optional[str] = None
    task_type: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    customer_name: Optional[str] = None
    customer_city: Optional[str] = None
    customer_area: Optional[str] = None
    travel_required: bool = False
    company_type: Optional[str] = None
    status: str = TaskStatus.TO_DO.value
    priority: str = TaskPriority.NORMAL.value
    created_by: Optional[int] = None
    created_at: Optional[str] = None
    completion_date: Optional[str] = None
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None


@dataclass
class ActivityLog:
    """Activity log model - user-specific data"""
    id: Optional[int] = None
    user_id: Optional[int] = None
    activity_type: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    duration_minutes: Optional[int] = None
    task_id: Optional[int] = None
    location_notes: Optional[str] = None
    billable: bool = True
    company_type: Optional[str] = None
    created_at: Optional[str] = None


@dataclass
class FileRecord:
    """File record model for global file access"""
    id: Optional[int] = None
    task_id: Optional[int] = None
    filename: Optional[str] = None
    original_filename: Optional[str] = None
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    upload_method: str = "telegram"
    uploaded_by: Optional[int] = None
    uploaded_at: Optional[str] = None
    description: Optional[str] = None


class DatabaseManager:
    """Centralized database manager with access control"""
    
    def __init__(self):
        self.db_path = config.database.path
        self.logger = logging.getLogger(__name__)
        self._ensure_database_exists()
    
    def _ensure_database_exists(self):
        """Ensure database exists and has proper schema"""
        conn = self.get_connection()
        if conn:
            try:
                self._create_tables(conn)
                conn.commit()
                self.logger.info("Database schema verified")
            except Exception as e:
                self.logger.error(f"Database schema error: {e}")
            finally:
                conn.close()
    
    def get_connection(self) -> Optional[sqlite3.Connection]:
        """Get database connection with proper configuration"""
        try:
            conn = sqlite3.connect(
                self.db_path, 
                timeout=config.database.timeout,
                check_same_thread=False
            )
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA foreign_keys = ON")
            conn.execute("PRAGMA encoding = 'UTF-8'")
            return conn
        except sqlite3.Error as e:
            self.logger.error(f"Database connection error: {e}")
            return None
    
    def _create_tables(self, conn: sqlite3.Connection):
        """Create all required tables"""
        cursor = conn.cursor()
        
        # Users table - updated for new registration flow
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                telegram_id TEXT UNIQUE NOT NULL,
                username TEXT,
                full_name TEXT,
                status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'rejected')),
                role TEXT CHECK (role IN ('manager', 'technician', 'commercial', 'other')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP
            )
        """)
        
        # Tasks table - global data
        cursor.execute("""
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
        """)
        
        # Activity logs table - user-specific data
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS activity_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER REFERENCES users(id) NOT NULL,
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
        """)
        
        # Files table - global data
        cursor.execute("""
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
                description TEXT
            )
        """)
        
        # Create indexes for performance
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id)",
            "CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)",
            "CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)",
            "CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by)",
            "CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_logs(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_activity_date ON activity_logs(start_time)",
            "CREATE INDEX IF NOT EXISTS idx_files_task ON files(task_id)",
            "CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by)"
        ]
        
        for index in indexes:
            cursor.execute(index)


class UserManager:
    """User management with strict access control"""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager
        self.logger = logging.getLogger(__name__)
    
    async def register_user(self, telegram_id: str, full_name: str, username: str = None) -> bool:
        """Register new user with minimal data - admin approval required"""
        conn = self.db.get_connection()
        if not conn:
            return False
        
        try:
            cursor = conn.cursor()
            
            # Check if user already exists
            cursor.execute("SELECT id FROM users WHERE telegram_id = ?", (telegram_id,))
            if cursor.fetchone():
                return False
            
            # Insert with pending status
            cursor.execute("""
                INSERT INTO users (telegram_id, username, full_name, status)
                VALUES (?, ?, ?, ?)
            """, (telegram_id, username, full_name, UserStatus.PENDING.value))
            
            conn.commit()
            self.logger.info(f"User registered for approval: {telegram_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"User registration error: {e}")
            return False
        finally:
            conn.close()
    
    async def get_user_by_telegram_id(self, telegram_id: str) -> Optional[User]:
        """Get user by Telegram ID"""
        conn = self.db.get_connection()
        if not conn:
            return None
        
        try:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, telegram_id, username, full_name, status, role, 
                       created_at, last_login
                FROM users 
                WHERE telegram_id = ?
            """, (telegram_id,))
            
            row = cursor.fetchone()
            if row:
                return User(**dict(row))
            return None
            
        except Exception as e:
            self.logger.error(f"Error getting user: {e}")
            return None
        finally:
            conn.close()
    
    async def update_last_login(self, user_id: int) -> bool:
        """Update user's last login time"""
        conn = self.db.get_connection()
        if not conn:
            return False
        
        try:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?",
                (user_id,)
            )
            conn.commit()
            return True
        except Exception as e:
            self.logger.error(f"Error updating last login: {e}")
            return False
        finally:
            conn.close()
    
    async def get_pending_users(self) -> List[User]:
        """Get all pending users for admin approval"""
        conn = self.db.get_connection()
        if not conn:
            return []
        
        try:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, telegram_id, username, full_name, status, role,
                       created_at, last_login
                FROM users 
                WHERE status = ?
                ORDER BY created_at DESC
            """, (UserStatus.PENDING.value,))
            
            return [User(**dict(row)) for row in cursor.fetchall()]
            
        except Exception as e:
            self.logger.error(f"Error getting pending users: {e}")
            return []
        finally:
            conn.close()


class TaskManager:
    """Task management - global data accessible to all users"""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager
        self.logger = logging.getLogger(__name__)
    
    async def create_task(self, task_data: Dict[str, Any], created_by: int) -> Optional[str]:
        """Create new task and return task code"""
        conn = self.db.get_connection()
        if not conn:
            return None
        
        try:
            cursor = conn.cursor()
            
            # Generate task code
            task_code = self._generate_task_code(cursor, task_data.get('category'))
            
            cursor.execute("""
                INSERT INTO tasks (
                    task_code, task_type, category, description, customer_name,
                    customer_city, customer_area, travel_required, company_type,
                    priority, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                task_code,
                task_data.get('task_type', 'technical_task'),
                task_data['category'],
                task_data['description'],
                task_data.get('customer_name'),
                task_data.get('customer_city'),
                task_data.get('customer_area'),
                task_data.get('customer_city', '').lower() != 'tanger',
                task_data.get('company_type'),
                task_data.get('priority', TaskPriority.NORMAL.value),
                created_by
            ))
            
            conn.commit()
            self.logger.info(f"Task created: {task_code}")
            return task_code
            
        except Exception as e:
            self.logger.error(f"Task creation error: {e}")
            return None
        finally:
            conn.close()
    
    def _generate_task_code(self, cursor: sqlite3.Cursor, category: str) -> str:
        """Generate unique task code"""
        # Get category prefix
        category_prefixes = {
            'installation': 'INST',
            'maintenance': 'MAINT',
            'repair': 'REP',
            'inspection': 'INSP',
            'calibration': 'CAL',
            'commissioning': 'COMM',
            'training': 'TRAIN',
            'emergency': 'EMRG',
            'other': 'OTHER'
        }
        
        prefix = category_prefixes.get(category.lower(), 'TASK')
        date_str = datetime.now().strftime('%y%m%d')
        
        # Find next sequence number for today
        cursor.execute("""
            SELECT COUNT(*) FROM tasks 
            WHERE task_code LIKE ? AND DATE(created_at) = DATE('now')
        """, (f"{prefix}-{date_str}-%",))
        
        count = cursor.fetchone()[0] + 1
        return f"{prefix}-{date_str}-{count:03d}"
    
    async def get_all_tasks(self, status_filter: str = None) -> List[Task]:
        """Get all tasks (global data) with optional status filter"""
        conn = self.db.get_connection()
        if not conn:
            return []
        
        try:
            cursor = conn.cursor()
            
            if status_filter:
                cursor.execute("""
                    SELECT id, task_code, task_type, category, description,
                           customer_name, customer_city, customer_area, travel_required,
                           company_type, status, priority, created_by, created_at,
                           completion_date, estimated_hours, actual_hours
                    FROM tasks 
                    WHERE status = ?
                    ORDER BY created_at DESC
                """, (status_filter,))
            else:
                cursor.execute("""
                    SELECT id, task_code, task_type, category, description,
                           customer_name, customer_city, customer_area, travel_required,
                           company_type, status, priority, created_by, created_at,
                           completion_date, estimated_hours, actual_hours
                    FROM tasks 
                    ORDER BY created_at DESC
                """)
            
            return [Task(**dict(row)) for row in cursor.fetchall()]
            
        except Exception as e:
            self.logger.error(f"Error getting tasks: {e}")
            return []
        finally:
            conn.close()
    
    async def get_task_by_code(self, task_code: str) -> Optional[Task]:
        """Get specific task by code"""
        conn = self.db.get_connection()
        if not conn:
            return None
        
        try:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, task_code, task_type, category, description,
                       customer_name, customer_city, customer_area, travel_required,
                       company_type, status, priority, created_by, created_at,
                       completion_date, estimated_hours, actual_hours
                FROM tasks 
                WHERE task_code = ?
            """, (task_code,))
            
            row = cursor.fetchone()
            if row:
                return Task(**dict(row))
            return None
            
        except Exception as e:
            self.logger.error(f"Error getting task: {e}")
            return None
        finally:
            conn.close()


class ActivityManager:
    """Activity management - user-specific data with strict isolation"""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager
        self.logger = logging.getLogger(__name__)
    
    async def log_activity(self, activity_data: Dict[str, Any], user_id: int) -> bool:
        """Log activity for specific user"""
        conn = self.db.get_connection()
        if not conn:
            return False
        
        try:
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO activity_logs (
                    user_id, activity_type, description, start_time, 
                    duration_minutes, task_id, location_notes, 
                    billable, company_type
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                user_id,
                activity_data['activity_type'],
                activity_data.get('description'),
                activity_data.get('start_time', datetime.now().isoformat()),
                activity_data.get('duration_minutes'),
                activity_data.get('task_id'),
                activity_data.get('location_notes'),
                activity_data.get('billable', True),
                activity_data.get('company_type')
            ))
            
            conn.commit()
            self.logger.info(f"Activity logged for user {user_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Activity logging error: {e}")
            return False
        finally:
            conn.close()
    
    async def get_user_activities(self, user_id: int, limit: int = 50) -> List[ActivityLog]:
        """Get activities for specific user only (strict isolation)"""
        conn = self.db.get_connection()
        if not conn:
            return []
        
        try:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, user_id, activity_type, description, start_time,
                       end_time, duration_minutes, task_id, location_notes,
                       billable, company_type, created_at
                FROM activity_logs 
                WHERE user_id = ?
                ORDER BY start_time DESC
                LIMIT ?
            """, (user_id, limit))
            
            return [ActivityLog(**dict(row)) for row in cursor.fetchall()]
            
        except Exception as e:
            self.logger.error(f"Error getting user activities: {e}")
            return []
        finally:
            conn.close()
    
    async def get_user_stats(self, user_id: int) -> Dict[str, Any]:
        """Get personal statistics for user"""
        conn = self.db.get_connection()
        if not conn:
            return {}
        
        try:
            cursor = conn.cursor()
            
            # Total activities
            cursor.execute("""
                SELECT COUNT(*) FROM activity_logs WHERE user_id = ?
            """, (user_id,))
            total_activities = cursor.fetchone()[0]
            
            # Activities this week
            cursor.execute("""
                SELECT COUNT(*) FROM activity_logs 
                WHERE user_id = ? AND start_time >= date('now', '-7 days')
            """, (user_id,))
            week_activities = cursor.fetchone()[0]
            
            # Total hours this month
            cursor.execute("""
                SELECT COALESCE(SUM(duration_minutes), 0) / 60.0 FROM activity_logs 
                WHERE user_id = ? AND start_time >= date('now', 'start of month')
            """, (user_id,))
            month_hours = cursor.fetchone()[0]
            
            # Top activity types
            cursor.execute("""
                SELECT activity_type, COUNT(*) as count 
                FROM activity_logs 
                WHERE user_id = ?
                GROUP BY activity_type 
                ORDER BY count DESC 
                LIMIT 5
            """, (user_id,))
            top_activities = cursor.fetchall()
            
            return {
                'total_activities': total_activities,
                'week_activities': week_activities,
                'month_hours': round(month_hours, 1),
                'top_activities': [{'type': row[0], 'count': row[1]} for row in top_activities]
            }
            
        except Exception as e:
            self.logger.error(f"Error getting user stats: {e}")
            return {}
        finally:
            conn.close()


class FileManager:
    """File management - global data accessible to all users"""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager
        self.logger = logging.getLogger(__name__)
    
    async def save_file_record(self, file_data: Dict[str, Any], uploaded_by: int) -> bool:
        """Save file record (global data)"""
        conn = self.db.get_connection()
        if not conn:
            return False
        
        try:
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO files (
                    task_id, filename, original_filename, file_type,
                    file_size, upload_method, uploaded_by, description
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                file_data.get('task_id'),
                file_data['filename'],
                file_data['original_filename'],
                file_data['file_type'],
                file_data.get('file_size', 0),
                file_data.get('upload_method', 'telegram'),
                uploaded_by,
                file_data.get('description')
            ))
            
            conn.commit()
            self.logger.info(f"File record saved by user {uploaded_by}")
            return True
            
        except Exception as e:
            self.logger.error(f"File save error: {e}")
            return False
        finally:
            conn.close()
    
    async def get_all_files(self, task_id: int = None) -> List[FileRecord]:
        """Get all files (global data) with optional task filter"""
        conn = self.db.get_connection()
        if not conn:
            return []
        
        try:
            cursor = conn.cursor()
            
            if task_id:
                cursor.execute("""
                    SELECT id, task_id, filename, original_filename, file_type,
                           file_size, upload_method, uploaded_by, uploaded_at, description
                    FROM files 
                    WHERE task_id = ?
                    ORDER BY uploaded_at DESC
                """, (task_id,))
            else:
                cursor.execute("""
                    SELECT id, task_id, filename, original_filename, file_type,
                           file_size, upload_method, uploaded_by, uploaded_at, description
                    FROM files 
                    ORDER BY uploaded_at DESC
                """)
            
            return [FileRecord(**dict(row)) for row in cursor.fetchall()]
            
        except Exception as e:
            self.logger.error(f"Error getting files: {e}")
            return []
        finally:
            conn.close()


class StatsManager:
    """Statistics management with proper access control"""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager
        self.logger = logging.getLogger(__name__)
    
    async def get_global_stats(self) -> Dict[str, Any]:
        """Get global team statistics (accessible to all users)"""
        conn = self.db.get_connection()
        if not conn:
            return {}
        
        try:
            cursor = conn.cursor()
            
            # Task statistics
            cursor.execute("SELECT COUNT(*) FROM tasks")
            total_tasks = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM tasks WHERE status = 'completed'")
            completed_tasks = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM tasks WHERE status = 'in_progress'")
            active_tasks = cursor.fetchone()[0]
            
            # Team statistics
            cursor.execute("SELECT COUNT(*) FROM users WHERE status = 'active'")
            active_users = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM files")
            total_files = cursor.fetchone()[0]
            
            # Recent activity count (all users)
            cursor.execute("""
                SELECT COUNT(*) FROM activity_logs 
                WHERE start_time >= date('now', '-7 days')
            """)
            week_activities = cursor.fetchone()[0]
            
            # Task distribution by status
            cursor.execute("""
                SELECT status, COUNT(*) 
                FROM tasks 
                GROUP BY status
            """)
            task_distribution = dict(cursor.fetchall())
            
            return {
                'total_tasks': total_tasks,
                'completed_tasks': completed_tasks,
                'active_tasks': active_tasks,
                'active_users': active_users,
                'total_files': total_files,
                'week_activities': week_activities,
                'task_distribution': task_distribution,
                'completion_rate': round((completed_tasks / total_tasks * 100) if total_tasks > 0 else 0, 1)
            }
            
        except Exception as e:
            self.logger.error(f"Error getting global stats: {e}")
            return {}
        finally:
            conn.close()


# Global instances
db_manager = DatabaseManager()
user_manager = UserManager(db_manager)
task_manager = TaskManager(db_manager)
activity_manager = ActivityManager(db_manager)
file_manager = FileManager(db_manager)
stats_manager = StatsManager(db_manager)