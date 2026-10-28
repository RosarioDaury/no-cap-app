from typing import Literal

from pydantic import BaseModel, Field


class CategorySnap(BaseModel):
    id: str = Field(max_length=80)
    name: str = Field(max_length=80)
    cap: float
    spent: float
    unlimited: bool = False


class MonthTotal(BaseModel):
    month: str = Field(min_length=7, max_length=7)
    total: float


class GoalSnap(BaseModel):
    id: str = Field(max_length=80)
    name: str = Field(max_length=80)
    target: float
    saved: float


class DebtSnap(BaseModel):
    id: str = Field(max_length=80)
    name: str = Field(max_length=80)
    balance: float
    payment: float


class BillSnap(BaseModel):
    id: str = Field(max_length=80)
    name: str = Field(max_length=80)
    amount: float
    due_day: int
    paid_this_month: bool
    days_until_due: int


class FactSnap(BaseModel):
    id: str = Field(max_length=80)
    type: str = Field(max_length=40)
    category_id: str | None = None
    amount: float | None = None
    label: str = Field(max_length=240)


class SpendSnapshot(BaseModel):
    """Client-built fact pack. Amounts are already in the snapshot currency, not cents."""

    v: Literal[2] = 2
    currency: str = Field(max_length=8)
    as_of: str = Field(max_length=10)
    month: str = Field(min_length=7, max_length=7)
    days_left: int
    income: float = 0
    spend: float = 0
    capped_spend: float = 0
    total_cap: float = 0
    categories: list[CategorySnap] = Field(default_factory=list, max_length=40)
    monthly_spend: list[MonthTotal] = Field(default_factory=list, max_length=12)
    monthly_income: list[MonthTotal] = Field(default_factory=list, max_length=12)
    goals: list[GoalSnap] = Field(default_factory=list, max_length=20)
    debts: list[DebtSnap] = Field(default_factory=list, max_length=20)
    bills: list[BillSnap] = Field(default_factory=list, max_length=30)
    facts: list[FactSnap] = Field(default_factory=list, max_length=20)
