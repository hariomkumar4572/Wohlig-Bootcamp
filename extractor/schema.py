from enum import Enum
from pydantic import BaseModel, Field


class PaymentStatus(str, Enum):
    PAID = "PAID"
    UNPAID = "UNPAID"
    OVERDUE = "OVERDUE"
    PARTIALLY_PAID = "PARTIALLY_PAID"
    UNKNOWN = "UNKNOWN"


class Address(BaseModel):
    street: str | None = Field(
        default=None,
        description="Street address"
    )
    city: str | None = Field(
        default=None,
        description="City name"
    )
    state: str | None = Field(
        default=None,
        description="State or province"
    )
    postal_code: str | None = Field(
        default=None,
        description="Postal or ZIP code"
    )
    country: str | None = Field(
        default=None,
        description="Country name"
    )


class LineItem(BaseModel):
    description: str = Field(
        description="Product or service description"
    )
    quantity: float | None = Field(
        default=None,
        description="Quantity of the product or service"
    )
    unit_price: float | None = Field(
        default=None,
        description="Price per unit"
    )
    amount: float | None = Field(
        default=None,
        description="Total amount for this line item"
    )


class Invoice(BaseModel):
    invoice_number: str | None = Field(
        default=None,
        description="Invoice identification number"
    )
    invoice_date: str | None = Field(
        default=None,
        description="Invoice issue date"
    )
    due_date: str | None = Field(
        default=None,
        description="Payment due date, if present"
    )
    seller_name: str | None = Field(
        default=None,
        description="Name of the seller or supplier"
    )
    buyer_name: str | None = Field(
        default=None,
        description="Name of the buyer or customer"
    )
    billing_address: Address = Field(
        description="Buyer's billing address"
    )
    line_items: list[LineItem] = Field(
        description="List of invoice products or services"
    )
    payment_status: PaymentStatus = Field(
        description="Payment status explicitly indicated by the invoice"
    )
    currency: str | None = Field(
        default=None,
        description="Invoice currency, such as INR or USD"
    )
    subtotal: float | None = Field(
        default=None,
        description="Invoice subtotal before taxes"
    )
    tax_amount: float | None = Field(
        default=None,
        description="Total tax amount"
    )
    total_amount: float | None = Field(
        default=None,
        description="Final invoice amount"
    )
