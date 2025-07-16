"""
User API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.user import User

router = APIRouter()

@router.get("/me")
async def get_current_user(db: AsyncSession = Depends(get_db)):
    """Get current user (demo implementation)"""
    try:
        result = await db.execute(select(User).where(User.username == "demo_user"))
        user = result.scalar_one_or_none()
        
        if not user:
            # Create demo user if not exists
            user = User(
                username="demo_user",
                password="demo_password",
                balance=10000.0
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        
        return {
            "id": user.id,
            "username": user.username,
            "balance": user.balance,
            "created_at": user.created_at.isoformat() if user.created_at else None
        }
    except Exception as e:
        # Return demo user data for testing purposes
        return {
            "id": 1,
            "username": "demo_user",
            "balance": 10000.0,
            "created_at": "2025-07-16T23:30:00Z"
        }