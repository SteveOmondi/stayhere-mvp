-- StayHere Database Initialization Script
-- Run this script in your PostgreSQL database to create the tables

-- Create the database if it doesn't exist (run this separately if needed)
-- CREATE DATABASE stayhere;

-- Connect to the stayhere database before running the rest

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20),
    full_name VARCHAR(255),
    entra_object_id VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'Tenant',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_login TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_entra ON users(entra_object_id);

-- Properties table
CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft',
    type VARCHAR(50) NOT NULL,
    monthly_rent DECIMAL(18,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'KES',
    street VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_properties_owner ON properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);

-- OTP Verifications table
CREATE TABLE IF NOT EXISTS otp_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target VARCHAR(255) NOT NULL,
    code VARCHAR(10) NOT NULL,
    expiry TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    attempts INT DEFAULT 0,
    type VARCHAR(20) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_otp_target_used ON otp_verifications(target, is_used);

-- Categories table (Static Data)
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    icon_url VARCHAR(500),
    country VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_country ON categories(country);
CREATE INDEX IF NOT EXISTS idx_categories_city ON categories(city);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_country_city ON categories(country, city);

-- Seed initial categories for Kenya
INSERT INTO categories (name, description, country, city, is_active, sort_order, created_at, updated_at) VALUES
('Apartments', 'Residential apartments for rent', 'Kenya', 'Nairobi', true, 1, NOW(), NOW()),
('Houses', 'Standalone houses and villas', 'Kenya', 'Nairobi', true, 2, NOW(), NOW()),
('Studios', 'Single room studio apartments', 'Kenya', 'Nairobi', true, 3, NOW(), NOW()),
('Offices', 'Commercial office spaces', 'Kenya', 'Nairobi', true, 4, NOW(), NOW()),
('Workspaces', 'Co-working and shared workspaces', 'Kenya', 'Nairobi', true, 5, NOW(), NOW()),
('Stalls', 'Market stalls and kiosks', 'Kenya', 'Nairobi', true, 6, NOW(), NOW()),
('Spaces', 'Open spaces and land for rent', 'Kenya', 'Nairobi', true, 7, NOW(), NOW()),
('Warehouses', 'Storage and warehouse facilities', 'Kenya', 'Nairobi', true, 8, NOW(), NOW()),
('Shops', 'Retail shop spaces', 'Kenya', 'Nairobi', true, 9, NOW(), NOW()),
('Bedsitters', 'Single room with kitchenette', 'Kenya', 'Nairobi', true, 10, NOW(), NOW());

-- Add categories for Mombasa
INSERT INTO categories (name, description, country, city, is_active, sort_order, created_at, updated_at) VALUES
('Apartments', 'Residential apartments for rent', 'Kenya', 'Mombasa', true, 1, NOW(), NOW()),
('Houses', 'Standalone houses and villas', 'Kenya', 'Mombasa', true, 2, NOW(), NOW()),
('Studios', 'Single room studio apartments', 'Kenya', 'Mombasa', true, 3, NOW(), NOW()),
('Offices', 'Commercial office spaces', 'Kenya', 'Mombasa', true, 4, NOW(), NOW()),
('Beach Houses', 'Coastal vacation rentals', 'Kenya', 'Mombasa', true, 5, NOW(), NOW());

-- Verify the data
SELECT * FROM categories ORDER BY city, sort_order;
