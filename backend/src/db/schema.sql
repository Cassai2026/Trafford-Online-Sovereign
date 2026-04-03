-- Trafford Online Sovereign OS — PostgreSQL Schema
-- Run: psql -U postgres -d trafford_sovereign -f schema.sql

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- optional: geospatial proximity queries

-- ============================================================
-- SOVEREIGN NODES (Community Members / Participants)
-- ============================================================
CREATE TABLE IF NOT EXISTS sovereign_nodes (
  id              SERIAL PRIMARY KEY,
  uuid            UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
  name            VARCHAR(255) NOT NULL,
  bio_roi         TEXT,                        -- Bio-ROI: personal return-on-investment statement
  skills          JSONB DEFAULT '[]',          -- I Can: array of skill strings
  constraints     JSONB DEFAULT '[]',          -- I Don't: array of constraint strings
  reputation_score NUMERIC(5,2) DEFAULT 0.00, -- 0.00–100.00
  location        POINT,                       -- lat,lng for proximity matching
  email           VARCHAR(255) UNIQUE,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_nodes_location ON sovereign_nodes USING GIST(location);
CREATE INDEX idx_nodes_skills   ON sovereign_nodes USING GIN(skills);

-- ============================================================
-- DEED OF SOVEREIGN TRANSFER
-- Tracks land/assets as financial liabilities for ECP/Trafford Council
-- while establishing foundation for NGO autonomy.
-- ============================================================
CREATE TABLE IF NOT EXISTS sovereign_deeds (
  id                  SERIAL PRIMARY KEY,
  uuid                UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
  asset_name          VARCHAR(255) NOT NULL,
  asset_type          VARCHAR(100) NOT NULL,  -- land | building | equipment | fund
  asset_description   TEXT,
  current_holder      VARCHAR(255) NOT NULL,  -- ECP / Trafford Council / Lilieth NGO
  beneficiary         VARCHAR(255),           -- intended sovereign beneficiary
  liability_value     NUMERIC(15,2) DEFAULT 0.00,
  liability_currency  CHAR(3) DEFAULT 'GBP',
  transfer_status     VARCHAR(50) DEFAULT 'pending', -- pending | in_progress | transferred | contested
  transfer_date       DATE,
  legal_reference     VARCHAR(255),
  notes               TEXT,
  created_by          INTEGER REFERENCES sovereign_nodes(id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MATERIALS EXCHANGE (Re-Works Physical Bridge)
-- Tracks timber, metal, appliances with QR code support
-- ============================================================
CREATE TABLE IF NOT EXISTS materials (
  id              SERIAL PRIMARY KEY,
  uuid            UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
  name            VARCHAR(255) NOT NULL,
  category        VARCHAR(100) NOT NULL,  -- timber | metal | appliance | textile | other
  description     TEXT,
  quantity        NUMERIC(10,2) DEFAULT 0,
  unit            VARCHAR(50) DEFAULT 'units',  -- kg | m | units | m2
  condition       VARCHAR(50) DEFAULT 'good',   -- new | good | fair | poor
  qr_code         TEXT,                         -- base64 PNG QR code
  location        VARCHAR(255),
  available       BOOLEAN DEFAULT TRUE,
  source_node_id  INTEGER REFERENCES sovereign_nodes(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SERVICE SWAP (Skill Matching)
-- Match "I Can" nodes with "I Need" nodes
-- ============================================================
CREATE TABLE IF NOT EXISTS service_swaps (
  id              SERIAL PRIMARY KEY,
  uuid            UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
  requester_id    INTEGER NOT NULL REFERENCES sovereign_nodes(id),
  provider_id     INTEGER REFERENCES sovereign_nodes(id),
  skill_needed    VARCHAR(255) NOT NULL,
  description     TEXT,
  location        VARCHAR(255) DEFAULT 'Stretford/Trafford',
  status          VARCHAR(50) DEFAULT 'open',  -- open | matched | in_progress | completed | cancelled
  matched_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- GOVERNANCE — 14+1 PILLARS AUDIT
-- Weekly automated logic gate for pillar balance
-- ============================================================
CREATE TABLE IF NOT EXISTS governance_pillars (
  id              SERIAL PRIMARY KEY,
  pillar_name     VARCHAR(255) NOT NULL UNIQUE,
  pillar_number   SMALLINT NOT NULL,           -- 1–15 (14+1)
  description     TEXT,
  is_active       BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS pillar_audits (
  id              SERIAL PRIMARY KEY,
  uuid            UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
  audit_week      DATE NOT NULL,               -- ISO week start (Monday)
  pillar_id       INTEGER NOT NULL REFERENCES governance_pillars(id),
  score           NUMERIC(5,2) NOT NULL,        -- 0–100
  is_balanced     BOOLEAN GENERATED ALWAYS AS (score >= 60.00) STORED,
  notes           TEXT,
  auditor_id      INTEGER REFERENCES sovereign_nodes(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_pillar_audit_week ON pillar_audits(audit_week, pillar_id);

-- Seed the 14+1 pillars
INSERT INTO governance_pillars (pillar_number, pillar_name, description) VALUES
  (1,  'Economic Sovereignty',    'Community controls its own financial flows'),
  (2,  'Land & Housing',          'Secure, affordable, community-held land'),
  (3,  'Food Security',           'Local, regenerative food production'),
  (4,  'Health & Wellbeing',      'Physical and mental health access for all'),
  (5,  'Education & Learning',    'Lifelong learning and skill-sharing'),
  (6,  'Energy & Environment',    'Renewable energy and ecological stewardship'),
  (7,  'Culture & Heritage',      'Preservation and celebration of local identity'),
  (8,  'Governance & Democracy',  'Participatory decision-making'),
  (9,  'Technology & Data',       'Community-owned, privacy-respecting tech'),
  (10, 'Safety & Justice',        'Restorative justice, community safety'),
  (11, 'Transport & Mobility',    'Clean, accessible transport'),
  (12, 'Care & Mutual Aid',       'Intergenerational and peer-to-peer care'),
  (13, 'Enterprise & Work',       'Fair, cooperative, local enterprise'),
  (14, 'Spirituality & Purpose',  'Meaning, ritual, and collective vision'),
  (15, 'The Mandate (15B Hearts)', 'Global compassion and sovereign alignment')
ON CONFLICT (pillar_name) DO NOTHING;

-- ============================================================
-- COMMUNITY SAFETY & VITALITY REPORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS safety_reports (
  id              SERIAL PRIMARY KEY,
  uuid            UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
  reporter_id     INTEGER REFERENCES sovereign_nodes(id),
  category        VARCHAR(100) NOT NULL,  -- health | safety | environment | social
  severity        VARCHAR(50) DEFAULT 'medium',  -- low | medium | high | critical
  title           VARCHAR(255) NOT NULL,
  description     TEXT NOT NULL,
  location        VARCHAR(255),
  lat             NUMERIC(10,7),
  lng             NUMERIC(10,7),
  status          VARCHAR(50) DEFAULT 'open',  -- open | acknowledged | resolved
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RE-WORKS INVENTORY (Biffa upcycled items, container progress)
-- ============================================================
CREATE TABLE IF NOT EXISTS reworks_inventory (
  id              SERIAL PRIMARY KEY,
  uuid            UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
  item_name       VARCHAR(255) NOT NULL,
  source          VARCHAR(100) DEFAULT 'biffa',  -- biffa | donation | salvage | purchase
  category        VARCHAR(100),
  quantity        INTEGER DEFAULT 0,
  unit            VARCHAR(50) DEFAULT 'units',
  container_id    VARCHAR(100),                  -- which container
  build_stage     VARCHAR(100),                  -- design | materials | build | complete
  transport_co2_kg NUMERIC(10,4),               -- transport pollution level (kg CO2)
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRANSPORT POLLUTION LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS transport_pollution (
  id              SERIAL PRIMARY KEY,
  recorded_at     TIMESTAMPTZ DEFAULT NOW(),
  location        VARCHAR(255),
  pm25_ug_m3      NUMERIC(8,3),  -- particulate matter 2.5
  pm10_ug_m3      NUMERIC(8,3),  -- particulate matter 10
  no2_ug_m3       NUMERIC(8,3),  -- nitrogen dioxide
  co2_ppm         NUMERIC(8,3),  -- carbon dioxide (ppm)
  eco_progress_pct NUMERIC(5,2), -- Eco-Empire progress offset (%)
  source          VARCHAR(100),  -- sensor | manual | api
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_nodes_updated_at
  BEFORE UPDATE ON sovereign_nodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_deeds_updated_at
  BEFORE UPDATE ON sovereign_deeds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_materials_updated_at
  BEFORE UPDATE ON materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_swaps_updated_at
  BEFORE UPDATE ON service_swaps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_safety_updated_at
  BEFORE UPDATE ON safety_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_reworks_updated_at
  BEFORE UPDATE ON reworks_inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
