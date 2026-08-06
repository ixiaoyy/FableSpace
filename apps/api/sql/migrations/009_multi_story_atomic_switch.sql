-- FableSpace multi-story and long-memory atomic hard switch.
--
-- This migration is intentionally not idempotent and must never run during
-- application startup or ordinary deploy.  The controlled manual workflow
-- supplies session-local plan tables generated from two identical, redacted
-- preflight snapshots after writes stop.  The workflow also enables MySQL
-- read_only before the final snapshot and restores its exact prior OFF state
-- on every exit; this privileged root session is the sole migration writer.
-- MySQL DDL implicitly commits: any
-- failure after the first DELETE keeps all FableSpace services stopped and is
-- recovered only from the verified full logical backup after separate approval.

DROP PROCEDURE IF EXISTS `_fablespace_migration_009_multi_story_atomic_switch`;

DELIMITER $$

CREATE PROCEDURE `_fablespace_migration_009_multi_story_atomic_switch`()
BEGIN
    DECLARE baseline_table_count INT DEFAULT 0;
    DECLARE target_only_table_count INT DEFAULT 0;
    DECLARE plan_meta_count INT DEFAULT 0;
    DECLARE private_memory_count INT DEFAULT 0;
    DECLARE target_run_count INT DEFAULT 0;
    DECLARE target_active_reference_count INT DEFAULT 0;
    DECLARE target_summary_reference_count INT DEFAULT 0;
    DECLARE actual_count INT DEFAULT 0;
    DECLARE expected_count INT DEFAULT 0;
    DECLARE exact_match_count INT DEFAULT 0;
    DECLARE missing_message_count INT DEFAULT 0;
    DECLARE message_conflict_count INT DEFAULT 0;
    DECLARE final_table_count INT DEFAULT 0;
    DECLARE delete_run_id VARCHAR(36);
    DECLARE delete_player_id VARCHAR(64);
    DECLARE delete_story_world_id VARCHAR(128);
    DECLARE delete_run_fingerprint CHAR(64);
    DECLARE delete_run_fingerprint_payload LONGTEXT;
    DECLARE actual_run_fingerprint CHAR(64);
    DECLARE delete_relationship_count INT;
    DECLARE delete_relationship_hash CHAR(64);
    DECLARE delete_relationship_hash_payload LONGTEXT;
    DECLARE actual_relationship_hash CHAR(64);
    DECLARE delete_message_count INT;
    DECLARE delete_message_hash CHAR(64);
    DECLARE delete_message_hash_payload LONGTEXT;
    DECLARE actual_message_hash CHAR(64);
    DECLARE delete_event_count INT;
    DECLARE delete_event_hash CHAR(64);
    DECLARE delete_event_hash_payload LONGTEXT;
    DECLARE actual_event_hash CHAR(64);
    DECLARE delete_memory_count INT;
    DECLARE baseline_run_count INT;
    DECLARE baseline_relationship_count INT;
    DECLARE baseline_message_count INT;
    DECLARE baseline_event_count INT;
    DECLARE surviving_run_count INT;
    DECLARE surviving_old_relationship_count INT;

    IF DATABASE() IS NULL OR DATABASE() <> 'fablespace' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FableSpace 009 requires the fixed fablespace database';
    END IF;

    IF @@GLOBAL.read_only <> 1 OR @@GLOBAL.super_read_only <> 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FableSpace 009 requires the workflow database write exclusion';
    END IF;

    SELECT COUNT(*)
    INTO baseline_table_count
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_TYPE = 'BASE TABLE'
      AND TABLE_NAME IN (
          'player_story_states',
          'story_runs',
          'character_relationships',
          'story_events',
          'story_messages',
          'private_memories',
          'managed_story_worlds',
          'managed_media_assets'
      );

    SELECT COUNT(*)
    INTO target_only_table_count
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_TYPE = 'BASE TABLE'
      AND TABLE_NAME IN (
          'player_story_progress',
          'private_memory_sources',
          'memory_formation_jobs',
          '_fablespace_009_character_relationships_new'
      );

    SELECT COUNT(*)
    INTO actual_count
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_TYPE = 'BASE TABLE';

    IF baseline_table_count <> 8 OR actual_count <> 8 OR target_only_table_count <> 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FableSpace 009 requires the exact eight-table baseline';
    END IF;

    SELECT COUNT(*)
    INTO plan_meta_count
    FROM `_fablespace_009_plan_meta`
    WHERE migration_id = '009_multi_story_atomic_switch';

    IF plan_meta_count <> 1 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FableSpace 009 requires exactly one validated plan';
    END IF;

    SELECT
        plan.delete_run_id,
        plan.delete_player_id,
        plan.delete_story_world_id,
        plan.delete_run_fingerprint,
        plan.delete_run_fingerprint_payload,
        plan.delete_relationship_count,
        plan.delete_relationship_hash,
        plan.delete_relationship_hash_payload,
        plan.delete_message_count,
        plan.delete_message_hash,
        plan.delete_message_hash_payload,
        plan.delete_event_count,
        plan.delete_event_hash,
        plan.delete_event_hash_payload,
        plan.delete_memory_count,
        plan.baseline_run_count,
        plan.baseline_relationship_count,
        plan.baseline_message_count,
        plan.baseline_event_count,
        plan.surviving_run_count,
        plan.surviving_old_relationship_count
    INTO
        delete_run_id,
        delete_player_id,
        delete_story_world_id,
        delete_run_fingerprint,
        delete_run_fingerprint_payload,
        delete_relationship_count,
        delete_relationship_hash,
        delete_relationship_hash_payload,
        delete_message_count,
        delete_message_hash,
        delete_message_hash_payload,
        delete_event_count,
        delete_event_hash,
        delete_event_hash_payload,
        delete_memory_count,
        baseline_run_count,
        baseline_relationship_count,
        baseline_message_count,
        baseline_event_count,
        surviving_run_count,
        surviving_old_relationship_count
    FROM `_fablespace_009_plan_meta` AS plan
    WHERE plan.migration_id = '009_multi_story_atomic_switch';

    SELECT COUNT(*) INTO private_memory_count FROM `private_memories`;
    IF private_memory_count <> 0 OR delete_memory_count <> 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FableSpace 009 requires zero legacy private memories';
    END IF;

    SELECT COUNT(*)
    INTO target_run_count
    FROM `story_runs`
    WHERE id = delete_run_id
      AND player_id = delete_player_id
      AND story_world_id = delete_story_world_id
      AND story_world_id = 'history_broad_street_water_1854'
      AND status = 'completed'
      AND completed_at IS NOT NULL
      AND ending_id IS NULL
      AND ending_summary IS NULL
      AND content_version = 'annie-broad-street-2026-07-27.1'
      AND player_role_id = 'role_history_broad_street_beggar';

    IF target_run_count <> 1 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FableSpace 009 exact legacy deletion target changed';
    END IF;

    SELECT COUNT(*)
    INTO target_active_reference_count
    FROM `player_story_states`
    WHERE active_story_run_id = delete_run_id;

    SELECT COUNT(*)
    INTO target_summary_reference_count
    FROM `player_story_states`
    WHERE JSON_SEARCH(completed_run_summaries, 'one', delete_run_id) IS NOT NULL;

    IF target_active_reference_count <> 0 OR target_summary_reference_count <> 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FableSpace 009 deletion target is referenced by player progress';
    END IF;

    SELECT COUNT(*) INTO actual_count
    FROM `character_relationships`
    WHERE story_run_id = delete_run_id;
    IF actual_count <> delete_relationship_count THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FableSpace 009 relationship child count drifted';
    END IF;

    SELECT COUNT(*) INTO actual_count
    FROM `story_messages`
    WHERE story_run_id = delete_run_id;
    IF actual_count <> delete_message_count THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FableSpace 009 message child count drifted';
    END IF;

    SELECT COUNT(*) INTO actual_count
    FROM `story_events`
    WHERE story_run_id = delete_run_id;
    IF actual_count <> delete_event_count THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FableSpace 009 event child count drifted';
    END IF;

    SELECT COUNT(*) INTO actual_count FROM `story_runs`;
    IF actual_count <> surviving_run_count + 1 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FableSpace 009 StoryRun count drifted';
    END IF;

    SELECT COUNT(*) INTO actual_count FROM `player_story_states`;
    SELECT COUNT(*) INTO expected_count FROM `_fablespace_009_plan_progress`;
    IF actual_count <> expected_count THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FableSpace 009 progress plan does not cover every state';
    END IF;

    SELECT COUNT(*) INTO actual_count
    FROM `character_relationships`
    WHERE story_run_id <> delete_run_id;
    IF actual_count <> surviving_old_relationship_count THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FableSpace 009 relationship plan baseline drifted';
    END IF;

    SELECT COUNT(*) INTO actual_count FROM `managed_story_worlds`;
    SELECT COUNT(*) INTO expected_count FROM `_fablespace_009_plan_managed_worlds`;
    IF actual_count <> 2 OR expected_count <> actual_count THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FableSpace 009 requires both fixed managed StoryWorld plans';
    END IF;

    SELECT COUNT(*)
    INTO message_conflict_count
    FROM `story_messages` AS existing_message
    LEFT JOIN `_fablespace_009_plan_messages` AS planned_message
      ON planned_message.source_event_id = existing_message.source_event_id
    WHERE existing_message.story_run_id <> delete_run_id
      AND (
          planned_message.id IS NULL
          OR NOT (existing_message.id <=> planned_message.id)
          OR NOT (existing_message.story_run_id <=> planned_message.story_run_id)
          OR NOT (existing_message.sequence <=> planned_message.sequence)
          OR NOT (existing_message.`role` <=> planned_message.`role`)
          OR NOT (existing_message.character_id <=> planned_message.character_id)
          OR NOT (existing_message.visible_to_character_ids <=> planned_message.visible_to_character_ids)
          OR NOT (existing_message.content <=> planned_message.content)
          OR NOT (existing_message.source_event_sequence <=> planned_message.source_event_sequence)
          OR NOT (existing_message.created_at <=> planned_message.created_at)
      );

    IF message_conflict_count <> 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FableSpace 009 existing StoryMessage projection conflicts';
    END IF;

    -- Re-bind the canonical hash preimages to exact live rows immediately before
    -- deletion.  Hashing a carried preimage is accepted only after every binary,
    -- JSON, numeric and datetime field has matched its session-local planned row.
    -- This detects same-count mutations while MySQL read_only excludes every
    -- non-administrative writer; only this privileged migration session may write.
    IF @@GLOBAL.read_only <> 1 OR @@GLOBAL.super_read_only <> 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FableSpace 009 database write exclusion was lost';
    END IF;

    SELECT COUNT(*) INTO actual_count FROM `story_runs`;
    IF actual_count <> baseline_run_count THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FableSpace 009 StoryRun baseline count drifted';
    END IF;
    SELECT COUNT(*) INTO actual_count FROM `character_relationships`;
    IF actual_count <> baseline_relationship_count THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FableSpace 009 relationship baseline count drifted';
    END IF;
    SELECT COUNT(*) INTO actual_count FROM `story_messages`;
    IF actual_count <> baseline_message_count THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FableSpace 009 message baseline count drifted';
    END IF;
    SELECT COUNT(*) INTO actual_count FROM `story_events`;
    IF actual_count <> baseline_event_count THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FableSpace 009 event baseline count drifted';
    END IF;

    SELECT COUNT(*) INTO expected_count
    FROM `_fablespace_009_plan_delete_run`;

    SELECT COUNT(*) INTO exact_match_count
    FROM `story_runs` AS live_run
    JOIN `_fablespace_009_plan_delete_run` AS planned_run
      ON BINARY live_run.id = BINARY planned_run.id
     AND BINARY live_run.player_id = BINARY planned_run.player_id
     AND BINARY live_run.story_world_id = BINARY planned_run.story_world_id
     AND BINARY live_run.content_version = BINARY planned_run.content_version
     AND BINARY live_run.player_role_id = BINARY planned_run.player_role_id
     AND BINARY live_run.status = BINARY planned_run.status
     AND BINARY live_run.current_chapter_id = BINARY planned_run.current_chapter_id
     AND BINARY live_run.current_node_id = BINARY planned_run.current_node_id
     AND live_run.key_choices <=> planned_run.key_choices
     AND live_run.story_flags <=> planned_run.story_flags
     AND (BINARY live_run.ending_id <=> BINARY planned_run.ending_id)
     AND (BINARY live_run.ending_summary <=> BINARY planned_run.ending_summary)
     AND live_run.started_at <=> planned_run.started_at
     AND live_run.completed_at <=> planned_run.completed_at
    WHERE BINARY live_run.id = BINARY delete_run_id
      AND BINARY live_run.player_id = BINARY delete_player_id
      AND BINARY live_run.story_world_id = BINARY delete_story_world_id;

    SET actual_run_fingerprint = IF(
        exact_match_count = 1,
        LOWER(SHA2(CONVERT(delete_run_fingerprint_payload USING utf8mb4), 256)),
        NULL
    );
    IF expected_count <> 1
       OR exact_match_count <> 1
       OR NOT (BINARY actual_run_fingerprint <=> BINARY delete_run_fingerprint) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FableSpace 009 StoryRunFingerprintV1 drifted';
    END IF;

    SELECT COUNT(*) INTO expected_count
    FROM `_fablespace_009_plan_delete_relationships`;
    SELECT COUNT(*) INTO actual_count
    FROM `character_relationships`
    WHERE BINARY story_run_id = BINARY delete_run_id;
    SELECT COUNT(*) INTO exact_match_count
    FROM `character_relationships` AS live_relationship
    JOIN `_fablespace_009_plan_delete_relationships` AS planned_relationship
      ON BINARY live_relationship.story_run_id = BINARY planned_relationship.story_run_id
     AND BINARY live_relationship.character_id = BINARY planned_relationship.character_id
     AND live_relationship.affinity <=> planned_relationship.affinity
     AND BINARY live_relationship.stage = BINARY planned_relationship.stage
     AND BINARY live_relationship.last_change_reason = BINARY planned_relationship.last_change_reason
     AND live_relationship.flags <=> planned_relationship.flags
    WHERE BINARY live_relationship.story_run_id = BINARY delete_run_id;
    SET actual_relationship_hash = IF(
        exact_match_count = delete_relationship_count
            AND actual_count = delete_relationship_count,
        LOWER(SHA2(CONVERT(delete_relationship_hash_payload USING utf8mb4), 256)),
        NULL
    );
    IF expected_count <> delete_relationship_count
       OR actual_count <> delete_relationship_count
       OR exact_match_count <> delete_relationship_count
       OR NOT (BINARY actual_relationship_hash <=> BINARY delete_relationship_hash) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FableSpace 009 relationship child rowset hash drifted';
    END IF;

    SELECT COUNT(*) INTO expected_count
    FROM `_fablespace_009_plan_delete_messages`;
    SELECT COUNT(*) INTO actual_count
    FROM `story_messages`
    WHERE BINARY story_run_id = BINARY delete_run_id;
    SELECT COUNT(*) INTO exact_match_count
    FROM `story_messages` AS live_message
    JOIN `_fablespace_009_plan_delete_messages` AS planned_message
      ON BINARY live_message.id = BINARY planned_message.id
     AND BINARY live_message.story_run_id = BINARY planned_message.story_run_id
     AND live_message.sequence <=> planned_message.sequence
     AND BINARY live_message.`role` = BINARY planned_message.`role`
     AND (BINARY live_message.character_id <=> BINARY planned_message.character_id)
     AND live_message.visible_to_character_ids <=> planned_message.visible_to_character_ids
     AND BINARY live_message.content = BINARY planned_message.content
     AND BINARY live_message.source_event_id = BINARY planned_message.source_event_id
     AND live_message.source_event_sequence <=> planned_message.source_event_sequence
     AND live_message.created_at <=> planned_message.created_at
    WHERE BINARY live_message.story_run_id = BINARY delete_run_id;
    SET actual_message_hash = IF(
        exact_match_count = delete_message_count
            AND actual_count = delete_message_count,
        LOWER(SHA2(CONVERT(delete_message_hash_payload USING utf8mb4), 256)),
        NULL
    );
    IF expected_count <> delete_message_count
       OR actual_count <> delete_message_count
       OR exact_match_count <> delete_message_count
       OR NOT (BINARY actual_message_hash <=> BINARY delete_message_hash) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FableSpace 009 message child rowset hash drifted';
    END IF;

    SELECT COUNT(*) INTO expected_count
    FROM `_fablespace_009_plan_delete_events`;
    SELECT COUNT(*) INTO actual_count
    FROM `story_events`
    WHERE BINARY story_run_id = BINARY delete_run_id;
    SELECT COUNT(*) INTO exact_match_count
    FROM `story_events` AS live_event
    JOIN `_fablespace_009_plan_delete_events` AS planned_event
      ON BINARY live_event.id = BINARY planned_event.id
     AND BINARY live_event.story_run_id = BINARY planned_event.story_run_id
     AND live_event.sequence <=> planned_event.sequence
     AND BINARY live_event.event_type = BINARY planned_event.event_type
     AND (BINARY live_event.character_id <=> BINARY planned_event.character_id)
     AND (BINARY live_event.`role` <=> BINARY planned_event.`role`)
     AND BINARY live_event.content = BINARY planned_event.content
     AND BINARY live_event.source_kind = BINARY planned_event.source_kind
     AND (BINARY live_event.source_id <=> BINARY planned_event.source_id)
     AND live_event.payload <=> planned_event.payload
     AND live_event.created_at <=> planned_event.created_at
    WHERE BINARY live_event.story_run_id = BINARY delete_run_id;
    SET actual_event_hash = IF(
        exact_match_count = delete_event_count
            AND actual_count = delete_event_count,
        LOWER(SHA2(CONVERT(delete_event_hash_payload USING utf8mb4), 256)),
        NULL
    );
    IF expected_count <> delete_event_count
       OR actual_count <> delete_event_count
       OR exact_match_count <> delete_event_count
       OR NOT (BINARY actual_event_hash <=> BINARY delete_event_hash) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FableSpace 009 event child rowset hash drifted';
    END IF;

    -- First irreversible business write.  Every approved row is now locked to
    -- the generated plan by exact values, fingerprint, counts and rowset hashes.
    DELETE FROM `character_relationships`
    WHERE story_run_id = delete_run_id;
    IF ROW_COUNT() <> delete_relationship_count THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FableSpace 009 relationship deletion count mismatch';
    END IF;

    DELETE FROM `story_messages`
    WHERE story_run_id = delete_run_id;
    IF ROW_COUNT() <> delete_message_count THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FableSpace 009 message deletion count mismatch';
    END IF;

    DELETE FROM `story_events`
    WHERE story_run_id = delete_run_id;
    IF ROW_COUNT() <> delete_event_count THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FableSpace 009 event deletion count mismatch';
    END IF;

    DELETE FROM `story_runs`
    WHERE id = delete_run_id
      AND player_id = delete_player_id
      AND story_world_id = delete_story_world_id
      AND story_world_id = 'history_broad_street_water_1854'
      AND status = 'completed'
      AND completed_at IS NOT NULL
      AND ending_id IS NULL
      AND ending_summary IS NULL
      AND content_version = 'annie-broad-street-2026-07-27.1'
      AND player_role_id = 'role_history_broad_street_beggar';
    IF ROW_COUNT() <> 1 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FableSpace 009 parent deletion count mismatch';
    END IF;

    SELECT COUNT(*) INTO actual_count FROM `story_runs`;
    IF actual_count <> baseline_run_count - 1 OR actual_count <> surviving_run_count THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FableSpace 009 StoryRun post-delete count mismatch';
    END IF;

    SELECT COUNT(*) INTO actual_count FROM `character_relationships`;
    IF actual_count <> baseline_relationship_count - delete_relationship_count
       OR actual_count <> surviving_old_relationship_count THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FableSpace 009 relationship post-delete count mismatch';
    END IF;

    SELECT COUNT(*) INTO actual_count FROM `story_messages`;
    IF actual_count <> baseline_message_count - delete_message_count THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FableSpace 009 message post-delete count mismatch';
    END IF;

    SELECT COUNT(*) INTO actual_count FROM `story_events`;
    IF actual_count <> baseline_event_count - delete_event_count THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FableSpace 009 event post-delete count mismatch';
    END IF;

    SELECT
        (SELECT COUNT(*) FROM `story_runs` WHERE BINARY id = BINARY delete_run_id)
        + (SELECT COUNT(*) FROM `character_relationships` WHERE BINARY story_run_id = BINARY delete_run_id)
        + (SELECT COUNT(*) FROM `story_messages` WHERE BINARY story_run_id = BINARY delete_run_id)
        + (SELECT COUNT(*) FROM `story_events` WHERE BINARY story_run_id = BINARY delete_run_id)
    INTO actual_count;
    IF actual_count <> 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FableSpace 009 deletion target or child survived';
    END IF;

    ALTER TABLE `story_runs`
        ADD COLUMN `story_id` VARCHAR(128) NULL AFTER `story_world_id`;

    UPDATE `story_runs`
    SET story_id = CASE story_world_id
        WHEN 'history_broad_street_water_1854' THEN 'broad_street_water_1854'
        WHEN 'story_palace_snow_edict' THEN 'palace_snow_edict'
        ELSE NULL
    END;

    SELECT COUNT(*) INTO actual_count
    FROM `story_runs`
    WHERE story_id IS NULL;
    IF actual_count <> 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FableSpace 009 found an unmapped surviving StoryRun';
    END IF;

    SELECT COUNT(*) INTO actual_count
    FROM `story_runs` AS story_run
    LEFT JOIN `player_story_states` AS player_state
      ON player_state.player_id = story_run.player_id
     AND player_state.story_world_id = story_run.story_world_id
    WHERE player_state.player_id IS NULL;
    IF actual_count <> 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FableSpace 009 found an unowned surviving StoryRun';
    END IF;

    SELECT COUNT(*) INTO actual_count
    FROM (
        SELECT player_id, story_world_id, story_id
        FROM `story_runs`
        WHERE status = 'active'
        GROUP BY player_id, story_world_id, story_id
        HAVING COUNT(*) > 1
    ) AS duplicate_active_runs;
    IF actual_count <> 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FableSpace 009 found multiple active runs for one story';
    END IF;

    ALTER TABLE `story_runs`
        MODIFY COLUMN `story_id` VARCHAR(128) NOT NULL,
        ADD COLUMN `active_slot` TINYINT
            GENERATED ALWAYS AS (CASE WHEN status = 'active' THEN 1 ELSE NULL END) STORED
            AFTER `status`,
        DROP INDEX `idx_story_runs_player_world_status`,
        ADD CONSTRAINT `fk_story_runs_state`
            FOREIGN KEY (`player_id`, `story_world_id`)
            REFERENCES `player_story_states` (`player_id`, `story_world_id`)
            ON DELETE CASCADE,
        ADD CONSTRAINT `ck_story_runs_status`
            CHECK (status IN ('active', 'completed')),
        ADD CONSTRAINT `uq_story_runs_player_world_story_active`
            UNIQUE (`player_id`, `story_world_id`, `story_id`, `active_slot`),
        ADD CONSTRAINT `uq_story_runs_owner_story_id`
            UNIQUE (`player_id`, `story_world_id`, `story_id`, `id`),
        ADD INDEX `idx_story_runs_player_world_story_status`
            (`player_id`, `story_world_id`, `story_id`, `status`, `completed_at`);

    CREATE TABLE `player_story_progress` (
        `player_id` VARCHAR(64) NOT NULL,
        `story_world_id` VARCHAR(128) NOT NULL,
        `story_id` VARCHAR(128) NOT NULL,
        `active_story_run_id` VARCHAR(36) NULL,
        `last_visited_at` DATETIME NULL,
        `completed_run_summaries` JSON NOT NULL,
        PRIMARY KEY (`player_id`, `story_world_id`, `story_id`),
        CONSTRAINT `fk_player_story_progress_state`
            FOREIGN KEY (`player_id`, `story_world_id`)
            REFERENCES `player_story_states` (`player_id`, `story_world_id`)
            ON DELETE CASCADE,
        CONSTRAINT `fk_player_story_progress_active_run`
            FOREIGN KEY (`active_story_run_id`)
            REFERENCES `story_runs` (`id`)
            ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    INSERT INTO `player_story_progress` (
        player_id,
        story_world_id,
        story_id,
        active_story_run_id,
        last_visited_at,
        completed_run_summaries
    )
    SELECT
        player_id,
        story_world_id,
        story_id,
        active_story_run_id,
        last_visited_at,
        completed_run_summaries
    FROM `_fablespace_009_plan_progress`;

    SELECT COUNT(*) INTO actual_count FROM `player_story_progress`;
    SELECT COUNT(*) INTO expected_count FROM `_fablespace_009_plan_progress`;
    IF actual_count <> expected_count THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FableSpace 009 progress insertion count mismatch';
    END IF;

    ALTER TABLE `player_story_states`
        DROP COLUMN `player_role_id`,
        DROP COLUMN `active_story_run_id`,
        DROP COLUMN `completed_run_summaries`;

    ALTER TABLE `story_events`
        ADD CONSTRAINT `uq_story_events_run_id`
            UNIQUE (`story_run_id`, `id`),
        ADD CONSTRAINT `uq_story_events_run_id_sequence`
            UNIQUE (`story_run_id`, `id`, `sequence`);

    CREATE TABLE `_fablespace_009_character_relationships_new` (
        `player_id` VARCHAR(64) NOT NULL,
        `story_world_id` VARCHAR(128) NOT NULL,
        `character_id` VARCHAR(128) NOT NULL,
        `affinity` DOUBLE NOT NULL,
        `stage` VARCHAR(64) NOT NULL,
        `last_change_reason` TEXT NOT NULL,
        `flags` JSON NOT NULL,
        `last_source_story_run_id` VARCHAR(36) NULL,
        `last_source_event_id` VARCHAR(36) NULL,
        `updated_at` DATETIME NOT NULL,
        PRIMARY KEY (`player_id`, `story_world_id`, `character_id`),
        CONSTRAINT `fk_character_relationships_state`
            FOREIGN KEY (`player_id`, `story_world_id`)
            REFERENCES `player_story_states` (`player_id`, `story_world_id`)
            ON DELETE CASCADE,
        CONSTRAINT `fk_character_relationships_source_event`
            FOREIGN KEY (`last_source_story_run_id`, `last_source_event_id`)
            REFERENCES `story_events` (`story_run_id`, `id`)
            ON DELETE RESTRICT,
        CONSTRAINT `ck_character_relationships_source_pair`
            CHECK (
                (last_source_story_run_id IS NULL AND last_source_event_id IS NULL)
                OR (last_source_story_run_id IS NOT NULL AND last_source_event_id IS NOT NULL)
            )
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    INSERT INTO `_fablespace_009_character_relationships_new` (
        player_id,
        story_world_id,
        character_id,
        affinity,
        stage,
        last_change_reason,
        flags,
        last_source_story_run_id,
        last_source_event_id,
        updated_at
    )
    SELECT
        player_id,
        story_world_id,
        character_id,
        affinity,
        stage,
        last_change_reason,
        flags,
        last_source_story_run_id,
        last_source_event_id,
        UTC_TIMESTAMP()
    FROM `_fablespace_009_plan_relationships`;

    SELECT COUNT(*) INTO actual_count
    FROM `_fablespace_009_character_relationships_new`;
    SELECT COUNT(*) INTO expected_count
    FROM `_fablespace_009_plan_relationships`;
    IF actual_count <> expected_count THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FableSpace 009 long-term relationship count mismatch';
    END IF;

    DROP TABLE `character_relationships`;
    RENAME TABLE `_fablespace_009_character_relationships_new`
        TO `character_relationships`;

    SELECT COUNT(*)
    INTO missing_message_count
    FROM `_fablespace_009_plan_messages` AS planned_message
    LEFT JOIN `story_messages` AS existing_message
      ON existing_message.id = planned_message.id
    WHERE existing_message.id IS NULL;

    INSERT INTO `story_messages` (
        id,
        story_run_id,
        sequence,
        `role`,
        character_id,
        visible_to_character_ids,
        content,
        source_event_id,
        source_event_sequence,
        created_at
    )
    SELECT
        planned_message.id,
        planned_message.story_run_id,
        planned_message.sequence,
        planned_message.`role`,
        planned_message.character_id,
        planned_message.visible_to_character_ids,
        planned_message.content,
        planned_message.source_event_id,
        planned_message.source_event_sequence,
        planned_message.created_at
    FROM `_fablespace_009_plan_messages` AS planned_message
    LEFT JOIN `story_messages` AS existing_message
      ON existing_message.id = planned_message.id
    WHERE existing_message.id IS NULL;

    IF ROW_COUNT() <> missing_message_count THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FableSpace 009 StoryMessage insertion count mismatch';
    END IF;

    SELECT COUNT(*) INTO actual_count FROM `story_messages`;
    SELECT COUNT(*) INTO expected_count FROM `_fablespace_009_plan_messages`;
    IF actual_count <> expected_count THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FableSpace 009 StoryMessage projection coverage mismatch';
    END IF;

    DROP TABLE `private_memories`;

    CREATE TABLE `private_memories` (
        `id` VARCHAR(36) NOT NULL,
        `player_id` VARCHAR(64) NOT NULL,
        `story_world_id` VARCHAR(128) NOT NULL,
        `origin_story_id` VARCHAR(128) NOT NULL,
        `origin_story_run_id` VARCHAR(36) NOT NULL,
        `character_id` VARCHAR(128) NOT NULL,
        `role_scope_player_role_id` VARCHAR(128) NULL,
        `layer` VARCHAR(2) NOT NULL,
        `memory_kind` VARCHAR(32) NOT NULL,
        `evidence_class` VARCHAR(32) NOT NULL,
        `content` TEXT NULL,
        `structured_payload` JSON NOT NULL,
        `salience` SMALLINT NOT NULL,
        `recall_scope` VARCHAR(16) NOT NULL,
        `review_status` VARCHAR(16) NOT NULL,
        `promotion_rule_id` VARCHAR(128) NULL,
        `story_content_version` VARCHAR(128) NOT NULL,
        `pipeline_version` VARCHAR(64) NOT NULL,
        `logical_key` CHAR(64) NOT NULL,
        `revision` INT NOT NULL,
        `idempotency_key` CHAR(64) NOT NULL,
        `content_hash` CHAR(64) NULL,
        `created_at` DATETIME NOT NULL,
        PRIMARY KEY (`id`),
        CONSTRAINT `fk_private_memories_state`
            FOREIGN KEY (`player_id`, `story_world_id`)
            REFERENCES `player_story_states` (`player_id`, `story_world_id`)
            ON DELETE CASCADE,
        CONSTRAINT `fk_private_memories_origin_run`
            FOREIGN KEY (
                `player_id`,
                `story_world_id`,
                `origin_story_id`,
                `origin_story_run_id`
            ) REFERENCES `story_runs` (`player_id`, `story_world_id`, `story_id`, `id`)
            ON DELETE RESTRICT,
        CONSTRAINT `uq_private_memories_idempotency`
            UNIQUE (`player_id`, `story_world_id`, `character_id`, `idempotency_key`),
        CONSTRAINT `uq_private_memories_logical_revision`
            UNIQUE (`player_id`, `story_world_id`, `character_id`, `logical_key`, `revision`),
        CONSTRAINT `uq_private_memories_owner_id`
            UNIQUE (`player_id`, `story_world_id`, `id`),
        CONSTRAINT `uq_private_memories_owner_character_id`
            UNIQUE (`player_id`, `story_world_id`, `character_id`, `id`),
        CONSTRAINT `ck_private_memories_layer`
            CHECK (layer IN ('l1', 'l2', 'l3')),
        CONSTRAINT `ck_private_memories_kind`
            CHECK (
                memory_kind IN (
                    'interaction_fact',
                    'player_claim',
                    'player_commitment',
                    'reviewed_choice',
                    'relationship_change',
                    'scene_summary',
                    'character_impression'
                )
            ),
        CONSTRAINT `ck_private_memories_evidence_class`
            CHECK (
                evidence_class IN (
                    'reviewed_event',
                    'observed_dialogue',
                    'player_claim',
                    'inferred',
                    'needs_verification'
                )
            ),
        CONSTRAINT `ck_private_memories_recall_scope`
            CHECK (recall_scope IN ('none', 'run', 'story', 'world')),
        CONSTRAINT `ck_private_memories_review_status`
            CHECK (review_status IN ('validated', 'promoted', 'invalidated')),
        CONSTRAINT `ck_private_memories_layer_kind`
            CHECK (
                (layer = 'l1' AND memory_kind IN (
                    'interaction_fact',
                    'player_claim',
                    'player_commitment',
                    'reviewed_choice',
                    'relationship_change'
                ))
                OR (layer = 'l2' AND memory_kind = 'scene_summary')
                OR (layer = 'l3' AND memory_kind = 'character_impression')
            ),
        CONSTRAINT `ck_private_memories_salience`
            CHECK (salience BETWEEN 0 AND 100),
        CONSTRAINT `ck_private_memories_revision`
            CHECK (revision >= 1),
        CONSTRAINT `ck_private_memories_l2_scope`
            CHECK (
                layer <> 'l2'
                OR review_status = 'invalidated'
                OR recall_scope = 'run'
            ),
        CONSTRAINT `ck_private_memories_validated_scope`
            CHECK (
                review_status <> 'validated'
                OR (layer IN ('l1', 'l2') AND recall_scope = 'run')
            ),
        CONSTRAINT `ck_private_memories_promoted_scope`
            CHECK (
                review_status <> 'promoted'
                OR (
                    layer IN ('l1', 'l3')
                    AND recall_scope IN ('story', 'world')
                    AND promotion_rule_id IS NOT NULL
                    AND evidence_class <> 'needs_verification'
                )
            ),
        CONSTRAINT `ck_private_memories_l3_status`
            CHECK (layer <> 'l3' OR review_status IN ('promoted', 'invalidated')),
        CONSTRAINT `ck_private_memories_content_lifecycle`
            CHECK (
                (
                    review_status = 'invalidated'
                    AND recall_scope = 'none'
                    AND content IS NULL
                )
                OR (review_status <> 'invalidated' AND content IS NOT NULL)
            ),
        INDEX `idx_private_memories_recall` (
            `player_id`,
            `story_world_id`,
            `character_id`,
            `review_status`,
            `recall_scope`,
            `origin_story_id`,
            `role_scope_player_role_id`,
            `layer`,
            `salience`,
            `created_at`
        ),
        INDEX `idx_private_memories_origin` (
            `origin_story_run_id`,
            `character_id`,
            `layer`,
            `created_at`
        ),
        INDEX `idx_private_memories_revision` (
            `player_id`,
            `story_world_id`,
            `character_id`,
            `logical_key`,
            `revision`
        )
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE `private_memory_sources` (
        `memory_id` VARCHAR(36) NOT NULL,
        `player_id` VARCHAR(64) NOT NULL,
        `story_world_id` VARCHAR(128) NOT NULL,
        `character_id` VARCHAR(128) NOT NULL,
        `ordinal` SMALLINT NOT NULL,
        `source_kind` VARCHAR(8) NOT NULL,
        `source_story_id` VARCHAR(128) NULL,
        `source_story_run_id` VARCHAR(36) NULL,
        `source_event_id` VARCHAR(36) NULL,
        `source_event_sequence` INT NULL,
        `source_memory_id` VARCHAR(36) NULL,
        `relation_kind` VARCHAR(16) NOT NULL,
        `created_at` DATETIME NOT NULL,
        PRIMARY KEY (`memory_id`, `ordinal`),
        CONSTRAINT `fk_private_memory_sources_memory`
            FOREIGN KEY (`player_id`, `story_world_id`, `character_id`, `memory_id`)
            REFERENCES `private_memories` (`player_id`, `story_world_id`, `character_id`, `id`)
            ON DELETE CASCADE,
        CONSTRAINT `fk_private_memory_sources_source_memory`
            FOREIGN KEY (`player_id`, `story_world_id`, `character_id`, `source_memory_id`)
            REFERENCES `private_memories` (`player_id`, `story_world_id`, `character_id`, `id`)
            ON DELETE RESTRICT,
        CONSTRAINT `fk_private_memory_sources_source_run`
            FOREIGN KEY (
                `player_id`,
                `story_world_id`,
                `source_story_id`,
                `source_story_run_id`
            ) REFERENCES `story_runs` (`player_id`, `story_world_id`, `story_id`, `id`)
            ON DELETE RESTRICT,
        CONSTRAINT `fk_private_memory_sources_source_event`
            FOREIGN KEY (`source_story_run_id`, `source_event_id`, `source_event_sequence`)
            REFERENCES `story_events` (`story_run_id`, `id`, `sequence`)
            ON DELETE RESTRICT,
        CONSTRAINT `uq_private_memory_sources_event`
            UNIQUE (
                `memory_id`,
                `source_story_run_id`,
                `source_event_id`,
                `source_event_sequence`,
                `relation_kind`
            ),
        CONSTRAINT `uq_private_memory_sources_memory`
            UNIQUE (`memory_id`, `source_memory_id`, `relation_kind`),
        CONSTRAINT `ck_private_memory_sources_source_kind`
            CHECK (source_kind IN ('event', 'memory')),
        CONSTRAINT `ck_private_memory_sources_relation_kind`
            CHECK (
                relation_kind IN (
                    'evidence',
                    'derived_from',
                    'supersedes',
                    'contradicts',
                    'invalidates'
                )
            ),
        CONSTRAINT `ck_private_memory_sources_ordinal`
            CHECK (ordinal >= 0),
        CONSTRAINT `ck_private_memory_sources_source_exclusive`
            CHECK (
                (source_event_id IS NOT NULL AND source_memory_id IS NULL)
                OR (source_event_id IS NULL AND source_memory_id IS NOT NULL)
            ),
        CONSTRAINT `ck_private_memory_sources_source_shape`
            CHECK (
                (
                    source_kind = 'event'
                    AND source_story_id IS NOT NULL
                    AND source_story_run_id IS NOT NULL
                    AND source_event_id IS NOT NULL
                    AND source_event_sequence IS NOT NULL
                    AND source_event_sequence >= 0
                    AND source_memory_id IS NULL
                )
                OR (
                    source_kind = 'memory'
                    AND source_story_id IS NULL
                    AND source_story_run_id IS NULL
                    AND source_event_id IS NULL
                    AND source_event_sequence IS NULL
                    AND source_memory_id IS NOT NULL
                )
            ),
        CONSTRAINT `ck_private_memory_sources_relation_source`
            CHECK (
                (relation_kind = 'evidence' AND source_kind = 'event')
                OR (
                    relation_kind IN (
                        'derived_from',
                        'supersedes',
                        'contradicts',
                        'invalidates'
                    )
                    AND source_kind = 'memory'
                )
            )
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE `memory_formation_jobs` (
        `player_id` VARCHAR(64) NOT NULL,
        `story_world_id` VARCHAR(128) NOT NULL,
        `story_id` VARCHAR(128) NOT NULL,
        `story_run_id` VARCHAR(36) NOT NULL,
        `character_id` VARCHAR(128) NOT NULL,
        `pipeline_version` VARCHAR(64) NOT NULL,
        `processed_event_sequence` INT NOT NULL DEFAULT 0,
        `pending_event_sequence` INT NOT NULL DEFAULT 0,
        `status` VARCHAR(24) NOT NULL,
        `attempt_count` INT NOT NULL DEFAULT 0,
        `lease_token` VARCHAR(64) NULL,
        `lease_expires_at` DATETIME NULL,
        `next_retry_at` DATETIME NULL,
        `last_error_code` VARCHAR(64) NULL,
        `created_at` DATETIME NOT NULL,
        `updated_at` DATETIME NOT NULL,
        PRIMARY KEY (`story_run_id`, `character_id`, `pipeline_version`),
        CONSTRAINT `fk_memory_formation_jobs_story_run`
            FOREIGN KEY (`player_id`, `story_world_id`, `story_id`, `story_run_id`)
            REFERENCES `story_runs` (`player_id`, `story_world_id`, `story_id`, `id`)
            ON DELETE CASCADE,
        CONSTRAINT `ck_memory_formation_jobs_status`
            CHECK (
                status IN (
                    'idle',
                    'pending',
                    'running',
                    'retryable_failed',
                    'blocked'
                )
            ),
        CONSTRAINT `ck_memory_formation_jobs_watermarks`
            CHECK (
                processed_event_sequence >= 0
                AND pending_event_sequence >= 0
                AND processed_event_sequence <= pending_event_sequence
            ),
        CONSTRAINT `ck_memory_formation_jobs_attempt_count`
            CHECK (attempt_count >= 0),
        CONSTRAINT `ck_memory_formation_jobs_status_watermark`
            CHECK (
                (
                    status = 'idle'
                    AND processed_event_sequence = pending_event_sequence
                )
                OR (
                    status IN ('pending', 'running', 'retryable_failed', 'blocked')
                    AND processed_event_sequence < pending_event_sequence
                )
            ),
        CONSTRAINT `ck_memory_formation_jobs_lease`
            CHECK (
                (
                    status = 'running'
                    AND lease_token IS NOT NULL
                    AND lease_expires_at IS NOT NULL
                )
                OR (
                    status <> 'running'
                    AND lease_token IS NULL
                    AND lease_expires_at IS NULL
                )
            ),
        CONSTRAINT `ck_memory_formation_jobs_retry`
            CHECK (next_retry_at IS NULL OR status = 'retryable_failed'),
        CONSTRAINT `ck_memory_formation_jobs_blocked_error`
            CHECK (status <> 'blocked' OR last_error_code IS NOT NULL),
        INDEX `idx_memory_formation_jobs_worker`
            (`status`, `next_retry_at`, `lease_expires_at`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    UPDATE `managed_story_worlds` AS managed_world
    INNER JOIN `_fablespace_009_plan_managed_worlds` AS planned_world
      ON planned_world.story_world_id = managed_world.story_world_id
    SET managed_world.payload_json = planned_world.payload_json;

    IF ROW_COUNT() <> 2 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FableSpace 009 managed StoryWorld conversion count mismatch';
    END IF;

    SELECT COUNT(*)
    INTO final_table_count
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_TYPE = 'BASE TABLE'
      AND TABLE_NAME IN (
          'player_story_states',
          'player_story_progress',
          'story_runs',
          'character_relationships',
          'story_events',
          'story_messages',
          'private_memories',
          'private_memory_sources',
          'memory_formation_jobs',
          'managed_story_worlds',
          'managed_media_assets'
      );

    SELECT COUNT(*)
    INTO actual_count
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_TYPE = 'BASE TABLE';

    IF final_table_count <> 11 OR actual_count <> 11 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FableSpace 009 did not reach the exact 11-table target';
    END IF;

    SELECT COUNT(*) INTO actual_count FROM `story_runs` WHERE id = delete_run_id;
    IF actual_count <> 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FableSpace 009 deletion target survived postflight';
    END IF;

    SELECT
        (SELECT COUNT(*) FROM `private_memories`)
        + (SELECT COUNT(*) FROM `private_memory_sources`)
        + (SELECT COUNT(*) FROM `memory_formation_jobs`)
    INTO actual_count;
    IF actual_count <> 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FableSpace 009 must not backfill L1-L3 or jobs';
    END IF;
END$$

DELIMITER ;

CALL `_fablespace_migration_009_multi_story_atomic_switch`();
DROP PROCEDURE `_fablespace_migration_009_multi_story_atomic_switch`;
