CREATE TABLE IF NOT EXISTS managed_story_worlds (
    story_world_id VARCHAR(128) NOT NULL,
    payload_json JSON NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (story_world_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS managed_media_assets (
    id VARCHAR(36) NOT NULL,
    object_key VARCHAR(512) NOT NULL,
    url VARCHAR(1024) NOT NULL,
    byte_count INT NOT NULL,
    sha256 CHAR(64) NOT NULL,
    mime_type VARCHAR(64) NOT NULL,
    width INT NULL,
    height INT NULL,
    source_type VARCHAR(32) NOT NULL,
    source_note TEXT NOT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE INDEX uq_managed_media_assets_object_key (object_key),
    INDEX idx_managed_media_assets_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
