from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request

from ...contracts.taverns import EnterTavernRequest, TavernCreateRequest, TavernListResponse, TavernUpdateRequest
from .common import get_user_id, taverns_service

router = APIRouter(prefix="/taverns", tags=["taverns"])


@router.get("", response_model=TavernListResponse)
def list_taverns(
    request: Request,
    lat: float | None = None,
    lon: float | None = None,
    radius: float = 5000,
    access: str | None = None,
    status: str | None = None,
    q: str = "",
    owner_id: str = "",
) -> dict[str, Any]:
    return taverns_service(request).list_taverns(
        lat=lat,
        lon=lon,
        radius=radius,
        access=access,
        status=status,
        query=q,
        owner_id=owner_id,
    )


@router.post("")
def create_tavern(request: Request, data: TavernCreateRequest) -> dict[str, Any]:
    return taverns_service(request).create_tavern(data.to_payload(), get_user_id(request))


@router.get("/{tavern_id}")
def get_tavern(request: Request, tavern_id: str) -> dict[str, Any]:
    return taverns_service(request).get_tavern(tavern_id, get_user_id(request))


@router.put("/{tavern_id}")
def update_tavern(request: Request, tavern_id: str, data: TavernUpdateRequest) -> dict[str, Any]:
    return taverns_service(request).update_tavern(tavern_id, data.to_payload(), get_user_id(request))


@router.delete("/{tavern_id}")
def delete_tavern(request: Request, tavern_id: str) -> dict[str, Any]:
    return taverns_service(request).delete_tavern(tavern_id, get_user_id(request))


@router.post("/{tavern_id}/enter")
def enter_tavern(request: Request, tavern_id: str, data: EnterTavernRequest | None = None) -> dict[str, Any]:
    return taverns_service(request).enter_tavern(
        tavern_id,
        password=data.password if data else "",
        user_id=get_user_id(request),
    )
