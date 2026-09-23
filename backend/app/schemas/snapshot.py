from typing import Literal

from pydantic import BaseModel, Field


class CategorySnap(BaseModel):
    id: str = Field(max_length=80)
    name: str = Field(max_length=80)
    cap_cents: int
    spent_cents: int
    unlimited: bool = False


class MonthTotal(BaseModel):
    month: str = Field(min_length=7, max_length=7)
    total_cents: int


class GoalSnap(BaseModel):
    id: str = Field(max_length=80)
    name: str = Field(max_length=80)
    target_cents: int
    saved_cents: int


class DebtSnap(BaseModel):
    id: str = Field(max_length=80)
    name: str = Field(max_length=80)
    balance_cents: int
    payment_cents: int


class BillSnap(BaseModel):
    id: str = Field(max_length=80)
    name: str = Field(max_length=80)
    amount_cents: int
    due_day: int
    paid_this_month: bool
    days_until_due: int


class FactSnap(BaseModel):
    id: str = Field(max_length=80)
    type: str = Field(max_length=40)
    category_id: str | None = None
    amount_cents: int | None = None
    label: str = Field(max_length=240)


class SpendSnapshot(BaseModel):
    """Client-built fact pack. The model may only cite these numbers."""

    v: Literal[1] = 1
    currency: str = Field(max_length=8)
    as_of: str = Field(max_length=10)
    month: str = Field(min_length=7, max_length=7)
    days_left: int
    income_cents: int = 0
    spend_cents: int = 0
    capped_spend_cents: int = 0
    total_cap_cents: int = 0
    categories: list[CategorySnap] = Field(default_factory=list, max_length=40)
    monthly_spend: list[MonthTotal] = Field(default_factory=list, max_length=12)
    monthly_income: list[MonthTotal] = Field(default_factory=list, max_length=12)
    goals: list[GoalSnap] = Field(default_factory=list, max_length=20)
    debts: list[DebtSnap] = Field(default_factory=list, max_length=20)
    bills: list[BillSnap] = Field(default_factory=list, max_length=30)
    facts: list[FactSnap] = Field(default_factory=list, max_length=20)
