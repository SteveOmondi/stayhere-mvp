-- Seed Categories for StayHere
-- Run this after EF Core migrations have created the tables

-- Seed initial categories for Kenya - Nairobi
INSERT INTO categories (id, name, description, country, city, is_active, sort_order, created_at, updated_at) VALUES
(gen_random_uuid(), 'Apartments', 'Residential apartments for rent', 'Kenya', 'Nairobi', true, 1, NOW(), NOW()),
(gen_random_uuid(), 'Houses', 'Standalone houses and villas', 'Kenya', 'Nairobi', true, 2, NOW(), NOW()),
(gen_random_uuid(), 'Studios', 'Single room studio apartments', 'Kenya', 'Nairobi', true, 3, NOW(), NOW()),
(gen_random_uuid(), 'Offices', 'Commercial office spaces', 'Kenya', 'Nairobi', true, 4, NOW(), NOW()),
(gen_random_uuid(), 'Workspaces', 'Co-working and shared workspaces', 'Kenya', 'Nairobi', true, 5, NOW(), NOW()),
(gen_random_uuid(), 'Stalls', 'Market stalls and kiosks', 'Kenya', 'Nairobi', true, 6, NOW(), NOW()),
(gen_random_uuid(), 'Spaces', 'Open spaces and land for rent', 'Kenya', 'Nairobi', true, 7, NOW(), NOW()),
(gen_random_uuid(), 'Warehouses', 'Storage and warehouse facilities', 'Kenya', 'Nairobi', true, 8, NOW(), NOW()),
(gen_random_uuid(), 'Shops', 'Retail shop spaces', 'Kenya', 'Nairobi', true, 9, NOW(), NOW()),
(gen_random_uuid(), 'Bedsitters', 'Single room with kitchenette', 'Kenya', 'Nairobi', true, 10, NOW(), NOW());

-- Seed categories for Kenya - Mombasa
INSERT INTO categories (id, name, description, country, city, is_active, sort_order, created_at, updated_at) VALUES
(gen_random_uuid(), 'Apartments', 'Residential apartments for rent', 'Kenya', 'Mombasa', true, 1, NOW(), NOW()),
(gen_random_uuid(), 'Houses', 'Standalone houses and villas', 'Kenya', 'Mombasa', true, 2, NOW(), NOW()),
(gen_random_uuid(), 'Studios', 'Single room studio apartments', 'Kenya', 'Mombasa', true, 3, NOW(), NOW()),
(gen_random_uuid(), 'Offices', 'Commercial office spaces', 'Kenya', 'Mombasa', true, 4, NOW(), NOW()),
(gen_random_uuid(), 'Beach Houses', 'Coastal vacation rentals', 'Kenya', 'Mombasa', true, 5, NOW(), NOW());

-- Verify the data
SELECT id, name, city, sort_order FROM categories ORDER BY city, sort_order;
