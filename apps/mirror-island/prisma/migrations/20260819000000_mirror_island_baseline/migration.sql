CREATE TABLE "worlds" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(64) NOT NULL,
    "seed" BIGINT NOT NULL,
    "width_tiles" INTEGER NOT NULL,
    "height_tiles" INTEGER NOT NULL,
    "chunk_size" INTEGER NOT NULL,
    "revision" INTEGER NOT NULL,
    "epoch_utc" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "worlds_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "world_dimensions_check" CHECK ("width_tiles" = 512 AND "height_tiles" = 512 AND "chunk_size" = 32),
    CONSTRAINT "world_revision_check" CHECK ("revision" > 0)
);

CREATE TABLE "player_profiles" (
    "account_id" VARCHAR(128) NOT NULL,
    "player_name" VARCHAR(12) NOT NULL,
    "avatar_id" VARCHAR(64) NOT NULL,
    "onboarding_state" VARCHAR(32) NOT NULL DEFAULT 'welcome',
    "last_chunk_x" SMALLINT,
    "last_chunk_y" SMALLINT,
    "last_tile_x" SMALLINT,
    "last_tile_y" SMALLINT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "player_profiles_pkey" PRIMARY KEY ("account_id"),
    CONSTRAINT "player_name_length_check" CHECK (char_length(BTRIM("player_name")) BETWEEN 1 AND 12),
    CONSTRAINT "player_avatar_check" CHECK ("avatar_id" IN ('ninja_blue', 'samurai_green')),
    CONSTRAINT "player_onboarding_check" CHECK ("onboarding_state" IN ('welcome', 'choosing_home', 'complete')),
    CONSTRAINT "player_chunk_pair_check" CHECK (("last_chunk_x" IS NULL) = ("last_chunk_y" IS NULL)),
    CONSTRAINT "player_tile_pair_check" CHECK (("last_tile_x" IS NULL) = ("last_tile_y" IS NULL))
);

CREATE TABLE "world_cells" (
    "world_id" UUID NOT NULL,
    "tile_x" SMALLINT NOT NULL,
    "tile_y" SMALLINT NOT NULL,
    "chunk_x" SMALLINT NOT NULL,
    "chunk_y" SMALLINT NOT NULL,
    "state" VARCHAR(16) NOT NULL,
    "crop_kind" VARCHAR(32),
    "growth_stage" SMALLINT,
    "watered_day" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,
    "last_actor_account_id" VARCHAR(128),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "world_cells_pkey" PRIMARY KEY ("world_id", "tile_x", "tile_y"),
    CONSTRAINT "world_cell_coordinate_check" CHECK ("tile_x" BETWEEN 0 AND 511 AND "tile_y" BETWEEN 0 AND 511),
    CONSTRAINT "world_cell_chunk_check" CHECK ("chunk_x" BETWEEN 0 AND 15 AND "chunk_y" BETWEEN 0 AND 15),
    CONSTRAINT "world_cell_state_check" CHECK ("state" IN ('tilled', 'growing', 'mature', 'withered')),
    CONSTRAINT "world_cell_crop_check" CHECK ("crop_kind" IS NULL OR "crop_kind" = 'potato'),
    CONSTRAINT "world_cell_growth_check" CHECK ("growth_stage" IS NULL OR "growth_stage" BETWEEN 0 AND 2),
    CONSTRAINT "world_cell_version_check" CHECK ("version" > 0)
);

CREATE TABLE "chunk_state" (
    "world_id" UUID NOT NULL,
    "chunk_x" SMALLINT NOT NULL,
    "chunk_y" SMALLINT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "settled_day" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "chunk_state_pkey" PRIMARY KEY ("world_id", "chunk_x", "chunk_y"),
    CONSTRAINT "chunk_coordinate_check" CHECK ("chunk_x" BETWEEN 0 AND 15 AND "chunk_y" BETWEEN 0 AND 15),
    CONSTRAINT "chunk_revision_check" CHECK ("revision" > 0 AND "settled_day" >= 0)
);

