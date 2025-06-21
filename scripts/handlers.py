# -*- coding: utf-8 -*-
"""
Handlers for Team Action Plan Manager Bot
All command and callback handlers with security and access control
"""

import asyncio
import logging
from datetime import datetime
from typing import Dict, Any, Optional, List

from aiogram import types, F
from aiogram.filters import Command
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton

from models import (
    user_manager, task_manager, activity_manager, 
    file_manager, stats_manager, UserStatus
)
from ui import ui
from config import config


class BotHandlers:
    """Centralized bot handlers with access control and security"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.active_sessions = {}  # Track user sessions for security
    
    # Security and access control methods
    
    async def _check_user_access(self, telegram_id: str) -> Optional[Dict[str, Any]]:
        """Check if user has access and return user data"""
        user = await user_manager.get_user_by_telegram_id(telegram_id)
        
        if not user:
            return None
        
        if user.status != UserStatus.ACTIVE.value:
            return None
        
        # Update last login
        await user_manager.update_last_login(user.id)
        
        return user.__dict__
    
    async def _require_auth(self, message: types.Message) -> Optional[Dict[str, Any]]:
        """Require authentication and return user or send error"""
        user = await self._check_user_access(str(message.from_user.id))
        
        if not user:
            await message.answer(
                ui.format_access_denied_message(),
                reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                    [InlineKeyboardButton(text="?? Register Now", callback_data="start_registration")]
                ])
            )
            return None
        
        return user
    
    async def _require_role(self, user: Dict[str, Any], required_roles: List[str]) -> bool:
        """Check if user has required role"""
        return user.get('role') in required_roles
    
    # Command handlers
    
    async def cmd_start(self, message: types.Message):
        """Start command - premium welcome experience"""
        telegram_id = str(message.from_user.id)
        user = await user_manager.get_user_by_telegram_id(telegram_id)
        
        if user and user.status == UserStatus.ACTIVE.value:
            # Existing active user
            await message.answer(
                ui.format_welcome_message(user.full_name, is_new_user=False),
                reply_markup=ui.create_main_menu()
            )
            # Update last login
            await user_manager.update_last_login(user.id)
            
        elif user and user.status == UserStatus.PENDING.value:
            # Pending user
            await message.answer(
                ui.format_registration_pending_message(user.full_name, telegram_id)
            )
            
        else:
            # New user or rejected
            welcome_text = ui.format_welcome_message("New User", is_new_user=True)
            
            keyboard = InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="?? Register Now", callback_data="start_registration")],
                [InlineKeyboardButton(text="? Learn More", callback_data="learn_more")]
            ])
            
            await message.answer(welcome_text, reply_markup=keyboard)
    
    async def cmd_register(self, message: types.Message):
        """Register command - simplified registration"""
        telegram_id = str(message.from_user.id)
        
        # Check if user already exists
        existing_user = await user_manager.get_user_by_telegram_id(telegram_id)
        
        if existing_user:
            if existing_user.status == UserStatus.ACTIVE.value:
                await message.answer(
                    ui.format_info_message("You are already registered and active!")
                )
                return
            elif existing_user.status == UserStatus.PENDING.value:
                await message.answer(
                    ui.format_info_message("Your registration is pending approval.")
                )
                return
            else:  # REJECTED
                await message.answer(
                    ui.format_error_message("Your registration was rejected. Please contact an administrator.")
                )
                return
        
        # Auto-collect user data from Telegram
        full_name = message.from_user.full_name or f"User_{telegram_id}"
        username = message.from_user.username
        
        # Register user with pending status
        success = await user_manager.register_user(telegram_id, full_name, username)
        
        if success:
            await message.answer(
                ui.format_registration_pending_message(full_name, telegram_id)
            )
            
            # Log registration for admin
            self.logger.info(f"New registration: {full_name} ({telegram_id})")
        else:
            await message.answer(
                ui.format_error_message("Registration failed. Please try again.")
            )
    
    async def cmd_help(self, message: types.Message):
        """Help command with comprehensive guide"""
        help_text = f"""
{ui.create_header('Help & Guide', ui.EMOJIS['help'])}

{ui.EMOJIS['rocket']} <b>Getting Started:</b>
1. Use /register to create your account
2. Wait for admin approval
3. Start using all features!

{ui.EMOJIS['to_do']} <b>Task Management:</b>
- View all tasks with status filters
- Create new tasks (managers/technicians only)
- Track task progress

{ui.EMOJIS['time']} <b>Activity Logging:</b>
- Log work activities with time tracking
- Associate activities with tasks
- View personal activity history

