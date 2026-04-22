-- FableMap MySQL 数据库 Schema
-- 版本: 0.1.0
-- 日期: 2026-04-22
-- 用于手动创建数据库表，或参考 SQLAlchemy 自动建表

-- =============================================
-- 创建数据库
-- =============================================
CREATE DATABASE IF NOT EXISTS fablemap
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;

USE fablemap;

-- =============================================
-- 1. taverns 表 - 主酒馆表
-- =============================================
CREATE TABLE IF NOT EXISTS taverns (
    id VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    lat DOUBLE NOT NULL,
    lon DOUBLE NOT NULL,
    address VARCHAR(500) DEFAULT '',
    owner_id VARCHAR(64) NOT NULL DEFAULT 'system_public_welfare',
    created_at DATETIME NOT NULL,
    access ENUM('public', 'password', 'private') DEFAULT 'public',
    password_hash VARCHAR(128) DEFAULT '',
    status ENUM('open', 'closed') DEFAULT 'closed',
    scene_prompt TEXT,
    visit_count INT DEFAULT 0,
    group_chat_enabled BOOLEAN DEFAULT FALSE,
    group_chat_config JSON,
    -- JSON 字段存储复杂数据
    `groups` JSON,
    bookmarks JSON,
    chat_templates JSON,
    gameplay_definitions JSON,
    output_rules JSON,
    prompt_blocks JSON,
    runtime_presets JSON,
    active_preset_id VARCHAR(64) DEFAULT '',
    memory_policy JSON,
    voice_config JSON,
    PRIMARY KEY (id),
    INDEX idx_owner_id (owner_id),
    INDEX idx_access (access),
    INDEX idx_location (lat, lon),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 2. characters 表 - 角色表
-- =============================================
CREATE TABLE IF NOT EXISTS characters (
    id VARCHAR(64) NOT NULL,
    tavern_id VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    personality TEXT,
    scenario TEXT,
    system_prompt TEXT,
    first_mes TEXT,
    mes_example TEXT,
    alternate_greetings JSON,
    tags JSON,
    sprites JSON,
    avatar VARCHAR(500) DEFAULT '',
    appearance JSON,
    talkativeness DOUBLE DEFAULT 0.5,
    PRIMARY KEY (id),
    FOREIGN KEY (tavern_id) REFERENCES taverns(id) ON DELETE CASCADE,
    INDEX idx_char_tavern_id (tavern_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 3. world_info 表 - 世界知识表
-- =============================================
CREATE TABLE IF NOT EXISTS world_info (
    id VARCHAR(64) NOT NULL,
    tavern_id VARCHAR(64) NOT NULL,
    `keys` JSON NOT NULL,
    content TEXT NOT NULL,
    keys_secondary JSON,
    selective BOOLEAN DEFAULT TRUE,
    `constant` BOOLEAN DEFAULT FALSE,
    `depth` INT DEFAULT 4,
    `order` INT DEFAULT 100,
    probability INT DEFAULT 100,
    disable BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (id),
    FOREIGN KEY (tavern_id) REFERENCES taverns(id) ON DELETE CASCADE,
    INDEX idx_wi_tavern_id (tavern_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 4. visitors 表 - 访客状态表
-- =============================================
CREATE TABLE IF NOT EXISTS visitors (
    id VARCHAR(64) NOT NULL,
    tavern_id VARCHAR(64) NOT NULL,
    visitor_id VARCHAR(64) NOT NULL,
    visit_count INT DEFAULT 0,
    first_visit DATETIME,
    last_visit DATETIME,
    relationship_strength DOUBLE DEFAULT 0.0,
    relationship_stage VARCHAR(32) DEFAULT 'stranger',
    PRIMARY KEY (id),
    UNIQUE KEY uk_tavern_visitor (tavern_id, visitor_id),
    FOREIGN KEY (tavern_id) REFERENCES taverns(id) ON DELETE CASCADE,
    INDEX idx_visitor_id (visitor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 5. chat_messages 表 - 聊天消息表
-- =============================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id VARCHAR(64) NOT NULL,
    tavern_id VARCHAR(64) NOT NULL,
    character_id VARCHAR(64) NOT NULL,
    visitor_id VARCHAR(64) NOT NULL,
    visitor_name VARCHAR(64) DEFAULT '',
    role ENUM('user', 'assistant') NOT NULL,
    content TEXT NOT NULL,
    timestamp DATETIME NOT NULL,
    token_count INT DEFAULT 0,
    PRIMARY KEY (id),
    FOREIGN KEY (tavern_id) REFERENCES taverns(id) ON DELETE CASCADE,
    INDEX idx_cm_tavern_visitor (tavern_id, visitor_id),
    INDEX idx_cm_tavern_character (tavern_id, character_id),
    INDEX idx_cm_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 6. memory_atoms 表 - 记忆原子表
-- =============================================
CREATE TABLE IF NOT EXISTS memory_atoms (
    id VARCHAR(64) NOT NULL,
    tavern_id VARCHAR(64) NOT NULL,
    scope VARCHAR(32) NOT NULL,
    dimension VARCHAR(32) NOT NULL,
    horizon VARCHAR(32) NOT NULL,
    subject VARCHAR(255),
    content TEXT NOT NULL,
    importance DOUBLE DEFAULT 0.5,
    confidence DOUBLE DEFAULT 0.5,
    source_message_ids JSON,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    pinned BOOLEAN DEFAULT FALSE,
    visibility VARCHAR(32) DEFAULT 'tavern',
    visitor_id VARCHAR(64),
    character_id VARCHAR(64),
    place_id VARCHAR(64),
    created_by VARCHAR(64),
    metadata JSON,
    PRIMARY KEY (id),
    FOREIGN KEY (tavern_id) REFERENCES taverns(id) ON DELETE CASCADE,
    INDEX idx_ma_tavern_id (tavern_id),
    INDEX idx_ma_subject (subject),
    INDEX idx_ma_horizon (horizon)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 7. gameplay_sessions 表 - 玩法会话表
-- =============================================
CREATE TABLE IF NOT EXISTS gameplay_sessions (
    id VARCHAR(64) NOT NULL,
    tavern_id VARCHAR(64) NOT NULL,
    gameplay_id VARCHAR(64) NOT NULL,
    visitor_id VARCHAR(64) NOT NULL,
    character_id VARCHAR(64),
    state ENUM('started', 'in_progress', 'completed', 'abandoned') DEFAULT 'started',
    current_node_id VARCHAR(64),
    turn_count INT DEFAULT 0,
    events JSON,
    completion JSON,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (tavern_id) REFERENCES taverns(id) ON DELETE CASCADE,
    INDEX idx_gs_tavern_visitor (tavern_id, visitor_id),
    INDEX idx_gs_state (state)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 8. llm_configs 表 - LLM 配置表（密钥库）
-- =============================================
CREATE TABLE IF NOT EXISTS llm_configs (
    tavern_id VARCHAR(64) NOT NULL,
    backend VARCHAR(32) NOT NULL DEFAULT 'openai',
    model VARCHAR(128) DEFAULT 'gpt-4o-mini',
    api_key VARCHAR(512),
    base_url VARCHAR(512),
    temperature DOUBLE DEFAULT 0.8,
    max_tokens INT DEFAULT 512,
    top_p DOUBLE DEFAULT 1.0,
    token_used INT DEFAULT 0,
    PRIMARY KEY (tavern_id),
    FOREIGN KEY (tavern_id) REFERENCES taverns(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 完成
-- =============================================
-- 表已创建完成。
-- 可以使用以下命令验证：
-- SHOW TABLES;
-- SHOW CREATE TABLE taverns;
