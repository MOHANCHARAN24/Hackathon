from feedback_db import get_stats
from models import AdminStatsResponse


async def get_admin_dashboard() -> AdminStatsResponse:
    return await get_stats()
