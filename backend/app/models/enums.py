"""
Enums for the application
"""
from enum import Enum

class UserRole(str, Enum):
    """User roles for access control"""
    ADMIN = "admin"
    USER = "user"
    VIEWER = "viewer"  # Read-only access
    
    @classmethod
    def get_all_roles(cls):
        return [role.value for role in cls]
    
    @classmethod
    def is_valid_role(cls, role: str) -> bool:
        return role in cls.get_all_roles()
