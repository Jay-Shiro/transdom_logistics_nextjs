from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Union
from bson import ObjectId
from datetime import datetime

class RateEntry(BaseModel):
    """Individual weight-price pair"""
    weight: int = Field(..., description="Weight in kg (e.g., 2, 3, 4)")
    price: Union[float, str] = Field(..., description="Price in NGN (numeric or formatted string)")

class ShippingRate(BaseModel):
    """Shipping rate for a zone"""
    zone: str = Field(..., description="Destination zone (e.g., UK_IRELAND, USA_CANADA)")
    currency: str = Field(default="NGN", description="Currency code")
    unit: str = Field(default="kg", description="Weight unit")
    rates: List[RateEntry] = Field(..., description="List of weight-price pairs")

class ShippingRateResponse(ShippingRate):
    """Response model with MongoDB _id"""
    id: Optional[str] = Field(None, alias="_id")

    class Config:
        populate_by_name = True
        json_encoders = {
            ObjectId: str
        }

class PriceResponse(BaseModel):
    """Price lookup response"""
    zone: str
    weight: int
    price: str  # Formatted price string like "1,234.56"
    currency: str


class UserSignup(BaseModel):
    """User signup payload"""
    firstname: str
    lastname: str
    email: str
    gender: str  # 'm' or 'f'
    country: str
    referral_code: Optional[str] = None
    phone_number: Optional[str] = None
    password: str
    photo_url: Optional[str] = None


class UserLogin(BaseModel):
    email: str
    password: str


class UserInDB(BaseModel):
    """Internal user representation stored in DB"""
    id: Optional[str] = Field(None, alias="_id")
    firstname: str
    lastname: str
    email: str
    gender: str
    country: str
    referral_code: Optional[str] = None
    phone_number: Optional[str] = None
    hashed_password: str
    photo_url: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserPublic(BaseModel):
    """Public user representation returned to frontend"""
    firstname: str
    lastname: str
    gender: str
    email: str
    phone_number: Optional[str] = None
    country: str
    referral_code: Optional[str] = None
    photo_url: Optional[str] = None


class SignupResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


# Admin Models
class AdminSignup(BaseModel):
    """Admin signup payload"""
    name: str
    password: str
    role: str = "admin"  # e.g., "admin", "moderator"


class AdminLogin(BaseModel):
    """Admin login payload"""
    name: str
    password: str


class AdminInDB(BaseModel):
    """Internal admin representation stored in DB"""
    id: Optional[str] = Field(None, alias="_id")
    name: str
    hashed_password: str
    role: str
    created_at: Optional[datetime] = None

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


class AdminPublic(BaseModel):
    """Public admin info"""
    name: str
    role: str


class AdminTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    admin: AdminPublic


# Payment Models
class PaymentRequest(BaseModel):
    """Payment logging payload"""
    zone: str
    weight: int
    email: str
    amount_paid: float
    status: str  # "success" or "failed"


class Payment(BaseModel):
    """Payment record in DB"""
    id: Optional[str] = Field(None, alias="_id")
    zone: str
    weight: int
    email: str
    amount_paid: float
    status: str
    created_at: Optional[datetime] = None

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


# Order Models
class MakeOrderRequest(BaseModel):
    """Create order payload"""
    zone_picked: str
    weight: int
    email: str
    amount_paid: float


class Order(BaseModel):
    """Order record in DB"""
    id: Optional[str] = Field(None, alias="_id")
    order_no: str
    zone_picked: str
    weight: int
    email: str
    amount_paid: float
    status: str  # "approved", "pending", "rejected"
    date_created: Optional[datetime] = None

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


class ApproveOrderRequest(BaseModel):
    """Approve order payload"""
    order_no: str
    status: str  # "approved", "rejected"


class ValidateRequest(BaseModel):
    """Validate zone and weight"""
    zone: str
    weight: int

