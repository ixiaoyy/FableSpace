import type { ClientLoaderFunctionArgs } from "react-router"
import { replace, useLoaderData, useNavigate } from "react-router"
import { useState } from "react"

import {
  DEFAULT_OWNER_ID,
  errorMessage,
  getSpace,
  updateCharacter,
  type Space,
  type SpaceCharacter,
} from "../lib/spaces"
import { matchesPublicReference, promptEditorPath, redirectPathForRequest, spaceManagePath } from "../lib/web-routes"
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
  const spaceRef = params.spaceRef ?? ""
  const characterRef = params.characterRef ?? ""
  const currentUserId = getOwnerIdFromRequest(request)

  if (!spaceRef || !characterRef) {
    return { spaceId: "", characterId: "", currentUserId, space: null, character: null, error: "缺少空间或角色引用" }
  }

  try {
    const space = await getSpace(spaceRef, currentUserId)
    const spaceId = space.id
    const matches = (space.characters || []).filter((character) => (
      matchesPublicReference(characterRef, "character", spaceId, character.id)
    ))

    if (matches.length !== 1) {
      const error = matches.length > 1 ? "角色公开引用发生冲突" : "未找到目标角色"
      return { spaceId, characterId: "", currentUserId, space, character: null, error }
    }

    const character = matches[0]
    const characterId = character.id
    const url = new URL(request.url)
    const canonicalPath = promptEditorPath(space, character)
    if (url.pathname !== new URL(canonicalPath, url.origin).pathname) {
      throw replace(redirectPathForRequest(request, canonicalPath))
    }

    return { spaceId, characterId, currentUserId, space, character, error: "" }
  } catch (error) {
    if (error instanceof Response) throw error
    return { spaceId: spaceRef, characterId: characterRef, currentUserId, space: null, character: null, error: errorMessage(error) }
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
      navigate(spaceManagePath(space))
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
      <ProductShell eyebrow="错误">
        <div className="p-8 text-center">
          <p className="text-red-400">{error || "未知错误"}</p>
          <button onClick={handleBack} className="mt-4 text-cyan-400 underline">返回</button>
        </div>
      </ProductShell>
    )
  }

  return (
    <ProductShell eyebrow="提示词工作台">
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
