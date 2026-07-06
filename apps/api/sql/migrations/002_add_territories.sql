-- FableMap MySQL 数据库 Schema 补丁
-- 版本: 0.1.1
-- 日期: 2026-05-08
-- 目的: 补充领地系统相关表

USE fablemap;

-- =============================================
-- 1. territories 表 - 领地系统
-- =============================================
CREATE TABLE IF NOT EXISTS territories (
    id VARCHAR(64) NOT NULL,
    owner_id VARCHAR(64) NOT NULL,
    tavern_id VARCHAR(64),
    type VARCHAR(32) NOT NULL,
    center_lat DOUBLE NOT NULL,
    center_lon DOUBLE NOT NULL,
    radius DOUBLE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'claimed',
    name VARCHAR(255),
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (tavern_id) REFERENCES taverns(id) ON DELETE SET NULL,
    INDEX idx_territory_owner (owner_id),
    INDEX idx_territory_tavern (tavern_id),
    INDEX idx_territory_location (center_lat, center_lon)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 2. state_cards 表 - Continuity 状态卡
-- =============================================
CREATE TABLE IF NOT EXISTS state_cards (
    id VARCHAR(64) NOT NULL,
    tavern_id VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    category VARCHAR(32) NOT NULL DEFAULT 'event_log',
    canon_scope VARCHAR(32) NOT NULL DEFAULT 'visitor',
    visitor_id VARCHAR(64) DEFAULT '',
    character_id VARCHAR(64) DEFAULT '',
    payload JSON,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id, tavern_id),
    FOREIGN KEY (tavern_id) REFERENCES taverns(id) ON DELETE CASCADE,
    INDEX idx_sc_tavern_status (tavern_id, status),
    INDEX idx_sc_updated (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 3. relationship_edges 表 - 空间关系图谱
-- =============================================
CREATE TABLE IF NOT EXISTS relationship_edges (
    id VARCHAR(64) NOT NULL,
    source_owner_id VARCHAR(64) NOT NULL DEFAULT '',
    source_tavern_id VARCHAR(64) NOT NULL DEFAULT '',
    source_node_type VARCHAR(32) NOT NULL,
    source_node_id VARCHAR(64) NOT NULL,
    target_owner_id VARCHAR(64) NOT NULL DEFAULT '',
    target_tavern_id VARCHAR(64) NOT NULL DEFAULT '',
    target_node_type VARCHAR(32) NOT NULL,
    target_node_id VARCHAR(64) NOT NULL,
    behavior_type VARCHAR(32) NOT NULL,
    display_name VARCHAR(255) DEFAULT '',
    description TEXT,
    strength_preset VARCHAR(32) NOT NULL DEFAULT 'normal',
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    governance_mode VARCHAR(32) NOT NULL DEFAULT 'manual',
    confirmed_by VARCHAR(64) DEFAULT '',
    confirmed_by_type VARCHAR(32) DEFAULT '',
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    `metadata` JSON,
    PRIMARY KEY (id),
    INDEX idx_rel_edge_source (source_node_type, source_node_id, status),
    INDEX idx_rel_edge_target (target_node_type, target_node_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