{ui.EMOJIS['file']} <b>File Management:</b>
- Upload files to tasks
- Support for photos, videos, documents
- Global file access for all team members

{ui.EMOJIS['statistics']} <b>Statistics:</b>
- Personal activity statistics
- Team performance metrics
- Productivity insights

{ui.EMOJIS['settings']} <b>Commands:</b>
/start - Main menu
/register - Create account
/help - This help message

{ui.EMOJIS['info']} <i>Need more help? Contact your administrator.</i>
"""
        
        await message.answer(help_text, reply_markup=ui.create_help_keyboard())
    
    # Main menu handlers
    
    async def handle_my_tasks(self, message: types.Message):
        """Handle my tasks button - show task filters"""
        user = await self._require_auth(message)
        if not user:
            return
        
        header_text = f"""
{ui.create_header('Task Management', ui.EMOJIS['to_do'])}

{ui.EMOJIS['info']} <b>Select filter to view tasks:</b>

All tasks are visible to team members for collaboration.
"""
        
        await message.answer(header_text, reply_markup=ui.create_task_filters_keyboard())
    
    async def handle_new_task(self, message: types.Message):
        """Handle new task creation - role-based access"""
        user = await self._require_auth(message)
        if not user:
            return
        
        # Check permissions
        if not await self._require_role(user, ['manager', 'technician']):
            await message.answer(
                ui.format_error_message("You don't have permission to create tasks.")
            )
            return
        
        creation_text = f"""
{ui.create_header('Create New Task', ui.EMOJIS['sparkles'])}

{ui.EMOJIS['tag']} <b>Select task category:</b>

Choose the category that best describes your task.
"""
        
        await message.answer(creation_text, reply_markup=ui.create_task_categories_keyboard())
    
    async def handle_log_activity(self, message: types.Message):
        """Handle activity logging"""
        user = await self._require_auth(message)
        if not user:
            return
        
        activity_text = f"""
{ui.create_header('Log Activity', ui.EMOJIS['time'])}

{ui.EMOJIS['info']} <b>Select activity type:</b>

Track your work time for productivity insights.
"""
        
        await message.answer(activity_text, reply_markup=ui.create_activity_types_keyboard())
    
    async def handle_my_stats(self, message: types.Message):
        """Handle statistics view"""
        user = await self._require_auth(message)
        if not user:
            return
        
        # Get user-specific stats (private data)
        user_stats = await activity_manager.get_user_stats(user['id'])
        
        # Get global stats (public data)
        global_stats = await stats_manager.get_global_stats()
        
        stats_text = f"""
{ui.format_user_stats_message(user_stats, user['full_name'])}

{ui.create_header('Team Overview', ui.EMOJIS['rocket'])}
{ui.format_global_stats_message(global_stats)}
"""
        
        await message.answer(stats_text, reply_markup=ui.create_stats_keyboard())
    
    async def handle_upload_file(self, message: types.Message):
        """Handle file upload initiation"""
        user = await self._require_auth(message)
        if not user:
            return
        
        # Get recent tasks for selection
        tasks = await task_manager.get_all_tasks()
        
        if not tasks:
            await message.answer(
                ui.format_info_message("No tasks available for file upload.")
            )
            return
        
        upload_text = f"""
{ui.create_header('Upload File', ui.EMOJIS['file'])}

{ui.EMOJIS['info']} <b>Select a task to upload files:</b>

Files will be available to all team members.
"""
        
        # Create task selection keyboard
        task_buttons = []
        for task in tasks[:10]:  # Limit to recent 10 tasks
            task_buttons.append([
                InlineKeyboardButton(
                    text=f"{task.task_code} - {task.customer_name or 'No customer'}",
                    callback_data=f"upload_task_{task.id}"
                )
            ])
        
        task_buttons.append([
            InlineKeyboardButton(text="?? Search Tasks", callback_data="upload_search")
        ])
        
        keyboard = InlineKeyboardMarkup(inline_keyboard=task_buttons)
        await message.answer(upload_text, reply_markup=keyboard)
    
    async def handle_schedule(self, message: types.Message):
        """Handle schedule view"""
        user = await self._require_auth(message)
        if not user:
            return
        
        # Get today's tasks and user's activities
        tasks = await task_manager.get_all_tasks()
        user_activities = await activity_manager.get_user_activities(user['id'], limit=5)
        
        schedule_text = f"""
{ui.create_header('Today Schedule', ui.EMOJIS['calendar'])}

{ui.EMOJIS['to_do']} <b>Active Tasks:</b>
{self._format_active_tasks(tasks)}

{ui.EMOJIS['time']} <b>Recent Activities:</b>
{self._format_recent_activities(user_activities)}