CREATE TABLE "houses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "world_id" UUID NOT NULL,
    "owner_account_id" VARCHAR(128) NOT NULL,
    "origin_x" SMALLINT NOT NULL,
    "origin_y" SMALLINT NOT NULL,
    "width" SMALLINT NOT NULL,
    "height" SMALLINT NOT NULL,
    "exterior_variant" VARCHAR(64) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "houses_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "house_footprint_check" CHECK ("origin_x" BETWEEN 0 AND 511 AND "origin_y" BETWEEN 0 AND 511 AND "width" > 0 AND "height" > 0),
    CONSTRAINT "house_version_check" CHECK ("version" > 0)
);

CREATE TABLE "world_occupancy" (
    "world_id" UUID NOT NULL,
    "tile_x" SMALLINT NOT NULL,
    "tile_y" SMALLINT NOT NULL,
    "entity_kind" VARCHAR(16) NOT NULL,
    "entity_id" UUID NOT NULL,
    CONSTRAINT "world_occupancy_pkey" PRIMARY KEY ("world_id", "tile_x", "tile_y"),
    CONSTRAINT "occupancy_coordinate_check" CHECK ("tile_x" BETWEEN 0 AND 511 AND "tile_y" BETWEEN 0 AND 511),
    CONSTRAINT "occupancy_kind_check" CHECK ("entity_kind" = 'house')
);

CREATE TABLE "player_inventory" (
    "account_id" VARCHAR(128) NOT NULL,
    "item_id" VARCHAR(64) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "player_inventory_pkey" PRIMARY KEY ("account_id", "item_id"),
    CONSTRAINT "inventory_quantity_check" CHECK ("quantity" >= 0),
    CONSTRAINT "inventory_version_check" CHECK ("version" > 0)
);

CREATE TABLE "player_saves" (
    "account_id" VARCHAR(128) NOT NULL,
    "slot" SMALLINT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "meta" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "player_saves_pkey" PRIMARY KEY ("account_id", "slot"),
    CONSTRAINT "player_save_slot_check" CHECK ("slot" = 0),
    CONSTRAINT "player_save_version_check" CHECK ("version" > 0)
);

CREATE TABLE "world_day_settlements" (
    "world_id" UUID NOT NULL,
    "absolute_day" INTEGER NOT NULL,
    "settled_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "world_day_settlements_pkey" PRIMARY KEY ("world_id", "absolute_day"),
    CONSTRAINT "settlement_day_check" CHECK ("absolute_day" >= 0)
);

CREATE UNIQUE INDEX "worlds_slug_key" ON "worlds"("slug");
CREATE INDEX "world_cells_world_id_chunk_x_chunk_y_idx" ON "world_cells"("world_id", "chunk_x", "chunk_y");
CREATE UNIQUE INDEX "houses_owner_account_id_key" ON "houses"("owner_account_id");
CREATE INDEX "houses_world_id_origin_x_origin_y_idx" ON "houses"("world_id", "origin_x", "origin_y");
CREATE INDEX "world_occupancy_entity_id_idx" ON "world_occupancy"("entity_id");

ALTER TABLE "world_cells" ADD CONSTRAINT "world_cells_world_id_fkey" FOREIGN KEY ("world_id") REFERENCES "worlds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chunk_state" ADD CONSTRAINT "chunk_state_world_id_fkey" FOREIGN KEY ("world_id") REFERENCES "worlds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "houses" ADD CONSTRAINT "houses_world_id_fkey" FOREIGN KEY ("world_id") REFERENCES "worlds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "houses" ADD CONSTRAINT "houses_owner_account_id_fkey" FOREIGN KEY ("owner_account_id") REFERENCES "player_profiles"("account_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "world_occupancy" ADD CONSTRAINT "world_occupancy_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "houses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "player_inventory" ADD CONSTRAINT "player_inventory_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "player_profiles"("account_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "player_saves" ADD CONSTRAINT "player_saves_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "player_profiles"("account_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "world_day_settlements" ADD CONSTRAINT "world_day_settlements_world_id_fkey" FOREIGN KEY ("world_id") REFERENCES "worlds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
