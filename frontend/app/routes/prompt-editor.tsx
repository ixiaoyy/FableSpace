import type { ClientLoaderFunctionArgs } from "react-router"
import { useLoaderData, useNavigate } from "react-router"
import { useState } from "react"

import {
  DEFAULT_OWNER_ID,
  errorMessage,
  getSpace,
  updateCharacter,
  type Space,
  type SpaceCharacter,
} from "../lib/spaces"
import { ProductShell } from "../shell/product-shell"
import PromptBlockEditor from "../product/PromptBlockEditor"

type PromptEditorLoaderData = {
  spaceId: string
  characterId: string
  currentUserId: string
  space: Space | null
  character: SpaceCharacter | null
  error: string
}

function getOwnerIdFromRequest(request: Request) {
  const url = new URL(request.url)
  return (
    url.searchParams.get("owner_id")?.trim() ||
    url.searchParams.get("user_id")?.trim() ||
    DEFAULT_OWNER_ID
  )
}

export async function clientLoader({ params, request }: ClientLoaderFunctionArgs): Promise<PromptEditorLoaderData> {
  const spaceId = params.spaceId ?? ""
  const characterId = params.characterId ?? ""
  const currentUserId = getOwnerIdFromRequest(request)

  if (!spaceId || !characterId) {
    return { spaceId, characterId, currentUserId, space: null, character: null, error: "缺少必要参数" }
  }

  try {
    const space = await getSpace(spaceId, currentUserId)
    const character = (space.characters || []).find(c => c.id === characterId) || null
    
    if (!character) {
      return { spaceId, characterId, currentUserId, space, character: null, error: "未找到目标角色" }
    }

    return { spaceId, characterId, currentUserId, space, character, error: "" }
  } catch (error) {
    return { spaceId, characterId, currentUserId, space: null, character: null, error: errorMessage(error) }
  }
}

export default function PromptEditorRoute() {
  const { spaceId, characterId, currentUserId, space, character, error } = useLoaderData<typeof clientLoader>()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  async function handleSave(updatedChar: SpaceCharacter) {
    setBusy(true)
    try {
      await updateCharacter(spaceId, characterId, updatedChar, currentUserId)
      // 保存后返回管理页或保持原位？
      // 保持原位并显示成功提示可能更好，但这里先简单处理
      navigate(`/space/${spaceId}/manage`)
    } catch (err) {
      throw err // 让组件内部捕获并显示错误
    } finally {
      setBusy(false)
    }
  }

  function handleBack() {
    navigate(-1)
  }

  if (error || !space || !character) {
    return (
      <ProductShell eyebrow="Error">
        <div className="p-8 text-center">
          <p className="text-red-400">{error || "未知错误"}</p>
          <button onClick={handleBack} className="mt-4 text-cyan-400 underline">返回</button>
        </div>
      </ProductShell>
    )
  }

  return (
    <ProductShell eyebrow="Prompt Lab">
      <PromptBlockEditor
        character={character}
        space={space}
        onSave={handleSave}
        onBack={handleBack}
        disabled={busy}
      />
    </ProductShell>
  )
}
