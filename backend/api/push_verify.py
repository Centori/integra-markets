"""
Push notification verification endpoint
Tests push notification setup without requiring database
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/push", tags=["push-verification"])

class PushVerifyResponse(BaseModel):
    expo_sdk_available: bool
    push_client_available: bool
    token_validation_working: bool
    sample_token_valid: bool
    ready_to_send: bool
    details: Dict[str, Any]

@router.get("/verify")
async def verify_push_setup() -> PushVerifyResponse:
    """Verify push notification setup"""
    
    details = {}
    
    # Check 1: Expo SDK availability
    try:
        from exponent_server_sdk import PushClient, PushMessage
        expo_sdk_available = True
        details["expo_sdk_version"] = "2.1.0"
    except ImportError:
        expo_sdk_available = False
        details["expo_sdk_error"] = "exponent-server-sdk not installed"
    
    # Check 2: Push client creation
    push_client_available = False
    if expo_sdk_available:
        try:
            client = PushClient()
            push_client_available = True
            details["push_client"] = "Successfully created"
        except Exception as e:
            details["push_client_error"] = str(e)
    
    # Check 3: Token validation
    token_validation_working = False
    sample_token_valid = False
    
    if push_client_available:
        try:
            # Test with a properly formatted token
            test_token = "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
            sample_token_valid = PushClient.is_exponent_push_token(test_token)
            token_validation_working = True
            
            # Test with invalid token
            invalid_token = "invalid-token"
            invalid_result = PushClient.is_exponent_push_token(invalid_token)
            
            details["token_validation"] = {
                "valid_token_test": sample_token_valid,
                "invalid_token_test": not invalid_result,
                "test_passed": sample_token_valid and not invalid_result
            }
        except Exception as e:
            details["token_validation_error"] = str(e)
    
    # Overall readiness
    ready_to_send = (
        expo_sdk_available and 
        push_client_available and 
        token_validation_working and 
        sample_token_valid
    )
    
    return PushVerifyResponse(
        expo_sdk_available=expo_sdk_available,
        push_client_available=push_client_available,
        token_validation_working=token_validation_working,
        sample_token_valid=sample_token_valid,
        ready_to_send=ready_to_send,
        details=details
    )

@router.post("/test-token")
async def test_push_token(token: str) -> Dict[str, Any]:
    """Test if a push token is valid"""
    
    try:
        from exponent_server_sdk import PushClient
        
        is_valid = PushClient.is_exponent_push_token(token)
        
        return {
            "token": token,
            "is_valid": is_valid,
            "format_hint": "Token should be in format: ExponentPushToken[xxxx...]" if not is_valid else "Token format is correct"
        }
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="Expo Server SDK not installed"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error validating token: {str(e)}"
        )
