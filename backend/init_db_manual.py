import asyncio
import os
import sys
from pathlib import Path
from tortoise import Tortoise

# Get the absolute path to the backend directory
BACKEND_DIR = Path(__file__).parent.absolute()
# Get the absolute path to the data directory
DATA_DIR = BACKEND_DIR / 'data'
# Create the data directory if it doesn't exist
DATA_DIR.mkdir(parents=True, exist_ok=True)

# Set the absolute path to the database file
DB_FILE = DATA_DIR / 'db.sqlite3'
# Create the database URL with the absolute path
DATABASE_URL = f"sqlite://{DB_FILE}"

print(f"Database path: {DB_FILE}")
print(f"Database URL: {DATABASE_URL}")

# Define the models modules
MODELS_MODULES = [
    "api.models.notification",
    "api.models.alert_preference",
]

async def init_db():
    print(f"Initializing database at {DATABASE_URL}")
    await Tortoise.init(
        db_url=DATABASE_URL,
        modules={"models": MODELS_MODULES},
    )
    print("Generating schemas...")
    await Tortoise.generate_schemas(safe=False)
    print("Database initialization complete!")

async def close_db():
    await Tortoise.close_connections()

async def main():
    try:
        await init_db()
        print("\nDatabase tables created successfully!")
        print("\nAvailable models:")
        for module in MODELS_MODULES:
            print(f" - {module}")
    finally:
        await close_db()

if __name__ == "__main__":
    # Add the backend directory to the Python path
    sys.path.insert(0, str(BACKEND_DIR))
    asyncio.run(main())