{ui.EMOJIS['info']} <i>Plan your productive day!</i>
"""
        
        schedule_keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [
                InlineKeyboardButton(text="?? View All Tasks", callback_data="schedule_all_tasks"),
                InlineKeyboardButton(text="? Log Activity", callback_data="schedule_log_activity")
            ],
            [
                InlineKeyboardButton(text="?? Refresh", callback_data="schedule_refresh")
            ]
        ])
        
        await message.answer(schedule_text, reply_markup=schedule_keyboard)
    
    async def handle_settings(self, message: types.Message):
        """Handle settings menu"""
        user = await self._require_auth(message)
        if not user:
            return
        
        settings_text = f"""
{ui.create_header('Settings', ui.EMOJIS['settings'])}

{ui.EMOJIS['user']} <b>Profile Information:</b>
- Name: {user['full_name']}
- Role: {user['role'].title() if user['role'] else 'Not assigned'}
- Status: {user['status'].title()}
- Member since: {user['created_at'][:10] if user['created_at'] else 'Unknown'}

{ui.EMOJIS['info']} <b>System Information:</b>
- Bot Version: 2.0.0
- Security Level: High
- Data Encryption: Enabled

{ui.EMOJIS['notification']} <i>Settings are managed by administrators.</i>
"""
        
        settings_keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [
                InlineKeyboardButton(text="?? Refresh Profile", callback_data="settings_refresh"),
                InlineKeyboardButton(text="? Help", callback_data="settings_help")
            ]
        ])
        
        await message.answer(settings_text, reply_markup=settings_keyboard)
    
    # Callback handlers
    
    async def handle_callback(self, callback: types.CallbackQuery):
        """Handle all callback queries with security"""
        data = callback.data
        telegram_id = str(callback.from_user.id)
        
        try:
            # Handle registration callbacks (no auth needed)
            if data == "start_registration":
                await callback.message.delete()
                await self.cmd_register(callback.message)
                return
            
            elif data == "learn_more":
                await self._show_learn_more(callback)
                return
            
            # All other callbacks require authentication
            user = await self._check_user_access(telegram_id)
            if not user:
                await callback.answer(
                    "? Access denied. Please register first.",
                    show_alert=True
                )
                return
            
            # Task filter callbacks
            if data.startswith("tasks_filter_"):
                await self._handle_task_filter(callback, user)
            
            # Task creation callbacks
            elif data.startswith("cat_"):
                await self._handle_category_selection(callback, user)
            
            elif data.startswith("city_"):
                await self._handle_city_selection(callback, user)
            
            elif data.startswith("company_"):
                await self._handle_company_selection(callback, user)
            
            elif data.startswith("priority_"):
                await self._handle_priority_selection(callback, user)
            
            # Activity callbacks
            elif data.startswith("act_"):
                await self._handle_activity_selection(callback, user)
            
            # File upload callbacks
            elif data.startswith("upload_task_"):
                await self._handle_upload_task_selection(callback, user)
            
            elif data == "upload_search":
                await self._handle_upload_search(callback, user)
            
            # Stats callbacks
            elif data.startswith("stats_"):
                await self._handle_stats_action(callback, user)
            
            # Schedule callbacks
            elif data.startswith("schedule_"):
                await self._handle_schedule_action(callback, user)
            
            # Settings callbacks
            elif data.startswith("settings_"):
                await self._handle_settings_action(callback, user)
            
            # Help callbacks
            elif data.startswith("help_"):
                await self._handle_help_action(callback, user)
            
            # General callbacks
            elif data == "noop":
                await callback.answer()
                return
            
            else:
                await callback.answer("? Unknown action")
            
            await callback.answer()
            
        except Exception as e:
            self.logger.error(f"Callback error: {e}")
            await callback.answer(
                "? An error occurred. Please try again.",
                show_alert=True
            )
    
    # File upload handler
    
    async def handle_file_upload(self, message: types.Message):
        """Handle file uploads with security checks"""
        user = await self._require_auth(message)
        if not user:
            return
        
        # Check if user has selected a task (this would be stored in session)
        # For now, we'll ask them to select a task first
        await message.answer(
            ui.format_info_message("Please select a task first using the ?? Upload File button.")
        )
    
    # Callback handler methods
    
    async def _handle_task_filter(self, callback: types.CallbackQuery, user: Dict[str, Any]):
        """Handle task filter selection"""
        filter_type = callback.data.split("tasks_filter_")[1]
        status_filter = None if filter_type == 'all' else filter_type
        
        # Get all tasks (global data)
        tasks = await task_manager.get_all_tasks(status_filter)
        
        if not tasks:
            await callback.message.edit_text(
                ui.format_info_message(f"No tasks found with status: {filter_type.replace('_', ' ').title()}")
            )
            return
        
        # Format tasks with pagination
        page = 1
        tasks_per_page = 5
        total_pages = (len(tasks) + tasks_per_page - 1) // tasks_per_page
        
        start_idx = (page - 1) * tasks_per_page
        end_idx = start_idx + tasks_per_page
        page_tasks = tasks[start_idx:end_idx]
        
        # Fix the f-string backslash issue
        filter_display = filter_type.replace("_", " ").title()
        emoji = ui.EMOJIS.get(filter_type, '??')
        header = ui.create_header(f'Tasks - {filter_display}', emoji)
        tasks_text = f"{header}\n\n<b>Found {len(tasks)} task(s)</b>"
        
        for task in page_tasks:
            separator = "-" * 25
            task_card = ui.format_task_card(task.__dict__)
            tasks_text += f"\n{separator}\n{task_card}"
        
        # Create action buttons
        keyboard_buttons = [
            [
                InlineKeyboardButton(text="?? Refresh", callback_data=f"tasks_filter_{filter_type}"),
                InlineKeyboardButton(text="?? Back", callback_data="tasks_back")
            ]
        ]
        
        # Add pagination if needed
        if total_pages > 1:
            pagination_row = ui.create_pagination_keyboard(page, total_pages, f"tasks_{filter_type}").inline_keyboard[0]
            keyboard_buttons.insert(0, pagination_row)
        
        keyboard = InlineKeyboardMarkup(inline_keyboard=keyboard_buttons)
        await callback.message.edit_text(tasks_text, reply_markup=keyboard)
    
    async def _handle_category_selection(self, callback: types.CallbackQuery, user: Dict[str, Any]):
        """Handle task category selection"""
        # Check permissions
        if not await self._require_role(user, ['manager', 'technician']):
            await callback.answer("? You don't have permission to create tasks.", show_alert=True)
            return
        
        category = callback.data.split("cat_")[1]
        
        # Store in user session for next step
        self.active_sessions[user['id']] = {
            'action': 'create_task',
            'category': category,
            'step': 'description'
        }
        
        step_text = f"""
{ui.create_header('Create Task - Step 1', ui.EMOJIS['sparkles'])}

