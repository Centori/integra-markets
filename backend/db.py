import os
from tortoise import Tortoise

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite://db.sqlite3")

MODELS_MODULES = [
    "backend.api.models.notification",
]

async def init_db():
    await Tortoise.init(
        db_url=DATABASE_URL,
        modules={"models": MODELS_MODULES},
    )
    await Tortoise.generate_schemas()

async def close_db():
    await Tortoise.close_connections()

