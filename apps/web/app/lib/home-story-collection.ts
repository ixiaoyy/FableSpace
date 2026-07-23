import { loadHistoryPilotSpace } from "./history-pilot-space"
import { loadLaunchStorySpaces } from "./launch-story-spaces"

import type { SpaceListResponse } from "./spaces"

/**
 * Load the reviewed historical pilot and the three launch worlds as one homepage collection.
 * Every child loader keeps its published access/status/character contract; this function only combines their results.
 */
export async function loadHomeStoryCollection(): Promise<SpaceListResponse> {
  const [historyPilot, launchStories] = await Promise.all([
    loadHistoryPilotSpace(),
    loadLaunchStorySpaces(),
  ])
  const spaces = [...historyPilot.spaces, ...launchStories.spaces]

  return {
    spaces,
    count: spaces.length,
    total: spaces.length,
    limit: spaces.length,
    offset: 0,
    has_more: false,
  }
}
