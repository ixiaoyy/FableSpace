CREATE TABLE IF NOT EXISTS story_messages (
    id VARCHAR(36) NOT NULL,
    story_run_id VARCHAR(36) NOT NULL,
    sequence INT NOT NULL,
    `role` VARCHAR(16) NOT NULL,
    character_id VARCHAR(128) NULL,
    visible_to_character_ids JSON NOT NULL,
    content TEXT NOT NULL,
    source_event_id VARCHAR(36) NOT NULL,
    source_event_sequence INT NOT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE INDEX uq_story_messages_run_sequence (story_run_id, sequence),
    INDEX idx_story_messages_run_event (story_run_id, source_event_id),
    CONSTRAINT ck_story_messages_role
        CHECK (`role` IN ('player', 'character', 'system')),
    CONSTRAINT fk_story_messages_story_run
        FOREIGN KEY (story_run_id) REFERENCES story_runs(id) ON DELETE CASCADE,
    CONSTRAINT fk_story_messages_source_event
        FOREIGN KEY (source_event_id) REFERENCES story_events(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS private_memories (
    id VARCHAR(36) NOT NULL,
    story_run_id VARCHAR(36) NOT NULL,
    content TEXT NOT NULL,
    source_event_id VARCHAR(36) NOT NULL,
    source_event_sequence INT NOT NULL,
    character_id VARCHAR(128) NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_private_memories_run_created (story_run_id, created_at),
    INDEX idx_private_memories_run_event (story_run_id, source_event_id),
    CONSTRAINT fk_private_memories_story_run
        FOREIGN KEY (story_run_id) REFERENCES story_runs(id) ON DELETE CASCADE,
    CONSTRAINT fk_private_memories_source_event
        FOREIGN KEY (source_event_id) REFERENCES story_events(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
