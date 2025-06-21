# -*- coding: utf-8 -*-
"""
UI components and Telegram interface for Team Action Plan Manager
Premium UI/UX with modern design patterns
"""

from typing import List, Tuple, Dict, Any, Optional
from aiogram.types import (
    InlineKeyboardMarkup, InlineKeyboardButton, 
    ReplyKeyboardMarkup, KeyboardButton
)


class UIComponents:
    """Premium UI components with modern design and emojis"""
    
    # Enhanced emoji system for better visual hierarchy
    EMOJIS = {
        # Status indicators
        'to_do': '📋',
        'in_progress': '⚡',
        'pending': '⏳',
        'blocked': '🚫',
        'completed': '✅',
        
        # Priority levels
        'critical': '🔴',
        'high': '🟠',
        'normal': '🟢',
        
        # Activity types
        'customer_visit': '🏢',
        'installation': '🔧',
        'maintenance': '⚙️',
        'repair': '🛠️',
        'documentation': '📝',
        'email_work': '📧',
        'travel_time': '🚗',
        'break_time': '☕',
        'courier_collection': '📦',
        'project_study': '📊',
        'workshop_work': '🏭',
        
        # User interface
        'success': '✨',
        'error': '❌',
        'warning': '⚠️',
        'info': 'ℹ️',
        'user': '👤',
        'calendar': '📅',
        'location': '📍',
        'time': '⏰',
        'statistics': '📈',
        'shield': '🛡️',
        'crown': '👑',
        'rocket': '🚀',
        'fire': '🔥',
        'star': '⭐',
        'sparkles': '✨',
        'wave': '👋',
        'key': '🔑',
        'lock': '🔒',
        'check': '✅',
        'cross': '❌',
        'back': '◀️',
        'next': '▶️',
        'home': '🏠',
        'menu': '📱',
        'search': '🔍',
        'settings': '⚙️',
        'help': '❓',
        'notification': '🔔',
        
        # File types
        'file': '📄',
        'photo': '📸',
        'video': '🎥',
        'document': '📄',
        'pdf': '📄',
        
        # Navigation
        'tag': '🏷️',
        'pen': '✏️',
        'flag': '🚩',
        'email': '📧',
        'phone': '📱',
        'folder': '📁',
        'chart': '📊'
    }
    
    # Color scheme for rich text
    COLORS = {
        'primary': '#2196F3',
        'success': '#4CAF50',
        'warning': '#FF9800',
        'error': '#F44336',
        'info': '#00BCD4',
        'dark': '#333333',
        'light': '#F5F5F5'
    }
    
    def create_header(self, title: str, emoji: str = '') -> str:
        """Create styled header with visual hierarchy"""
        separator = "━" * min(len(title), 25)
        return f"<b>{emoji} {title}</b>\n{separator}"
    
    def create_progress_bar(self, current: int, total: int, width: int = 10) -> str:
        """Create visual progress bar"""
        filled = int((current / total) * width)
        empty = width - filled
        return f"{'█' * filled}{'░' * empty} ({current}/{total})"
    
    def create_status_badge(self, status: str) -> str:
        """Create colored status badge"""
        emoji = self.EMOJIS.get(status, '⚪')
        return f"{emoji} <b>{status.replace('_', ' ').title()}</b>"
    
    def format_task_card(self, task: Dict[str, Any]) -> str:
        """Format task as premium card"""
        status_emoji = self.EMOJIS.get(task.get('status'), '⚪')
        priority_emoji = self.EMOJIS.get(task.get('priority'), '🟢')
        travel_emoji = "🚗" if task.get('travel_required') else "🏠"
        
        return f"""
{status_emoji} <b>{task.get('task_code', 'N/A')}</b> {priority_emoji}
📝 {task.get('description', 'No description')[:50]}{'...' if len(task.get('description', '')) > 50 else ''}
👤 {task.get('customer_name', 'N/A')}
📍 {task.get('customer_city', 'N/A')} {travel_emoji}
📅 {task.get('created_at', 'N/A')[:10]}
"""
    
    def format_activity_summary(self, activity: Dict[str, Any]) -> str:
        """Format activity summary"""
        activity_emoji = self.EMOJIS.get(activity.get('activity_type'), '📝')
        duration = activity.get('duration_minutes', 0)
        hours = duration // 60
        minutes = duration % 60
        
        time_str = ""
        if hours > 0:
            time_str += f"{hours}h "
        if minutes > 0:
            time_str += f"{minutes}m"
        
        return f"""
{activity_emoji} <b>{activity.get('activity_type', '').replace('_', ' ').title()}</b>
📝 {activity.get('description', 'No description')[:40]}{'...' if len(activity.get('description', '')) > 40 else ''}
⏰ {time_str or 'No duration'}
📅 {activity.get('start_time', 'N/A')[:16]}
"""
    
    def create_main_menu(self) -> ReplyKeyboardMarkup:
        """Create main menu with premium layout"""
        keyboard = [
            [
                KeyboardButton(text=f"{self.EMOJIS['to_do']} My Tasks"),
                KeyboardButton(text=f"{self.EMOJIS['sparkles']} New Task")
            ],
            [
                KeyboardButton(text=f"{self.EMOJIS['time']} Log Activity"),
                KeyboardButton(text=f"{self.EMOJIS['statistics']} My Stats")
            ],
            [
                KeyboardButton(text=f"{self.EMOJIS['file']} Upload File"),
                KeyboardButton(text=f"{self.EMOJIS['calendar']} Schedule")
            ],
            [
                KeyboardButton(text=f"{self.EMOJIS['settings']} Settings"),
                KeyboardButton(text=f"{self.EMOJIS['help']} Help")
            ]
        ]
        
        return ReplyKeyboardMarkup(
            keyboard=keyboard,
            resize_keyboard=True,
            one_time_keyboard=False,
            input_field_placeholder="Choose an option..."
        )
    
    def create_inline_menu(self, options: List[Tuple[str, str]], columns: int = 2) -> InlineKeyboardMarkup:
        """Create inline keyboard menu with flexible layout"""
        keyboard = []
        current_row = []
        
        for text, callback_data in options:
            current_row.append(InlineKeyboardButton(text=text, callback_data=callback_data))
            
            if len(current_row) >= columns:
                keyboard.append(current_row)
                current_row = []
        
        # Add remaining buttons
        if current_row:
            keyboard.append(current_row)
        
        return InlineKeyboardMarkup(inline_keyboard=keyboard)
    
    def create_pagination_keyboard(self, current_page: int, total_pages: int, 
                                 callback_prefix: str) -> InlineKeyboardMarkup:
        """Create pagination controls"""
        buttons = []
        
        # Previous button
        if current_page > 1:
            buttons.append(InlineKeyboardButton(
                text=f"◀️ Previous",
                callback_data=f"{callback_prefix}_page_{current_page - 1}"
            ))
        
        # Page indicator
        buttons.append(InlineKeyboardButton(
            text=f"{current_page}/{total_pages}",
            callback_data="noop"
        ))
        
        # Next button
        if current_page < total_pages:
            buttons.append(InlineKeyboardButton(
                text="Next ▶️",
                callback_data=f"{callback_prefix}_page_{current_page + 1}"
            ))
        
        return InlineKeyboardMarkup(inline_keyboard=[buttons])
    
    def create_confirmation_keyboard(self, confirm_action: str, cancel_action: str = "cancel") -> InlineKeyboardMarkup:
        """Create confirmation dialog"""
        return InlineKeyboardMarkup(inline_keyboard=[
            [
                InlineKeyboardButton(text="✅ Confirm", callback_data=confirm_action),
                InlineKeyboardButton(text="❌ Cancel", callback_data=cancel_action)
            ]
        ])
    
    def create_task_filters_keyboard(self) -> InlineKeyboardMarkup:
        """Create task filter options"""
        filters = [
            (f"{self.EMOJIS['to_do']} To Do", "tasks_filter_to_do"),
            (f"{self.EMOJIS['in_progress']} In Progress", "tasks_filter_in_progress"),
            (f"{self.EMOJIS['pending']} Pending", "tasks_filter_pending"),
            (f"{self.EMOJIS['blocked']} Blocked", "tasks_filter_blocked"),
            (f"{self.EMOJIS['completed']} Completed", "tasks_filter_completed"),
            ("📋 All Tasks", "tasks_filter_all")
        ]
        
        return self.create_inline_menu(filters, columns=2)
    
    def create_task_categories_keyboard(self) -> InlineKeyboardMarkup:
        """Create task category selection"""
        categories = [
            ("🔧 Installation", "cat_installation"),
            ("⚙️ Maintenance", "cat_maintenance"),
            ("🛠️ Repair", "cat_repair"),
            ("🔍 Inspection", "cat_inspection"),
            ("📏 Calibration", "cat_calibration"),
            ("🚀 Commissioning", "cat_commissioning"),
            ("📚 Training", "cat_training"),
            ("🚨 Emergency", "cat_emergency"),
            ("📝 Other", "cat_other")
        ]
        
        return self.create_inline_menu(categories, columns=3)
    
    def create_activity_types_keyboard(self) -> InlineKeyboardMarkup:
        """Create activity type selection"""
        activities = [
            ("🏢 Customer Visit", "act_customer_visit"),
            ("🔧 Installation", "act_installation"),
            ("⚙️ Maintenance", "act_maintenance"),
            ("🛠️ Repair", "act_repair"),
            ("📝 Documentation", "act_documentation"),
            ("📧 Email Work", "act_email_work"),
            ("🚗 Travel Time", "act_travel_time"),
            ("☕ Break Time", "act_break_time"),
            ("📦 Courier Collection", "act_courier_collection"),
            ("📊 Project Study", "act_project_study"),
            ("🏭 Workshop Work", "act_workshop_work")
        ]
        
        return self.create_inline_menu(activities, columns=2)
    
    def create_priority_keyboard(self) -> InlineKeyboardMarkup:
        """Create priority selection"""
        priorities = [
            (f"{self.EMOJIS['normal']} Normal", "priority_normal"),
            (f"{self.EMOJIS['high']} High", "priority_high"),
            (f"{self.EMOJIS['critical']} Critical", "priority_critical")
        ]
        
        return self.create_inline_menu(priorities, columns=1)
    
    def create_company_type_keyboard(self) -> InlineKeyboardMarkup:
        """Create company type selection"""
        companies = [
            ("🏢 SARL", "company_SARL"),
            ("🏭 ZF", "company_ZF")
        ]
        
        return self.create_inline_menu(companies, columns=2)
    
    def create_cities_keyboard(self) -> InlineKeyboardMarkup:
        """Create city selection"""
        cities = [
            ("🏠 Tanger", "city_tanger"),
            ("🌊 Kenitra", "city_kenitra"),
            ("🏔️ Oujda", "city_oujda"),
            ("🏢 Casablanca", "city_casablanca"),
            ("🕌 Meknes", "city_meknes"),
            ("🏖️ Skhirat", "city_skhirat"),
            ("🌲 Ain Ouda", "city_ain_ouda"),
            ("📍 Other", "city_other")
        ]
        
        return self.create_inline_menu(cities, columns=2)
    
    def create_stats_keyboard(self) -> InlineKeyboardMarkup:
        """Create statistics options"""
        stats_options = [
            ("📊 Personal Stats", "stats_personal"),
            ("👥 Team Stats", "stats_team"),
            ("📈 Activity Report", "stats_activity"),
            ("📋 Task Summary", "stats_tasks"),
            ("🔄 Refresh", "stats_refresh")
        ]
        
        return self.create_inline_menu(stats_options, columns=2)
    
    def create_help_keyboard(self) -> InlineKeyboardMarkup:
        """Create help menu"""
        help_options = [
            ("🚀 Getting Started", "help_getting_started"),
            ("📋 Task Management", "help_tasks"),
            ("⏰ Activity Logging", "help_activities"),
            ("📄 File Upload", "help_files"),
            ("📊 Statistics", "help_stats"),
            ("⚙️ Settings", "help_settings")
        ]
        
        return self.create_inline_menu(help_options, columns=2)
    
    def format_welcome_message(self, user_name: str, is_new_user: bool = False) -> str:
        """Format welcome message"""
        if is_new_user:
            return f"""
{self.create_header('Welcome to Techmac Premium Bot!', self.EMOJIS['sparkles'])}

{self.EMOJIS['rocket']} <b>Features:</b>
✅ Smart Task Management
✅ Real-time Activity Tracking  
✅ File Management System
✅ Team Collaboration Tools
✅ Advanced Analytics

{self.EMOJIS['key']} <b>Get Started:</b>
Use /register to create your account and unlock all features!

{self.EMOJIS['info']} <i>This bot uses premium UI/UX design for the best experience.</i>
"""
        else:
            return f"""
{self.create_header(f'Welcome back, {user_name}!', self.EMOJIS['wave'])}

{self.EMOJIS['sparkles']} <i>What would you like to do today?</i>

{self.EMOJIS['info']} <b>Quick Actions:</b>
• {self.EMOJIS['to_do']} View your tasks
• {self.EMOJIS['time']} Log an activity
• {self.EMOJIS['statistics']} Check your stats
• {self.EMOJIS['file']} Upload files

{self.EMOJIS['rocket']} <i>Ready to be productive!</i>
"""
    
    def format_registration_pending_message(self, user_name: str, telegram_id: str) -> str:
        """Format registration pending message"""
        return f"""
{self.create_header('Registration Submitted', self.EMOJIS['success'])}

✅ Registration request submitted successfully!

{self.EMOJIS['user']} <b>Name:</b> {user_name}
{self.EMOJIS['key']} <b>Telegram ID:</b> {telegram_id}

{self.EMOJIS['info']} <b>Next Steps:</b>
Your request will be reviewed by the administrator. You'll be notified once your account is approved and you can start using all features.

{self.EMOJIS['sparkles']} <i>Thank you for joining Techmac!</i>
"""
    
    def format_access_denied_message(self) -> str:
        """Format access denied message"""
        return f"""
{self.EMOJIS['lock']} <b>Access Required</b>

You need to register first to use this bot.

{self.EMOJIS['key']} Use /register to create your account
{self.EMOJIS['help']} Use /help for more information

{self.EMOJIS['sparkles']} <i>Registration is quick and easy!</i>
"""
    
    def format_user_stats_message(self, stats: Dict[str, Any], user_name: str) -> str:
        """Format user statistics"""
        return f"""
{self.create_header(f'{user_name} - Personal Statistics', self.EMOJIS['statistics'])}

{self.EMOJIS['fire']} <b>Activity Overview:</b>
• Total activities: <b>{stats.get('total_activities', 0)}</b>
• This week: <b>{stats.get('week_activities', 0)}</b>
• This month: <b>{stats.get('month_hours', 0)} hours</b>

{self.EMOJIS['chart']} <b>Top Activities:</b>
{self._format_top_activities(stats.get('top_activities', []))}

{self.EMOJIS['calendar']} <i>Keep up the great work!</i>
"""
    
    def format_global_stats_message(self, stats: Dict[str, Any]) -> str:
        """Format global team statistics"""
        return f"""
{self.create_header('Team Statistics', self.EMOJIS['statistics'])}

{self.EMOJIS['rocket']} <b>Team Overview:</b>
• Total tasks: <b>{stats.get('total_tasks', 0)}</b>
• Completed: <b>{stats.get('completed_tasks', 0)}</b>
• Active: <b>{stats.get('active_tasks', 0)}</b>
• Completion rate: <b>{stats.get('completion_rate', 0)}%</b>

{self.EMOJIS['user']} <b>Team:</b>
• Active members: <b>{stats.get('active_users', 0)}</b>
• Week activities: <b>{stats.get('week_activities', 0)}</b>

{self.EMOJIS['file']} <b>Files:</b>
• Total files: <b>{stats.get('total_files', 0)}</b>

{self.EMOJIS['chart']} <i>Team performance metrics</i>
"""
    
    def _format_top_activities(self, activities: List[Dict[str, Any]]) -> str:
        """Format top activities list"""
        if not activities:
            return "No activities logged yet"
        
        result = ""
        for activity in activities[:3]:
            emoji = self.EMOJIS.get(activity['type'], '📝')
            activity_name = activity['type'].replace('_', ' ').title()
            result += f"• {emoji} {activity_name}: {activity['count']} times\n"
        
        return result.rstrip()
    
    def format_error_message(self, error_text: str) -> str:
        """Format error message"""
        return f"{self.EMOJIS['error']} <b>Error:</b> {error_text}"
    
    def format_success_message(self, success_text: str) -> str:
        """Format success message"""
        return f"{self.EMOJIS['success']} <b>Success:</b> {success_text}"
    
    def format_info_message(self, info_text: str) -> str:
        """Format info message"""
        return f"{self.EMOJIS['info']} <b>Info:</b> {info_text}"


# Global UI instance
ui = UIComponents()
