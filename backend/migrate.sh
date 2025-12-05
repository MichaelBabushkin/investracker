#!/bin/bash
# Run database migrations
cd /app/backend
alembic upgrade head