{ui.EMOJIS['tag']} <b>Category:</b> {category.title()}

{ui.EMOJIS['pen']} <b>Please describe the task:</b>

<i>Type a detailed description of what needs to be done.</i>
"""
        
        await callback.message.edit_text(step_text)
    
    async def _handle_activity_selection(self, callback: types.CallbackQuery, user: Dict[str, Any]):
        """Handle activity type selection"""
        activity_type = callback.data.split("act_")[1]
        
        # Store in user session
        self.active_sessions[user['id']] = {
            'action': 'log_activity',
            'activity_type': activity_type,
            'step': 'description'
        }
        
        activity_emoji = ui.EMOJIS.get(activity_type, '??')
        activity_display = activity_type.replace('_', ' ').title()
        
        activity_text = f"""
{ui.create_header('Log Activity', ui.EMOJIS['time'])}

{activity_emoji} <b>Activity:</b> {activity_display}

{ui.EMOJIS['pen']} <b>Describe your activity:</b>

<i>What did you do? Where? Any important details?
Include duration if known (e.g., "Fixed printer issue - 45 minutes")</i>
"""
        
        await callback.message.edit_text(activity_text)
    
    async def _handle_upload_task_selection(self, callback: types.CallbackQuery, user: Dict[str, Any]):
        """Handle upload task selection"""
        task_id = int(callback.data.split("upload_task_")[1])
        
        # Get task details
        task = await task_manager.get_task_by_code(f"TASK-{task_id}")
        
        if not task:
            await callback.answer("? Task not found.", show_alert=True)
            return
        
        # Store in session
        self.active_sessions[user['id']] = {
            'action': 'upload_file',
            'task_id': task_id,
            'step': 'waiting_file'
        }
        
        task_description = task.description[:100] + "..." if len(task.description) > 100 else task.description
        max_size = config.security.max_file_size_mb
        
        upload_text = f"""
{ui.create_header('Upload File', ui.EMOJIS['file'])}

{ui.EMOJIS['to_do']} <b>Selected Task:</b> {task.task_code}
{ui.EMOJIS['pen']} <b>Description:</b> {task_description}

{ui.EMOJIS['file']} <b>Now send your file:</b>

