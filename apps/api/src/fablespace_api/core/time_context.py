"""
空间时间系统核心模块

提供时区推断、营业时间计算和时间上下文构建功能。
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, time, timezone, timedelta
from typing import Any

try:
    from timezonefinder import TimezoneFinder

    _TF = TimezoneFinder()
except ImportError:
    _TF = None

try:
    from zoneinfo import ZoneInfo
    _HAS_ZONEINFO = True
except ImportError:
    _HAS_ZONEINFO = False
    ZoneInfo = None

# 中文字符串映射
_DAY_OF_WEEK_CN = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
_SEASON_CN = {
    (3, 20): "春季",
    (6, 21): "夏季",
    (9, 23): "秋季",
    (12, 21): "冬季",
}


def _get_season(month: int, day: int) -> str:
    """根据月份和日期返回季节（中文）"""
    current_season = "春季"  # 默认值，覆盖整个年份
    for (m, d), season in sorted(_SEASON_CN.items()):
        if month > m or (month == m and day >= d):
            current_season = season
    return current_season


def _format_time_display(hour: int, minute: int) -> str:
    """将小时分钟转换为中文时间描述"""
    if 5 <= hour < 12:
        period = "早上" if hour < 9 else "上午"
    elif 12 <= hour < 14:
        period = "中午"
    elif 14 <= hour < 18:
        period = "下午"
    elif 18 <= hour < 22:
        period = "晚上"
    elif hour >= 22 or hour < 5:
        period = "深夜" if hour >= 23 or hour < 2 else "凌晨"
    else:
        period = ""

    return f"{period}{hour}点{minute:02d}分"


@dataclass
class TimeContext:
    """时间上下文"""

    utc_now: datetime
    local_time: datetime
    timezone: str
    time_display: str
    day_of_week: str
    is_open: bool
    season: str
    local_hour: int  # 用于前端判断白天/夜晚
    open_at: str | None = None
    close_at: str | None = None

    @property
    def is_closed(self) -> bool:
        return not self.is_open


def infer_timezone(lat: float, lon: float) -> str | None:
    """
    从经纬度推断 IANA 时区

    Args:
        lat: 纬度
        lon: 经度

    Returns:
        IANA 时区字符串（如 'Asia/Shanghai'），失败返回 None
    """
    if _TF is None:
        return None

    try:
        return _TF.timezone_at(lng=lon, lat=lat)
    except Exception:
        return None


def get_local_now(timezone_str: str) -> datetime:
    """
    获取指定时区的当前时间

    Args:
        timezone_str: IANA 时区字符串

    Returns:
        指定时区的当前 datetime
    """
    if _HAS_ZONEINFO:
        try:
            tz = ZoneInfo(timezone_str)
            return datetime.now(tz)
        except Exception:
            pass

    # Fallback: 使用固定的 UTC 偏移量映射（常见时区）
    _UTC_OFFSETS = {
        "Asia/Shanghai": 8,
        "Asia/Tokyo": 9,
        "Asia/Seoul": 9,
        "Asia/Hong_Kong": 8,
        "America/New_York": -5,
        "America/Los_Angeles": -8,
        "Europe/London": 0,
        "Europe/Paris": 1,
        "Europe/Berlin": 1,
    }

    offset_hours = _UTC_OFFSETS.get(timezone_str, 0)
    try:
        return datetime.now(timezone.utc) + timedelta(hours=offset_hours)
    except Exception:
        # 最后的 fallback：使用本地时间
        return datetime.now()


def _parse_time(time_str: str) -> time:
    """
    解析 HH:MM 格式时间字符串

    Args:
        time_str: 如 "09:00" 或 "26:00"（跨午夜）

    Returns:
        time 对象，26:00 会转换为 02:00
    """
    parts = time_str.split(":")
    hours = int(parts[0])
    minutes = int(parts[1]) if len(parts) > 1 else 0

    # 处理跨午夜（如 26:00 = 次日 02:00）
    hours = hours % 24
    return time(hours, minutes)


def _is_time_in_range(current: time, start: time, end: time, crosses_midnight: bool = False) -> bool:
    """
    检查当前时间是否在指定范围内

    Args:
        current: 当前时间
        start: 开始时间
        end: 结束时间
        crosses_midnight: 是否跨午夜

    Returns:
        是否在范围内
    """
    if crosses_midnight:
        # 跨午夜：start > end，如 22:00 - 02:00
        return current >= start or current < end
    else:
        return start <= current < end


def _is_open_at(
    operating_hours: dict[str, Any],
    local_now: datetime,
) -> tuple[bool, str | None, str | None]:
    """
    根据营业时间配置判断是否营业

    Args:
        operating_hours: 营业时间配置
        local_now: 空间本地时间

    Returns:
        (is_open, open_at, close_at)
    """
    if not operating_hours:
        return True, None, None

    mode = operating_hours.get("mode", "always_open")

    if mode == "always_open":
        return True, None, None

    if mode == "scheduled":
        open_at_str = operating_hours.get("open_at")
        close_at_str = operating_hours.get("close_at")
        enabled_days = operating_hours.get("enabled_days", list(range(7)))

        if not open_at_str or not close_at_str:
            return True, None, None

        # 检查今天是否启用
        today_weekday = local_now.weekday()
        if today_weekday not in enabled_days:
            return False, open_at_str, close_at_str

        # 解析时间
        start_time = _parse_time(open_at_str)
        end_time = _parse_time(close_at_str)

        # 判断是否跨午夜
        open_hours = int(open_at_str.split(":")[0])
        close_hours = int(close_at_str.split(":")[0])
        crosses_midnight = close_hours <= open_hours and close_at_str != open_at_str

        current_time = local_now.time()
        is_open = _is_time_in_range(current_time, start_time, end_time, crosses_midnight)

        return is_open, open_at_str, close_at_str

    # 未知模式，默认营业
    return True, None, None


def build_time_context(
    lat: float,
    lon: float,
    timezone_str: str | None,
    operating_hours: dict[str, Any],
) -> TimeContext:
    """
    构建空间时间上下文

    Args:
        lat: 纬度
        lon: 经度
        timezone_str: 手动设置的时区（可选）
        operating_hours: 营业时间配置

    Returns:
        TimeContext 对象
    """
    # 确定时区
    if not timezone_str:
        timezone_str = infer_timezone(lat, lon) or "UTC"

    # 获取 UTC 时间
    try:
        if _HAS_ZONEINFO:
            utc_now = datetime.now(ZoneInfo("UTC"))
        else:
            utc_now = datetime.now(timezone.utc)
    except Exception:
        utc_now = datetime.now()

    # 获取本地时间
    local_now = get_local_now(timezone_str)

    # 计算营业状态
    is_open, open_at, close_at = _is_open_at(operating_hours, local_now)

    # 格式化显示
    time_display = _format_time_display(local_now.hour, local_now.minute)
    day_of_week = _DAY_OF_WEEK_CN[local_now.weekday()]
    season = _get_season(local_now.month, local_now.day)

    return TimeContext(
        utc_now=utc_now,
        local_time=local_now,
        timezone=timezone_str,
        time_display=time_display,
        day_of_week=day_of_week,
        is_open=is_open,
        season=season,
        local_hour=local_now.hour,
        open_at=open_at,
        close_at=close_at,
    )


def build_time_context_prompt(ctx: TimeContext) -> str:
    """
    构建注入 LLM 的时间上下文 prompt

    Args:
        ctx: TimeContext 对象

    Returns:
        时间上下文文本
    """
    parts = [
        f"当前时间: {ctx.local_time.strftime('%Y-%m-%d %H:%M')} ({ctx.timezone})",
        f"本地时刻: {ctx.time_display}，{ctx.day_of_week}，{ctx.season}",
    ]

    if ctx.open_at and ctx.close_at:
        status = "营业中" if ctx.is_open else "已打烊"
        parts.append(f"营业时间: {ctx.open_at} - {ctx.close_at}，当前{status}")

    return "\n".join(parts)


def build_closed_tavern_prompt() -> str:
    """
    构建打烊时的特殊提示词

    Returns:
        打烊提示文本
    """
    return """
这是一间打烊的空间。
你是一位尽职的店员，虽然无法提供完整服务，
但仍会以友善的态度与访客交流，委婉说明现在不营业。
保持角色设定，但语气温和有礼。
"""


__all__ = [
    "TimeContext",
    "infer_timezone",
    "get_local_now",
    "build_time_context",
    "build_time_context_prompt",
    "build_closed_tavern_prompt",
]
