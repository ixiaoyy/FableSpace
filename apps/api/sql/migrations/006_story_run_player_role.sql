ALTER TABLE story_runs
    ADD COLUMN player_role_id VARCHAR(128) NULL AFTER content_version;

UPDATE story_runs AS story_run
INNER JOIN player_story_states AS player_state
    ON player_state.player_id = story_run.player_id
    AND player_state.story_world_id = story_run.story_world_id
SET story_run.player_role_id = player_state.player_role_id
WHERE story_run.player_role_id IS NULL;

ALTER TABLE story_runs
    MODIFY COLUMN player_role_id VARCHAR(128) NOT NULL;
