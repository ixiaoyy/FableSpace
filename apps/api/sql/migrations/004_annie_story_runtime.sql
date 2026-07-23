CREATE TABLE IF NOT EXISTS player_story_states (
    player_id VARCHAR(64) NOT NULL,
    story_world_id VARCHAR(128) NOT NULL,
    player_role_id VARCHAR(128) NOT NULL,
    active_story_run_id VARCHAR(36) NULL,
    visit_count INT NOT NULL DEFAULT 0,
    last_visited_at DATETIME NOT NULL,
    completed_run_summaries JSON NOT NULL,
    PRIMARY KEY (player_id, story_world_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS story_runs (
    id VARCHAR(36) NOT NULL,
    player_id VARCHAR(64) NOT NULL,
    story_world_id VARCHAR(128) NOT NULL,
    content_version VARCHAR(128) NOT NULL,
    status VARCHAR(16) NOT NULL,
    current_chapter_id VARCHAR(128) NOT NULL,
    current_node_id VARCHAR(128) NOT NULL,
    key_choices JSON NOT NULL,
    story_flags JSON NOT NULL,
    private_memories JSON NOT NULL,
    ending_id VARCHAR(128) NULL,
    ending_summary TEXT NULL,
    started_at DATETIME NOT NULL,
    completed_at DATETIME NULL,
    PRIMARY KEY (id),
    INDEX idx_story_runs_player_world_status (player_id, story_world_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS character_relationships (
    story_run_id VARCHAR(36) NOT NULL,
    character_id VARCHAR(128) NOT NULL,
    affinity DOUBLE NOT NULL,
    stage VARCHAR(64) NOT NULL,
    last_change_reason TEXT NOT NULL,
    flags JSON NOT NULL,
    PRIMARY KEY (story_run_id, character_id),
    CONSTRAINT fk_character_relationships_story_run
        FOREIGN KEY (story_run_id) REFERENCES story_runs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS story_events (
    id VARCHAR(36) NOT NULL,
    story_run_id VARCHAR(36) NOT NULL,
    sequence INT NOT NULL,
    event_type VARCHAR(32) NOT NULL,
    character_id VARCHAR(128) NULL,
    role VARCHAR(16) NULL,
    content TEXT NOT NULL,
    source_kind VARCHAR(32) NOT NULL,
    source_id VARCHAR(128) NULL,
    payload JSON NOT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE INDEX uq_story_events_run_sequence (story_run_id, sequence),
    INDEX idx_story_events_run_source (story_run_id, source_kind, source_id),
    CONSTRAINT fk_story_events_story_run
        FOREIGN KEY (story_run_id) REFERENCES story_runs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
