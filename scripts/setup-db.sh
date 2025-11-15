#!/bin/bash

# SkyFi MCP Database Setup Script
# This script creates the database and runs the initialization SQL

set -e

echo "🚀 Setting up SkyFi MCP database..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Default values
DB_NAME=${DB_NAME:-skyfi_mcp}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-postgres}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}

echo "📊 Database configuration:"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"

# Check if PostgreSQL is running
if ! pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER > /dev/null 2>&1; then
    echo "❌ PostgreSQL is not running or not accessible"
    echo "   Please start PostgreSQL or use Docker Compose:"
    echo "   docker-compose up -d postgres"
    exit 1
fi

# Create database if it doesn't exist
echo "📦 Creating database if it doesn't exist..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -tc \
    "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c \
    "CREATE DATABASE $DB_NAME"

# Run initialization script
echo "🔧 Running database initialization script..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f scripts/init-db.sql

echo "✅ Database setup complete!"
echo ""
echo "You can now start the server with: npm run dev"

