// scripts/test-api.js
// Run this with: node scripts/test-api.js
// Make sure your Next.js server is running first: npm run dev

const baseUrl = 'http://localhost:3000'

async function testLogin() {
  console.log("🔐 Testing login endpoint...")
  
  try {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username: 'admin', 
        password: 'admin123' 
      })
    })
    
    console.log(`📊 Login Status: ${response.status} ${response.statusText}`)
    
    if (response.ok) {
      const data = await response.json()
      console.log("✅ Login successful!")
      console.log(`👤 User: ${data.user.full_name} (${data.user.role})`)
      console.log(`🔑 Token: ${data.token.substring(0, 20)}...`)
      return data.token
    } else {
      const errorData = await response.text()
      console.log("❌ Login failed:", errorData)
      return null
    }
  } catch (error) {
    console.error("❌ Login error:", error.message)
    return null
  }
}

async function testTelegramEndpoints(token) {
  if (!token) {
    console.log("❌ No token available, skipping protected endpoint tests")
    return
  }
  
  console.log("\n🤖 Testing Telegram API endpoints...")
  
  const endpoints = [
    { path: '/api/telegram/stats', name: 'Bot Statistics' },
    { path: '/api/telegram/activity?limit=5', name: 'Bot Activity' },
    { path: '/api/telegram/pending-users', name: 'Pending Users' }
  ]
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n🔍 Testing ${endpoint.name}...`)
      
      const response = await fetch(`${baseUrl}${endpoint.path}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      console.log(`📊 ${endpoint.name} Status: ${response.status} ${response.statusText}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log("✅ Success!")
        
        // Show relevant data based on endpoint
        if (endpoint.path.includes('stats')) {
          console.log(`📈 Active Users: ${data.active_users}`)
          console.log(`📊 Total Activities: ${data.total_activities}`)
          console.log(`🤖 Bot Status: ${data.bot_status}`)
        } else if (endpoint.path.includes('activity')) {
          console.log(`📋 Activities Found: ${data.activities?.length || 0}`)
          if (data.activities?.length > 0) {
            console.log(`📝 Recent: ${data.activities[0].description}`)
          }
        } else if (endpoint.path.includes('pending-users')) {
          console.log(`👥 Pending Users: ${data.count || 0}`)
          if (data.users?.length > 0) {
            console.log(`👤 Example: ${data.users[0].full_name}`)
          }
        }
      } else {
        const errorData = await response.text()
        console.log(`❌ Error: ${errorData}`)
      }
    } catch (error) {
      console.log(`❌ Request failed: ${error.message}`)
    }
  }
}

async function testPostEndpoints(token) {
  if (!token) {
    console.log("❌ No token available, skipping POST endpoint tests")
    return
  }
  
  console.log("\n📤 Testing POST endpoints...")
  
  // Test send command
  try {
    console.log("\n🤖 Testing send command...")
    
    const response = await fetch(`${baseUrl}/api/telegram/send-command`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        command: '/help',
        parameters: 'test from API'
      })
    })
    
    console.log(`📊 Send Command Status: ${response.status} ${response.statusText}`)
    
    if (response.ok) {
      const data = await response.json()
      console.log("✅ Command sent successfully!")
      console.log(`🤖 Response: ${data.message}`)
    } else {
      const errorData = await response.text()
      console.log(`❌ Command failed: ${errorData}`)
    }
  } catch (error) {
    console.log(`❌ Send command error: ${error.message}`)
  }
}

async function testDatabase() {
  console.log("\n💾 Testing database connection...")
  
  try {
    const sqlite3 = require('sqlite3')
    const { open } = require('sqlite')
    const path = require('path')
    
    const dbPath = path.join(process.cwd(), 'data', 'techmac.db')
    console.log(`📁 Database path: ${dbPath}`)
    
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    })
    
    console.log("✅ Database connected!")
    
    // Test basic queries
    const userCount = await db.get('SELECT COUNT(*) as count FROM users')
    console.log(`👥 Total users: ${userCount.count}`)
    
    const activeUsers = await db.get("SELECT COUNT(*) as count FROM users WHERE status = 'active'")
    console.log(`✅ Active users: ${activeUsers.count}`)
    
    const pendingUsers = await db.get("SELECT COUNT(*) as count FROM users WHERE status = 'pending'")
    console.log(`⏳ Pending users: ${pendingUsers.count}`)
    
    await db.close()
    console.log("✅ Database test completed!")
    
  } catch (error) {
    console.error("❌ Database test failed:", error.message)
    console.log("💡 Make sure your database exists at ./data/techmac.db")
  }
}

async function runAllTests() {
  console.log("🧪 Starting comprehensive API test suite...\n")
  console.log("⚠️  Make sure your Next.js server is running: npm run dev\n")
  
  // Test database first
  await testDatabase()
  
  // Test authentication
  const token = await testLogin()
  
  // Test protected endpoints
  await testTelegramEndpoints(token)
  
  // Test POST endpoints
  await testPostEndpoints(token)
  
  console.log("\n🎉 All tests completed!")
  console.log("\n📝 Summary:")
  console.log("✅ If all tests passed, your API is working correctly")
  console.log("❌ If any tests failed, check the error messages above")
  console.log("🔧 Common issues: Missing dependencies, database not found, server not running")
}

// Check if this script is being run directly
if (require.main === module) {
  runAllTests().catch(console.error)
}

module.exports = { testLogin, testTelegramEndpoints, testPostEndpoints, testDatabase }