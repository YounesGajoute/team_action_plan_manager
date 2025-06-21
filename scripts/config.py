# -*- coding: utf-8 -*-
"""
Configuration module for Team Action Plan Manager
Centralized configuration management with environment variables
"""

import os
import logging
from dataclasses import dataclass
from typing import List, Optional


@dataclass
class DatabaseConfig:
    """Database configuration"""
    path: str = "data/techmac.db"
    timeout: float = 30.0
    
    def __post_init__(self):
        # Ensure data directory exists
        os.makedirs(os.path.dirname(self.path), exist_ok=True)


@dataclass
class BotConfig:
    """Bot configuration with security settings"""
    token: str
    webhook_url: Optional[str] = None
    webhook_secret: Optional[str] = None
    webhook_port: int = 8080
    admin_ids: List[int] = None
    
    def __post_init__(self):
        if self.admin_ids is None:
            self.admin_ids = []
        
        # More flexible token validation - just check basic format
        if not self.token or len(self.token) < 10:
            raise ValueError("Invalid bot token format")


@dataclass
class SecurityConfig:
    """Security configuration"""
    session_timeout_hours: int = 24
    max_failed_attempts: int = 5
    lockout_duration_minutes: int = 30
    
    # Rate limiting
    max_requests_per_minute: int = 60
    max_file_size_mb: int = 10
    
    # Allowed file types
    allowed_file_types: List[str] = None
    
    def __post_init__(self):
        if self.allowed_file_types is None:
            self.allowed_file_types = [
                'jpg', 'jpeg', 'png', 'heic', 
                'mp4', 'mov', 'avi', 
                'pdf', 'doc', 'docx'
            ]


@dataclass
class LoggingConfig:
    """Logging configuration"""
    level: str = "INFO"
    format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    file_path: str = "logs/telegram_bot.log"
    max_file_size_mb: int = 50
    backup_count: int = 5
    
    def __post_init__(self):
        # Ensure logs directory exists
        os.makedirs(os.path.dirname(self.file_path), exist_ok=True)


class Config:
    """Main configuration class with environment variable support"""
    
    def __init__(self):
        # Load .env file if it exists
        self._load_dotenv()
        
        self.database = DatabaseConfig(
            path=os.getenv("DATABASE_PATH", "data/techmac.db")
        )
        
        self.bot = BotConfig(
            token=os.getenv("TELEGRAM_BOT_TOKEN", ""),
            webhook_url=os.getenv("TELEGRAM_WEBHOOK_URL"),
            webhook_secret=os.getenv("TELEGRAM_WEBHOOK_SECRET"),
            webhook_port=int(os.getenv("TELEGRAM_WEBHOOK_PORT", "8080")),
            admin_ids=self._parse_admin_ids()
        )
        
        self.security = SecurityConfig(
            session_timeout_hours=int(os.getenv("SESSION_TIMEOUT_HOURS", "24")),
            max_failed_attempts=int(os.getenv("MAX_FAILED_ATTEMPTS", "5")),
            lockout_duration_minutes=int(os.getenv("LOCKOUT_DURATION_MINUTES", "30")),
            max_requests_per_minute=int(os.getenv("MAX_REQUESTS_PER_MINUTE", "60")),
            max_file_size_mb=int(os.getenv("MAX_FILE_SIZE_MB", "10"))
        )
        
        self.logging = LoggingConfig(
            level=os.getenv("LOG_LEVEL", "INFO"),
            file_path=os.getenv("LOG_FILE_PATH", "logs/telegram_bot.log")
        )
        
        # Validate configuration
        self._validate()
    
    def _load_dotenv(self):
        """Load environment variables from .env file"""
        from pathlib import Path
        
        # Look for .env file in multiple locations
        possible_paths = [
            Path.cwd() / '.env',                    # Current directory
            Path.cwd() / 'config' / '.env',         # config subdirectory
            Path.cwd().parent / 'config' / '.env',  # Parent's config directory
            Path.cwd().parent / '.env',             # Parent directory
            Path('/opt/techmac/config/.env'),       # System config (if deployed)
        ]
        
        # Also check environment variable for config path
        config_path = os.getenv('CONFIG_PATH')
        if config_path:
            possible_paths.insert(0, Path(config_path) / '.env')
        
        env_loaded = False
        for env_file in possible_paths:
            if env_file.exists():
                try:
                    # Simple .env parsing (avoiding external dependencies)
                    with open(env_file, 'r') as f:
                        for line in f:
                            line = line.strip()
                            if line and not line.startswith('#') and '=' in line:
                                key, value = line.split('=', 1)
                                key = key.strip()
                                value = value.strip().strip('"').strip("'")
                                if key and not os.getenv(key):  # Don't override existing env vars
                                    os.environ[key] = value
                    print(f"? Loaded environment from: {env_file}")
                    env_loaded = True
                    break
                except Exception as e:
                    print(f"?? Could not load .env file {env_file}: {e}")
        
        if not env_loaded:
            print("?? No .env file found in any of the expected locations:")
            for path in possible_paths:
                print(f"   - {path}")
            print("Using system environment variables only.")
    
    def _parse_admin_ids(self) -> List[int]:
        """Parse admin IDs from environment variable"""
        admin_ids_str = os.getenv("TELEGRAM_ADMIN_IDS", "")
        if not admin_ids_str:
            return []
        
        try:
            return [int(id_str.strip()) for id_str in admin_ids_str.split(",") if id_str.strip()]
        except ValueError:
            return []
    
    def _validate(self):
        """Validate configuration"""
        if not self.bot.token:
            raise ValueError("TELEGRAM_BOT_TOKEN environment variable is required")
        
        # More flexible bot token validation
        if not self.bot.token or len(self.bot.token) < 10 or ':' not in self.bot.token:
            raise ValueError("Invalid TELEGRAM_BOT_TOKEN format. Should be like: 123456:ABC-DEF...")
        
        if self.security.max_file_size_mb <= 0:
            raise ValueError("MAX_FILE_SIZE_MB must be positive")
        
        if self.security.session_timeout_hours <= 0:
            raise ValueError("SESSION_TIMEOUT_HOURS must be positive")
    
    def setup_logging(self):
        """Setup logging configuration"""
        from logging.handlers import RotatingFileHandler
        
        # Create logger
        logger = logging.getLogger()
        logger.setLevel(getattr(logging, self.logging.level.upper()))
        
        # Clear existing handlers
        logger.handlers.clear()
        
        # File handler with rotation
        file_handler = RotatingFileHandler(
            self.logging.file_path,
            maxBytes=self.logging.max_file_size_mb * 1024 * 1024,
            backupCount=self.logging.backup_count,
            encoding='utf-8'
        )
        file_handler.setFormatter(logging.Formatter(self.logging.format))
        logger.addHandler(file_handler)
        
        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(logging.Formatter(self.logging.format))
        logger.addHandler(console_handler)
        
        return logger


# Global configuration instance
config = Config()