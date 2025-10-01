from setuptools import setup, find_packages

setup(
    name="backend",
    version="1.0.0",
    packages=find_packages(),
    include_package_data=True,
    install_requires=[
        "fastapi>=0.104.1",
        "uvicorn>=0.24.0",
        "tortoise-orm>=0.20.0",
        "aerich>=0.7.2",
    ],
)
