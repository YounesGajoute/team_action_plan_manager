const bcrypt = require('bcryptjs')
const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

// Configuration
const dbPath = path.join(__dirname, '../database.sqlite')

async function createUser() {
  try {
    console.log('?? Starting user creation process...')
    console.log('?? Database path:', dbPath)
    
    // Vérifiez si le fichier de base de données existe
    if (!fs.existsSync(dbPath)) {
      console.log('??  Database file does not exist, creating it...')
    }
    
    // Ouvrez la base de données
    const db = new Database(dbPath)
    console.log('? Database connection established')
    
    // Créez la table users si elle n'existe pas
    console.log('?? Creating/verifying users table...')
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'technician',
        password_hash VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('? Users table ready')
    
    // Vérifiez les utilisateurs existants
    console.log('\n?? Current users in database:')
    try {
      const existingUsers = db.prepare('SELECT id, username, full_name, role, is_active FROM users').all()
      if (existingUsers.length > 0) {
        console.table(existingUsers)
      } else {
        console.log('   No users found - database is empty')
      }
    } catch (error) {
      console.log('   Could not read existing users (table might be empty)')
    }
    
    // Créez les utilisateurs de test
    console.log('\n?? Creating users...')
    
    // 1. Utilisateur younes (manager)
    console.log('Creating user: younes')
    const younesPassword = await bcrypt.hash('password123', 10)
    
    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO users (id, username, full_name, role, password_hash, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `)
    
    insertStmt.run(2, 'younes', 'Younes Manager', 'manager', younesPassword, 1)
    console.log('? User younes created (ID: 2)')
    
    // 2. Utilisateur admin
    console.log('Creating user: admin')
    const adminPassword = await bcrypt.hash('admin123', 10)
    insertStmt.run(1, 'admin', 'Admin User', 'admin', adminPassword, 1)
    console.log('? User admin created (ID: 1)')
    
    // 3. Utilisateur technicien de test
    console.log('Creating user: tech1')
    const techPassword = await bcrypt.hash('tech123', 10)
    insertStmt.run(3, 'tech1', 'Ahmed Technician', 'technician', techPassword, 1)
    console.log('? User tech1 created (ID: 3)')
    
    // 4. Autre technicien
    console.log('Creating user: tech2')
    const tech2Password = await bcrypt.hash('tech123', 10)
    insertStmt.run(4, 'tech2', 'Mohamed Technician', 'technician', tech2Password, 1)
    console.log('? User tech2 created (ID: 4)')
    
    // Vérification finale
    console.log('\n?? Final verification - All users in database:')
    const allUsers = db.prepare('SELECT id, username, full_name, role, is_active FROM users ORDER BY id').all()
    console.table(allUsers)
    
    // Informations de connexion
    console.log('\n?? Users created successfully!')
    console.log('\n?? Login credentials:')
    console.log('+-----------------------------------------+')
    console.log('¦ ADMIN USER:                             ¦')
    console.log('¦ Username: admin                         ¦')
    console.log('¦ Password: admin123                      ¦')
    console.log('¦ Role: admin                             ¦')
    console.log('+-----------------------------------------¦')
    console.log('¦ MANAGER USER:                           ¦')
    console.log('¦ Username: younes                        ¦')
    console.log('¦ Password: password123                   ¦')
    console.log('¦ Role: manager                           ¦')
    console.log('+-----------------------------------------¦')
    console.log('¦ TECHNICIAN USERS:                       ¦')
    console.log('¦ Username: tech1 / Password: tech123     ¦')
    console.log('¦ Username: tech2 / Password: tech123     ¦')
    console.log('¦ Role: technician                        ¦')
    console.log('+-----------------------------------------+')
    
    // Fermez la base de données
    db.close()
    console.log('\n? Database connection closed')
    console.log('?? Ready to login! Restart your server with: npm run dev')
    
  } catch (error) {
    console.error('? Error creating users:', error.message)
    console.error('?? Full error:', error)
    process.exit(1)
  }
}

// Fonction pour supprimer tous les utilisateurs (utile pour reset)
async function resetUsers() {
  try {
    const db = new Database(dbPath)
    db.exec('DELETE FROM users')
    console.log('???  All users deleted')
    db.close()
  } catch (error) {
    console.error('? Error resetting users:', error.message)
  }
}

// Fonction pour lister les utilisateurs
async function listUsers() {
  try {
    const db = new Database(dbPath)
    const users = db.prepare('SELECT id, username, full_name, role, is_active, created_at FROM users ORDER BY id').all()
    console.log('\n?? Current users:')
    console.table(users)
    db.close()
  } catch (error) {
    console.error('? Error listing users:', error.message)
  }
}

// Gestion des arguments de ligne de commande
const command = process.argv[2]

switch (command) {
  case 'reset':
    console.log('???  Resetting all users...')
    resetUsers().then(() => createUser())
    break
  case 'list':
    listUsers()
    break
  case 'create':
  default:
    createUser()
    break
}

// Instructions d'utilisation
if (command === 'help' || command === '--help' || command === '-h') {
  console.log(`
?? Usage:
  node scripts/create-user.js          # Create default users
  node scripts/create-user.js create   # Create default users
  node scripts/create-user.js reset    # Delete all users and recreate
  node scripts/create-user.js list     # List all users
  node scripts/create-user.js help     # Show this help
  `)
}