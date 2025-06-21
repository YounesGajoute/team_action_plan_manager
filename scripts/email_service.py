"""
Email Service for Weekly Reports
Handles automated email generation and sending
"""

import smtplib
import sqlite3
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from datetime import datetime, timedelta
import os
from typing import Dict, List
import json

class EmailService:
    def __init__(self, smtp_config: Dict, database_path: str):
        self.smtp_server = smtp_config['server']
        self.smtp_port = smtp_config['port']
        self.username = smtp_config['username']
        self.password = smtp_config['password']
        self.database_path = database_path
        
    def get_db_connection(self):
        """Get database connection"""
        conn = sqlite3.connect(self.database_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    async def generate_monday_report(self) -> Dict:
        """Generate Monday weekly report data"""
        current_date = datetime.now()
        week_number = current_date.isocalendar()[1]
        
        conn = self.get_db_connection()
        cursor = conn.cursor()
        
        # Get open tasks summary
        cursor.execute("""
            SELECT status, COUNT(*) as count, 
                   SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high_priority
            FROM tasks 
            WHERE status IN ('to_do', 'in_progress', 'pending')
            GROUP BY status
        """)
        open_tasks_data = cursor.fetchall()
        
        # Get travel schedule for this week
        week_start = current_date - timedelta(days=current_date.weekday())
        week_end = week_start + timedelta(days=6)
        
        cursor.execute("""
            SELECT u.full_name, ua.destination_city, ua.start_date, ua.end_date,
                   COUNT(t.id) as task_count
            FROM user_availability ua
            JOIN users u ON ua.user_id = u.id
            LEFT JOIN tasks t ON ua.related_task_id = t.id
            WHERE ua.availability_type = 'traveling'
            AND ua.start_date BETWEEN ? AND ?
            GROUP BY ua.id
        """, (week_start.date(), week_end.date()))
        travel_schedule = cursor.fetchall()
        
        # Get completed tasks from last week
        last_week_start = week_start - timedelta(days=7)
        cursor.execute("""
            SELECT t.task_code, t.description, u.full_name as technician_name, t.customer_name
            FROM tasks t
            JOIN task_assignments ta ON t.id = ta.task_id
            JOIN users u ON ta.user_id = u.id
            WHERE t.status = 'completed'
            AND t.completion_date BETWEEN ? AND ?
        """, (last_week_start, week_start))
        completed_tasks = cursor.fetchall()
        
        # Get blocked tasks
        cursor.execute("""
            SELECT task_code, description, block_reason
            FROM tasks
            WHERE status = 'blocked'
        """)
        blocked_tasks = cursor.fetchall()
        
        conn.close()
        
        return {
            "day": "monday",
            "date": current_date.strftime("%Y-%m-%d"),
            "week_number": week_number,
            "year": current_date.year,
            "open_tasks": {
                "total": sum(row['count'] for row in open_tasks_data),
                "high_priority": sum(row['high_priority'] for row in open_tasks_data)
            },
            "travel_schedule": [dict(row) for row in travel_schedule],
            "completed_tasks_last_week": [dict(row) for row in completed_tasks],
            "blocked_tasks": [dict(row) for row in blocked_tasks]
        }
    
    async def generate_friday_report(self) -> Dict:
        """Generate Friday weekly report data"""
        current_date = datetime.now()
        week_number = current_date.isocalendar()[1]
        
        conn = self.get_db_connection()
        cursor = conn.cursor()
        
        # Get tasks completed this week
        week_start = current_date - timedelta(days=current_date.weekday())
        cursor.execute("""
            SELECT t.task_code, t.description, u.full_name as technician_name, 
                   t.customer_name, t.completion_date
            FROM tasks t
            JOIN task_assignments ta ON t.id = ta.task_id
            JOIN users u ON ta.user_id = u.id
            WHERE t.status = 'completed'
            AND t.completion_date >= ?
        """, (week_start,))
        completed_tasks = cursor.fetchall()
        
        # Get team productivity metrics
        cursor.execute("""
            SELECT u.full_name, COUNT(t.id) as tasks_completed,
                   SUM(t.actual_hours) as hours_worked
            FROM users u
            LEFT JOIN task_assignments ta ON u.id = ta.user_id
            LEFT JOIN tasks t ON ta.task_id = t.id AND t.status = 'completed'
                AND t.completion_date >= ?
            WHERE u.role IN ('manager', 'technician')
            GROUP BY u.id
        """, (week_start,))
        team_productivity = cursor.fetchall()
        
        # Get file upload statistics
        cursor.execute("""
            SELECT file_type, COUNT(*) as count
            FROM files
            WHERE uploaded_at >= ?
            GROUP BY file_type
        """, (week_start,))
        file_stats = cursor.fetchall()
        
        conn.close()
        
        return {
            "day": "friday",
            "date": current_date.strftime("%Y-%m-%d"),
            "week_number": week_number,
            "year": current_date.year,
            "completed_tasks_this_week": [dict(row) for row in completed_tasks],
            "team_productivity": [dict(row) for row in team_productivity],
            "file_statistics": [dict(row) for row in file_stats],
            "system_performance": {
                "uptime": "99.8%",
                "file_uploads": sum(row['count'] for row in file_stats),
                "active_users": len(team_productivity)
            }
        }
    
    def generate_html_report(self, report_data: Dict) -> str:
        """Generate HTML email content"""
        if report_data['day'] == 'monday':
            return self.generate_monday_html(report_data)
        else:
            return self.generate_friday_html(report_data)
    
    def generate_monday_html(self, data: Dict) -> str:
        """Generate Monday report HTML"""
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; }}
                .header {{ background-color: #2c3e50; color: white; padding: 20px; text-align: center; }}
                .section {{ margin: 20px 0; padding: 15px; border-left: 4px solid #3498db; }}
                .task-item {{ background-color: #f8f9fa; padding: 10px; margin: 5px 0; border-radius: 5px; }}
                .travel-item {{ background-color: #fff3cd; padding: 10px; margin: 5px 0; border-radius: 5px; }}
                .blocked-item {{ background-color: #f8d7da; padding: 10px; margin: 5px 0; border-radius: 5px; }}
                table {{ width: 100%; border-collapse: collapse; margin: 10px 0; }}
                th, td {{ padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }}
                th {{ background-color: #f2f2f2; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Techmac Weekly Report - Monday</h1>
                <p>Week {data['week_number']}/{data['year']} - {data['date']}</p>
            </div>
            
            <div class="section">
                <h2>📋 Week Start Summary</h2>
                <div class="task-item">
                    <strong>Open Tasks:</strong> {data['open_tasks']['total']} 
                    ({data['open_tasks']['high_priority']} high priority)
                </div>
                <div class="travel-item">
                    <strong>Travel Scheduled:</strong> {len(data['travel_schedule'])} trips planned
                </div>
            </div>
            
            <div class="section">
                <h2>✅ Completed Tasks (Last Week)</h2>
                <table>
                    <tr><th>Task ID</th><th>Description</th><th>Technician</th><th>Customer</th></tr>
        """
        
        for task in data['completed_tasks_last_week']:
            html += f"""
                    <tr>
                        <td>{task['task_code']}</td>
                        <td>{task['description']}</td>
                        <td>{task['technician_name']}</td>
                        <td>{task['customer_name']}</td>
                    </tr>
            """
        
        html += """
                </table>
            </div>
            
            <div class="section">
                <h2>🚫 Blocked Tasks</h2>
        """
        
        for task in data['blocked_tasks']:
            html += f"""
                <div class="blocked-item">
                    <strong>{task['task_code']}</strong>: {task['description']}<br>
                    <small>Reason: {task['block_reason'] or 'No reason specified'}</small>
                </div>
            """
        
        html += """
            </div>
            
            <div class="section">
                <h2>🚗 Travel Schedule</h2>
        """
        
        for travel in data['travel_schedule']:
            html += f"""
                <div class="travel-item">
                    <strong>{travel['full_name']}</strong> → {travel['destination_city']}<br>
                    <small>{travel['start_date']} to {travel['end_date']} | Tasks: {travel['task_count']}</small>
                </div>
            """
        
        html += """
            </div>
        </body>
        </html>
        """
        
        return html
    
    def generate_friday_html(self, data: Dict) -> str:
        """Generate Friday report HTML"""
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; }}
                .header {{ background-color: #2c3e50; color: white; padding: 20px; text-align: center; }}
                .section {{ margin: 20px 0; padding: 15px; border-left: 4px solid #3498db; }}
                .task-item {{ background-color: #f8f9fa; padding: 10px; margin: 5px 0; border-radius: 5px; }}
                .metric-item {{ background-color: #e8f5e8; padding: 10px; margin: 5px 0; border-radius: 5px; }}
                table {{ width: 100%; border-collapse: collapse; margin: 10px 0; }}
                th, td {{ padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }}
                th {{ background-color: #f2f2f2; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Techmac Weekly Report - Friday</h1>
                <p>Week {data['week_number']}/{data['year']} - {data['date']}</p>
            </div>
            
            <div class="section">
                <h2>📊 Week Summary</h2>
                <div class="task-item">
                    <strong>Tasks Completed:</strong> {len(data['completed_tasks_this_week'])}
                </div>
                <div class="metric-item">
                    <strong>Files Uploaded:</strong> {data['system_performance']['file_uploads']}
                </div>
                <div class="metric-item">
                    <strong>System Uptime:</strong> {data['system_performance']['uptime']}
                </div>
            </div>
            
            <div class="section">
                <h2>✅ Completed Tasks This Week</h2>
                <table>
                    <tr><th>Task ID</th><th>Description</th><th>Technician</th><th>Customer</th><th>Completed</th></tr>
        """
        
        for task in data['completed_tasks_this_week']:
            completion_date = task['completion_date'][:10] if task['completion_date'] else 'N/A'
            html += f"""
                    <tr>
                        <td>{task['task_code']}</td>
                        <td>{task['description']}</td>
                        <td>{task['technician_name']}</td>
                        <td>{task['customer_name']}</td>
                        <td>{completion_date}</td>
                    </tr>
            """
        
        html += """
                </table>
            </div>
            
            <div class="section">
                <h2>👥 Team Productivity</h2>
                <table>
                    <tr><th>Technician</th><th>Tasks Completed</th><th>Hours Worked</th></tr>
        """
        
        for member in data['team_productivity']:
            html += f"""
                    <tr>
                        <td>{member['full_name']}</td>
                        <td>{member['tasks_completed'] or 0}</td>
                        <td>{member['hours_worked'] or 0:.1f}</td>
                    </tr>
            """
        
        html += """
                </table>
            </div>
        </body>
        </html>
        """
        
        return html
    
    async def send_weekly_report(self, report_type: str = "monday"):
        """Send weekly report email"""
        try:
            # Generate report data
            if report_type == "monday":
                report_data = await self.generate_monday_report()
            else:
                report_data = await self.generate_friday_report()
            
            # Generate HTML content
            html_content = self.generate_html_report(report_data)
            
            # Create email
            msg = MIMEMultipart('alternative')
            msg['Subject'] = f"Techmac Weekly Report - {report_type.title()} - Week {report_data['week_number']}/{report_data['year']}"
            msg['From'] = self.username
            msg['To'] = "service.technique@techmac.ma"
            
            # Add HTML content
            html_part = MIMEText(html_content, 'html', 'utf-8')
            msg.attach(html_part)
            
            # Send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.username, self.password)
                server.send_message(msg)
            
            print(f"✅ {report_type.title()} report sent successfully")
            return {"success": True, "message": "Email sent successfully"}
            
        except Exception as e:
            print(f"❌ Failed to send {report_type} report: {e}")
            return {"success": False, "error": str(e)}

# Main function for testing
async def main():
    """Test email service"""
    smtp_config = {
        'server': 'smtp.gmail.com',
        'port': 587,
        'username': 'your-email@gmail.com',
        'password': 'your-app-password'
    }
    
    email_service = EmailService(smtp_config, 'data/techmac.db')
    
    # Test Monday report
    print("📧 Generating Monday report...")
    monday_result = await email_service.send_weekly_report("monday")
    print(f"Monday report result: {monday_result}")
    
    # Test Friday report  
    print("📧 Generating Friday report...")
    friday_result = await email_service.send_weekly_report("friday")
    print(f"Friday report result: {friday_result}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