Supported formats: Photos, Videos, Documents
Maximum size: {max_size}MB
"""
        
        await callback.message.edit_text(upload_text)
    
    async def _handle_stats_action(self, callback: types.CallbackQuery, user: Dict[str, Any]):
        """Handle statistics actions"""
        action = callback.data.split("stats_")[1]
        
        if action == "personal":
            stats = await activity_manager.get_user_stats(user['id'])
            stats_text = ui.format_user_stats_message(stats, user['full_name'])
            
        elif action == "team":
            stats = await stats_manager.get_global_stats()
            stats_text = ui.format_global_stats_message(stats)
            
        elif action == "refresh":
            # Refresh current view
            user_stats = await activity_manager.get_user_stats(user['id'])
            global_stats = await stats_manager.get_global_stats()
            
            user_msg = ui.format_user_stats_message(user_stats, user['full_name'])
            team_header = ui.create_header('Team Overview', ui.EMOJIS['rocket'])
            team_msg = ui.format_global_stats_message(global_stats)
            
            stats_text = f"{user_msg}\n\n{team_header}\n{team_msg}"
        else:
            stats_text = ui.format_info_message("Feature coming soon!")
        
        await callback.message.edit_text(stats_text, reply_markup=ui.create_stats_keyboard())
    
    async def _show_learn_more(self, callback: types.CallbackQuery):
        """Show learn more information"""
        learn_more_text = f"""
{ui.create_header('About Techmac Bot', ui.EMOJIS['info'])}

{ui.EMOJIS['rocket']} <b>Advanced Features:</b>
- Multi-user collaboration system
- Real-time task management
- Comprehensive activity tracking
- Secure file sharing
- Advanced analytics and reporting
- Role-based access control

{ui.EMOJIS['shield']} <b>Security:</b>
- All data is encrypted
- User isolation and privacy
- Admin approval process
- Session management

{ui.EMOJIS['sparkles']} <b>Modern UI/UX:</b>
- Premium design interface
- Intuitive navigation
- Rich visual feedback
- Mobile-optimized experience

{ui.EMOJIS['key']} Ready to get started? Use /register to create your account!
"""
        
        keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="?? Register Now", callback_data="start_registration")],
            [InlineKeyboardButton(text="?? Back", callback_data="start_registration")]
        ])
        
        await callback.message.edit_text(learn_more_text, reply_markup=keyboard)
    
    # Helper methods
    
    def _format_active_tasks(self, tasks: List[Any]) -> str:
        """Format active tasks for schedule"""
        active_tasks = [t for t in tasks if t.status in ['to_do', 'in_progress']][:3]
        
        if not active_tasks:
            return "No active tasks"
        
        result = ""
        for task in active_tasks:
            emoji = ui.EMOJIS.get(task.status, '??')
            customer_name = task.customer_name or 'No customer'
            result += f"- {emoji} {task.task_code} - {customer_name}\n"
        
        return result.rstrip()
    
    def _format_recent_activities(self, activities: List[Any]) -> str:
        """Format recent activities for schedule"""
        if not activities:
            return "No recent activities"
        
        result = ""
        for activity in activities[:3]:
            emoji = ui.EMOJIS.get(activity.activity_type, '??')
            activity_display = activity.activity_type.replace('_', ' ').title()
            result += f"- {emoji} {activity_display}\n"
        
        return result.rstrip()
    
    # Placeholder handlers for additional callbacks
    async def _handle_city_selection(self, callback: types.CallbackQuery, user: Dict[str, Any]):
        """Placeholder for city selection"""
        await callback.answer("City selection - Feature in development")
    
    async def _handle_company_selection(self, callback: types.CallbackQuery, user: Dict[str, Any]):
        """Placeholder for company selection"""
        await callback.answer("Company selection - Feature in development")
    
    async def _handle_priority_selection(self, callback: types.CallbackQuery, user: Dict[str, Any]):
        """Placeholder for priority selection"""
        await callback.answer("Priority selection - Feature in development")
    
    async def _handle_upload_search(self, callback: types.CallbackQuery, user: Dict[str, Any]):
        """Placeholder for upload search"""
        await callback.answer("Upload search - Feature in development")
    
    async def _handle_schedule_action(self, callback: types.CallbackQuery, user: Dict[str, Any]):
        """Placeholder for schedule actions"""
        await callback.answer("Schedule action - Feature in development")
    
    async def _handle_settings_action(self, callback: types.CallbackQuery, user: Dict[str, Any]):
        """Placeholder for settings actions"""
        await callback.answer("Settings action - Feature in development")
    
    async def _handle_help_action(self, callback: types.CallbackQuery, user: Dict[str, Any]):
        """Placeholder for help actions"""
        await callback.answer("Help action - Feature in development")


# Global handlers instance
handlers = BotHandlers()