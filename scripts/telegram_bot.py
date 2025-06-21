#!/usr/bin/env python3
"""
telegram_bot.py - Main Telegram Bot Application
Team Action Plan Manager

Fixed version with proper aiogram 3.x configuration and database schema compatibility
"""

import asyncio
import logging
import sys
import os
from contextlib import asynccontextmanager

# Aiogram imports - FIXED VERSION COMPATIBILITY
from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.filters import Command
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.webhook.aiohttp_server import SimpleRequestHandler, setup_application
from aiohttp import web
from aiogram import F

# Local imports
try:
    from config import config
    from models import db_manager
    from handlers import handlers  # Import handlers instance
except ImportError as e:
    print(f"? Import error: {e}")
    print("Make sure all required modules are available.")
    sys.exit(1)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('telegram_bot.log', encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class TelegramBotApplication:
    """Production-grade Telegram bot application"""
    
    def __init__(self):
        self.logger = self._setup_logging()
        self.bot = None
        self.dp = None
        self.storage = None
        self._initialize_bot()
    
    def _setup_logging(self) -> logging.Logger:
        """Setup centralized logging"""
        try:
            logger = config.setup_logging()
        except AttributeError:
            # Fallback logging setup if config doesn't have setup_logging
            logger = logging.getLogger(__name__)
            logger.setLevel(logging.INFO)
        
        logger.info("Telegram Bot Application initializing...")
        return logger
    
    def _initialize_bot(self):
        """Initialize bot and dispatcher"""
        try:
            # Initialize bot with proper DefaultBotProperties for aiogram 3.7+
            self.bot = Bot(
                token=config.bot.token,
                default=DefaultBotProperties(
                    parse_mode=ParseMode.HTML
                )
            )
            
            # Initialize storage and dispatcher
            self.storage = MemoryStorage()
            self.dp = Dispatcher(storage=self.storage)
            
            # Setup handlers
            self._setup_handlers()
            
            self.logger.info("Bot initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Bot initialization failed: {e}")
            sys.exit(1)
    
    def _setup_handlers(self):
        """Setup all bot handlers with proper filtering"""
        
        try:
            # Import the handlers instance from your handlers.py
            from handlers import handlers
            
            # Command handlers
            self.dp.message.register(
                handlers.cmd_start,
                Command("start")
            )
            
            self.dp.message.register(
                handlers.cmd_register,
                Command("register")
            )
            
            self.dp.message.register(
                handlers.cmd_help,
                Command("help")
            )
            
            # Menu button handlers (using text filters)
            self.dp.message.register(
                handlers.handle_my_tasks,
                F.text.contains("My Tasks")
            )
            
            self.dp.message.register(
                handlers.handle_new_task,
                F.text.contains("New Task")
            )
            
            self.dp.message.register(
                handlers.handle_log_activity,
                F.text.contains("Log Activity")
            )
            
            self.dp.message.register(
                handlers.handle_my_stats,
                F.text.contains("My Stats")
            )
            
            self.dp.message.register(
                handlers.handle_upload_file,
                F.text.contains("Upload File")
            )
            
            self.dp.message.register(
                handlers.handle_schedule,
                F.text.contains("Schedule")
            )
            
            self.dp.message.register(
                handlers.handle_settings,
                F.text.contains("Settings")
            )
            
            # Callback query handler
            self.dp.callback_query.register(handlers.handle_callback)
            
            # File upload handler
            self.dp.message.register(
                handlers.handle_file_upload,
                F.document | F.photo | F.video
            )
            
            # Error handler
            self.dp.errors.register(self._error_handler)
            
            self.logger.info("Handlers registered successfully")
            
        except ImportError as e:
            self.logger.error(f"Could not import handlers: {e}")
            # Register minimal handlers for testing
            self._setup_minimal_handlers()
        except AttributeError as e:
            self.logger.error(f"Handler registration failed - missing handler function: {e}")
            # Register minimal handlers for testing
            self._setup_minimal_handlers()
        except Exception as e:
            self.logger.error(f"Handler setup failed: {e}")
            self._setup_minimal_handlers()
    
    def _setup_minimal_handlers(self):
        """Setup minimal handlers for testing when full handlers fail"""
        self.logger.info("Setting up minimal handlers for testing...")
        
        @self.dp.message(Command("start"))
        async def minimal_start(message):
            await message.reply(
                "?? <b>Bot Started!</b>\n\n"
                "? Basic functionality working\n"
                "?? Full handlers not loaded\n\n"
                "Commands:\n"
                "/start - This message\n"
                "/help - Basic help"
            )
        
        @self.dp.message(Command("help"))
        async def minimal_help(message):
            await message.reply(
                "? <b>Basic Help</b>\n\n"
                "The bot is running in minimal mode.\n"
                "Check your handlers.py file for missing functions."
            )
        
        @self.dp.message()
        async def minimal_echo(message):
            await message.reply(
                f"?? Received: {message.text}\n\n"
                "Bot is running in minimal mode."
            )
        
        self.logger.info("Minimal handlers registered")
    
    async def _error_handler(self, event, exception):
        """Global error handler"""
        self.logger.error(f"Bot error: {exception}")
        
        # Try to respond to user if possible
        if hasattr(event, 'message') and event.message:
            try:
                await event.message.answer(
                    "? An error occurred. Please try again or contact support."
                )
            except Exception:
                pass  # Ignore secondary errors
    
    async def _setup_webhook(self, app: web.Application) -> str:
        """Setup webhook for production deployment"""
        if not hasattr(config.bot, 'webhook_url') or not config.bot.webhook_url:
            self.logger.warning("No webhook URL configured")
            return None
        
        try:
            # Set webhook
            webhook_secret = getattr(config.bot, 'webhook_secret', None)
            await self.bot.set_webhook(
                url=config.bot.webhook_url,
                secret_token=webhook_secret
            )
            
            # Setup webhook handler
            handler = SimpleRequestHandler(
                dispatcher=self.dp,
                bot=self.bot,
                secret_token=webhook_secret
            )
            
            # Register webhook route
            handler.register(app, path="/webhook")
            
            self.logger.info(f"Webhook configured: {config.bot.webhook_url}")
            return config.bot.webhook_url
            
        except Exception as e:
            self.logger.error(f"Webhook setup failed: {e}")
            return None
    
    async def start_polling(self):
        """Start bot in polling mode (development)"""
        try:
            self.logger.info("Starting bot in polling mode...")
            
            # Delete webhook if exists
            await self.bot.delete_webhook(drop_pending_updates=True)
            
            # Start polling
            await self.dp.start_polling(
                self.bot,
                skip_updates=True,
                allowed_updates=self.dp.resolve_used_update_types()
            )
            
        except Exception as e:
            self.logger.error(f"Polling failed: {e}")
            raise
        finally:
            await self._cleanup()
    
    async def start_webhook(self):
        """Start bot in webhook mode (production)"""
        try:
            self.logger.info("Starting bot in webhook mode...")
            
            # Create web application
            app = web.Application()
            
            # Setup webhook
            webhook_url = await self._setup_webhook(app)
            if not webhook_url:
                raise ValueError("Webhook setup failed")
            
            # Add health check endpoint
            app.router.add_get("/health", self._health_check)
            
            # Setup application
            setup_application(app, self.dp, bot=self.bot)
            
            # Start web server
            runner = web.AppRunner(app)
            await runner.setup()
            
            webhook_port = getattr(config.bot, 'webhook_port', 8080)
            site = web.TCPSite(
                runner,
                host="0.0.0.0",
                port=webhook_port
            )
            
            await site.start()
            
            self.logger.info(f"Webhook server started on port {webhook_port}")
            
            # Keep running
            while True:
                await asyncio.sleep(60)  # Health check interval
                
        except Exception as e:
            self.logger.error(f"Webhook mode failed: {e}")
            raise
        finally:
            await self._cleanup()
    
    async def _health_check(self, request):
        """Health check endpoint for monitoring"""
        return web.json_response({
            "status": "healthy",
            "bot_id": self.bot.id if self.bot else None,
            "timestamp": asyncio.get_event_loop().time()
        })
    
    async def _cleanup(self):
        """Cleanup resources"""
        try:
            if self.bot:
                await self.bot.session.close()
            
            if self.storage:
                await self.storage.close()
            
            self.logger.info("Bot cleanup completed")
            
        except Exception as e:
            self.logger.error(f"Cleanup error: {e}")
    
    def run(self, webhook_mode: bool = False):
        """Run the bot application"""
        try:
            if webhook_mode:
                asyncio.run(self.start_webhook())
            else:
                asyncio.run(self.start_polling())
                
        except KeyboardInterrupt:
            self.logger.info("Bot stopped by user")
        except Exception as e:
            self.logger.error(f"Bot runtime error: {e}")
            sys.exit(1)


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Team Action Plan Manager Bot")
    parser.add_argument(
        "--webhook", 
        action="store_true", 
        help="Run in webhook mode (production)"
    )
    parser.add_argument(
        "--polling", 
        action="store_true", 
        help="Run in polling mode (development)"
    )
    
    args = parser.parse_args()
    
    # Initialize and run bot
    bot_app = TelegramBotApplication()
    
    # Determine run mode
    webhook_mode = args.webhook or (
        not args.polling and 
        hasattr(config.bot, 'webhook_url') and 
        config.bot.webhook_url
    )
    
    if webhook_mode:
        print("?? Starting in webhook mode...")
    else:
        print("?? Starting in polling mode...")
    
    bot_app.run(webhook_mode=webhook_mode)


if __name__ == "__main__":
    main()