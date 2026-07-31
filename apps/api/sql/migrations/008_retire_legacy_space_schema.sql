-- FableSpace legacy physical schema retirement.
--
-- This migration is destructive and must never run during application startup
-- or automated deployment. Select the target database explicitly, create and
-- verify a complete logical backup, deploy the current eight-table ORM first,
-- then execute with the mysql client (DELIMITER is required) and stop on the
-- first error. MySQL DDL is not transactionally reversible.

DROP PROCEDURE IF EXISTS `_fablespace_migration_008_retire_legacy_space_schema`;

DELIMITER $$

CREATE PROCEDURE `_fablespace_migration_008_retire_legacy_space_schema`()
BEGIN
    DECLARE current_table_count INT DEFAULT 0;
    DECLARE inline_memory_column_count INT DEFAULT 0;

    IF DATABASE() IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FableSpace 008 requires an explicitly selected database';
    END IF;

    SELECT COUNT(*)
    INTO current_table_count
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

    IF current_table_count <> 8 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FableSpace 008 requires all 8 current tables before retirement';
    END IF;

    SELECT COUNT(*)
    INTO inline_memory_column_count
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'story_runs'
      AND COLUMN_NAME = 'private_memories';

    SET @fablespace_008_invalid_inline_memories = 0;
    IF inline_memory_column_count = 1 THEN
        SET @fablespace_008_memory_check_sql =
            'SELECT COUNT(*) INTO @fablespace_008_invalid_inline_memories '
            'FROM `story_runs` '
            'WHERE `private_memories` IS NOT NULL '
            'AND NOT (JSON_TYPE(`private_memories`) = ''ARRAY'' '
            'AND JSON_LENGTH(`private_memories`) = 0)';
        PREPARE fablespace_008_memory_check
            FROM @fablespace_008_memory_check_sql;
        EXECUTE fablespace_008_memory_check;
        DEALLOCATE PREPARE fablespace_008_memory_check;

        IF @fablespace_008_invalid_inline_memories <> 0 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'FableSpace 008 found non-empty story_runs.private_memories';
        END IF;
    END IF;

    -- Drop every direct taverns child before its parent. The remaining legacy
    -- tables have no current ORM foreign keys and are retired before taverns.
    DROP TABLE IF EXISTS `characters`;
    DROP TABLE IF EXISTS `world_info`;
    DROP TABLE IF EXISTS `visitors`;
    DROP TABLE IF EXISTS `chat_messages`;
    DROP TABLE IF EXISTS `memory_atoms`;
    DROP TABLE IF EXISTS `gameplay_sessions`;
    DROP TABLE IF EXISTS `llm_configs`;
    DROP TABLE IF EXISTS `npc_public_bonds`;
    DROP TABLE IF EXISTS `npc_public_bond_queues`;
    DROP TABLE IF EXISTS `tavern_messages`;
    DROP TABLE IF EXISTS `state_cards`;
    DROP TABLE IF EXISTS `territories`;

    DROP TABLE IF EXISTS `relationship_edges`;
    DROP TABLE IF EXISTS `visitor_relationship_projections`;
    DROP TABLE IF EXISTS `owner_configs`;
    DROP TABLE IF EXISTS `visitor_notes`;
    DROP TABLE IF EXISTS `notifications`;
    DROP TABLE IF EXISTS `neighborhood_rumors`;
    DROP TABLE IF EXISTS `neighborhood_knowledge`;
    DROP TABLE IF EXISTS `homes`;
    DROP TABLE IF EXISTS `home_visits`;
    DROP TABLE IF EXISTS `writeback_states`;
    DROP TABLE IF EXISTS `taverns`;

    IF inline_memory_column_count = 1 THEN
        SET @fablespace_008_drop_column_sql =
            'ALTER TABLE `story_runs` DROP COLUMN `private_memories`';
        PREPARE fablespace_008_drop_column
            FROM @fablespace_008_drop_column_sql;
        EXECUTE fablespace_008_drop_column;
        DEALLOCATE PREPARE fablespace_008_drop_column;
    END IF;
END$$

DELIMITER ;

CALL `_fablespace_migration_008_retire_legacy_space_schema`();
DROP PROCEDURE `_fablespace_migration_008_retire_legacy_space_schema`;
