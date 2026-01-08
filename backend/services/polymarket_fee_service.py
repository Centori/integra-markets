"""
Polymarket Fee Management Service
Handles fee structures, revenue sharing, and market making for third-party integrators

Polymarket Fee Structure (as of 2024):
- No trading fees for takers on most markets
- Makers receive rebates on limit orders that add liquidity
- Third-party integrators can earn revenue through:
  1. Affiliate/referral fees (typically 1-2% of trading volume)
  2. Spread capture from market making
  3. API access tiers with volume-based pricing
  
Recommended Integration Model for Integra Markets:
- Implement as a "white-label" partner with revenue share
- Add small convenience fee for premium features
- Market making to capture bid-ask spreads
"""

import os
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
import logging

logger = logging.getLogger(__name__)


class FeeType(Enum):
    """Types of fees in the system"""
    TRADING_FEE = "trading_fee"           # Fee on each trade
    MAKER_REBATE = "maker_rebate"         # Rebate for providing liquidity
    TAKER_FEE = "taker_fee"               # Fee for taking liquidity
    AFFILIATE_FEE = "affiliate_fee"       # Referral commission
    SPREAD_CAPTURE = "spread_capture"     # Market making profit
    PLATFORM_FEE = "platform_fee"         # Integra's platform fee
    WITHDRAWAL_FEE = "withdrawal_fee"     # Fee for withdrawals
    PREMIUM_FEE = "premium_fee"           # Premium feature access


class UserTier(Enum):
    """User tier levels for fee discounts"""
    BASIC = "basic"
    SILVER = "silver"
    GOLD = "gold"
    PLATINUM = "platinum"
    VIP = "vip"


@dataclass
class FeeSchedule:
    """Fee schedule for different user tiers"""
    tier: UserTier
    trading_fee_bps: int          # Basis points (1 bps = 0.01%)
    maker_rebate_bps: int         # Rebate for limit orders
    taker_fee_bps: int            # Fee for market orders
    platform_fee_bps: int         # Integra platform fee
    min_trade_amount: Decimal     # Minimum trade size
    volume_discount_threshold: Decimal  # Monthly volume for discount
    volume_discount_bps: int      # Discount after threshold


@dataclass 
class TradeFeeSummary:
    """Summary of fees for a single trade"""
    gross_amount: Decimal
    trading_fee: Decimal
    maker_rebate: Decimal
    taker_fee: Decimal
    platform_fee: Decimal
    affiliate_fee: Decimal
    net_amount: Decimal
    total_fees: Decimal
    fee_breakdown: Dict[str, Decimal] = field(default_factory=dict)


class PolymarketFeeService:
    """
    Fee management service for Polymarket integration
    
    Implements the recommended fee structure for third-party integrators:
    
    1. POLYMARKET BASE FEES:
       - Taker fee: 0% (Polymarket charges no taker fees)
       - Maker rebate: 0-2 bps (small rebate for liquidity providers)
       
    2. INTEGRA PLATFORM FEES:
       - Basic tier: 50 bps (0.5%) platform fee
       - Discounts for higher volume traders
       - Premium features: additional fees
       
    3. AFFILIATE/REFERRAL PROGRAM:
       - 10-20% of platform fees go to referrers
       - Volume-based bonuses for top affiliates
       
    4. MARKET MAKING REVENUE:
       - Capture bid-ask spread on proprietary liquidity
       - Typical spread: 2-5% on commodity markets
    """
    
    def __init__(self):
        # Polymarket's base fee structure (no fees for most trades)
        self.polymarket_taker_fee_bps = 0
        self.polymarket_maker_rebate_bps = 0
        
        # Integra platform fee structure (basis points)
        self.fee_schedules: Dict[UserTier, FeeSchedule] = {
            UserTier.BASIC: FeeSchedule(
                tier=UserTier.BASIC,
                trading_fee_bps=0,
                maker_rebate_bps=0,
                taker_fee_bps=0,
                platform_fee_bps=50,  # 0.5% platform fee
                min_trade_amount=Decimal("1.00"),
                volume_discount_threshold=Decimal("10000"),
                volume_discount_bps=10
            ),
            UserTier.SILVER: FeeSchedule(
                tier=UserTier.SILVER,
                trading_fee_bps=0,
                maker_rebate_bps=5,   # 0.05% rebate
                taker_fee_bps=0,
                platform_fee_bps=40,  # 0.4% platform fee
                min_trade_amount=Decimal("1.00"),
                volume_discount_threshold=Decimal("25000"),
                volume_discount_bps=15
            ),
            UserTier.GOLD: FeeSchedule(
                tier=UserTier.GOLD,
                trading_fee_bps=0,
                maker_rebate_bps=10,  # 0.1% rebate
                taker_fee_bps=0,
                platform_fee_bps=30,  # 0.3% platform fee
                min_trade_amount=Decimal("1.00"),
                volume_discount_threshold=Decimal("50000"),
                volume_discount_bps=20
            ),
            UserTier.PLATINUM: FeeSchedule(
                tier=UserTier.PLATINUM,
                trading_fee_bps=0,
                maker_rebate_bps=15,  # 0.15% rebate
                taker_fee_bps=0,
                platform_fee_bps=20,  # 0.2% platform fee
                min_trade_amount=Decimal("1.00"),
                volume_discount_threshold=Decimal("100000"),
                volume_discount_bps=25
            ),
            UserTier.VIP: FeeSchedule(
                tier=UserTier.VIP,
                trading_fee_bps=0,
                maker_rebate_bps=20,  # 0.2% rebate
                taker_fee_bps=0,
                platform_fee_bps=10,  # 0.1% platform fee
                min_trade_amount=Decimal("1.00"),
                volume_discount_threshold=Decimal("500000"),
                volume_discount_bps=30
            ),
        }
        
        # Affiliate program configuration
        self.affiliate_config = {
            "base_commission_rate": Decimal("0.15"),  # 15% of platform fees
            "tier_bonuses": {
                "bronze": Decimal("0.00"),
                "silver": Decimal("0.05"),   # +5% bonus
                "gold": Decimal("0.10"),     # +10% bonus
                "platinum": Decimal("0.15"), # +15% bonus
            },
            "volume_thresholds": {
                "bronze": Decimal("0"),
                "silver": Decimal("10000"),
                "gold": Decimal("50000"),
                "platinum": Decimal("200000"),
            }
        }
        
        # Market making configuration
        self.market_making_config = {
            "default_spread_bps": 200,     # 2% default spread
            "min_spread_bps": 50,          # 0.5% minimum spread
            "max_spread_bps": 500,         # 5% maximum spread
            "inventory_skew_factor": 0.1,  # Adjust spread based on inventory
            "volatility_multiplier": 1.5,  # Widen spread in high volatility
        }
        
        # Revenue split with Polymarket (hypothetical partnership terms)
        self.revenue_split = {
            "polymarket_share": Decimal("0.00"),   # Polymarket takes 0% of our fees
            "integra_share": Decimal("0.85"),      # 85% to Integra
            "affiliate_pool": Decimal("0.15"),     # 15% to affiliates
        }

    def calculate_trade_fees(
        self,
        trade_amount: Decimal,
        user_tier: UserTier = UserTier.BASIC,
        is_maker: bool = False,
        affiliate_code: Optional[str] = None,
        monthly_volume: Decimal = Decimal("0"),
    ) -> TradeFeeSummary:
        """
        Calculate all fees for a trade
        
        Args:
            trade_amount: The total trade amount in USDC
            user_tier: User's tier level
            is_maker: True if limit order (adds liquidity)
            affiliate_code: Referral code if applicable
            monthly_volume: User's monthly trading volume
            
        Returns:
            TradeFeeSummary with all fee calculations
        """
        schedule = self.fee_schedules[user_tier]
        
        # Calculate base platform fee
        platform_fee_rate = Decimal(schedule.platform_fee_bps) / Decimal("10000")
        
        # Apply volume discount if applicable
        if monthly_volume >= schedule.volume_discount_threshold:
            discount_rate = Decimal(schedule.volume_discount_bps) / Decimal("10000")
            platform_fee_rate = max(Decimal("0"), platform_fee_rate - discount_rate)
        
        platform_fee = (trade_amount * platform_fee_rate).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        
        # Calculate maker rebate or taker fee
        maker_rebate = Decimal("0")
        taker_fee = Decimal("0")
        
        if is_maker and schedule.maker_rebate_bps > 0:
            rebate_rate = Decimal(schedule.maker_rebate_bps) / Decimal("10000")
            maker_rebate = (trade_amount * rebate_rate).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
        
        # Calculate affiliate fee (from platform fee, not additional)
        affiliate_fee = Decimal("0")
        if affiliate_code:
            affiliate_rate = self._get_affiliate_rate(affiliate_code, monthly_volume)
            affiliate_fee = (platform_fee * affiliate_rate).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
        
        # Total fees (platform fee minus maker rebate)
        total_fees = platform_fee - maker_rebate
        
        # Net amount after fees
        net_amount = trade_amount - total_fees
        
        return TradeFeeSummary(
            gross_amount=trade_amount,
            trading_fee=Decimal("0"),  # No Polymarket trading fee
            maker_rebate=maker_rebate,
            taker_fee=taker_fee,
            platform_fee=platform_fee,
            affiliate_fee=affiliate_fee,
            net_amount=net_amount,
            total_fees=total_fees,
            fee_breakdown={
                "polymarket_fee": Decimal("0"),
                "platform_fee": platform_fee,
                "maker_rebate": maker_rebate,
                "affiliate_commission": affiliate_fee,
                "net_platform_revenue": platform_fee - affiliate_fee,
            }
        )

    def calculate_market_making_spread(
        self,
        base_price: Decimal,
        volatility: Decimal = Decimal("1.0"),
        inventory_ratio: Decimal = Decimal("0.5"),
    ) -> Dict[str, Decimal]:
        """
        Calculate bid-ask spread for market making
        
        Args:
            base_price: Current market mid-price (0-100)
            volatility: Volatility multiplier (1.0 = normal)
            inventory_ratio: Current inventory position (0-1, 0.5 = balanced)
            
        Returns:
            Dict with bid_price, ask_price, and spread
        """
        config = self.market_making_config
        
        # Base spread in price points
        base_spread = Decimal(config["default_spread_bps"]) / Decimal("100")
        
        # Adjust for volatility
        volatility_adjusted = base_spread * Decimal(str(config["volatility_multiplier"])) * volatility
        
        # Adjust for inventory skew (widen spread on heavy side)
        inventory_skew = (inventory_ratio - Decimal("0.5")) * Decimal(str(config["inventory_skew_factor"]))
        
        # Calculate half-spread
        half_spread = volatility_adjusted / Decimal("2")
        
        # Apply inventory skew
        bid_adjustment = half_spread * (Decimal("1") + inventory_skew)
        ask_adjustment = half_spread * (Decimal("1") - inventory_skew)
        
        # Calculate final prices
        bid_price = max(Decimal("1"), (base_price - bid_adjustment)).quantize(
            Decimal("0.1"), rounding=ROUND_HALF_UP
        )
        ask_price = min(Decimal("99"), (base_price + ask_adjustment)).quantize(
            Decimal("0.1"), rounding=ROUND_HALF_UP
        )
        
        return {
            "mid_price": base_price,
            "bid_price": bid_price,
            "ask_price": ask_price,
            "spread": ask_price - bid_price,
            "spread_bps": ((ask_price - bid_price) / base_price * Decimal("10000")).quantize(Decimal("1")),
        }

    def calculate_affiliate_earnings(
        self,
        referred_volume: Decimal,
        affiliate_tier: str = "bronze",
    ) -> Dict[str, Decimal]:
        """
        Calculate affiliate earnings for a referral period
        
        Args:
            referred_volume: Total trading volume from referred users
            affiliate_tier: Affiliate's tier level
            
        Returns:
            Dict with earnings breakdown
        """
        config = self.affiliate_config
        
        # Base commission on platform fees (assuming 0.5% average platform fee)
        avg_platform_fee_rate = Decimal("0.005")
        total_platform_fees = referred_volume * avg_platform_fee_rate
        
        # Base commission rate
        base_rate = config["base_commission_rate"]
        tier_bonus = config["tier_bonuses"].get(affiliate_tier, Decimal("0"))
        effective_rate = base_rate + tier_bonus
        
        # Calculate earnings
        gross_earnings = total_platform_fees * effective_rate
        
        return {
            "referred_volume": referred_volume,
            "platform_fees_generated": total_platform_fees,
            "commission_rate": effective_rate,
            "gross_earnings": gross_earnings.quantize(Decimal("0.01")),
            "affiliate_tier": affiliate_tier,
            "next_tier_threshold": config["volume_thresholds"].get(
                self._get_next_tier(affiliate_tier), Decimal("0")
            ),
        }

    def get_tier_requirements(self) -> Dict[str, Any]:
        """Get requirements and benefits for each user tier"""
        return {
            tier.value: {
                "trading_fee_bps": schedule.trading_fee_bps,
                "maker_rebate_bps": schedule.maker_rebate_bps,
                "platform_fee_bps": schedule.platform_fee_bps,
                "min_trade_amount": float(schedule.min_trade_amount),
                "volume_discount_threshold": float(schedule.volume_discount_threshold),
                "volume_discount_bps": schedule.volume_discount_bps,
            }
            for tier, schedule in self.fee_schedules.items()
        }

    def estimate_monthly_revenue(
        self,
        projected_volume: Decimal,
        user_distribution: Dict[UserTier, Decimal],
        maker_ratio: Decimal = Decimal("0.3"),
    ) -> Dict[str, Decimal]:
        """
        Estimate monthly platform revenue
        
        Args:
            projected_volume: Total projected monthly volume
            user_distribution: Distribution of volume by tier (should sum to 1)
            maker_ratio: Ratio of volume from maker orders
            
        Returns:
            Revenue breakdown
        """
        total_platform_fees = Decimal("0")
        total_maker_rebates = Decimal("0")
        
        for tier, volume_share in user_distribution.items():
            tier_volume = projected_volume * volume_share
            schedule = self.fee_schedules[tier]
            
            # Platform fees
            platform_fee_rate = Decimal(schedule.platform_fee_bps) / Decimal("10000")
            tier_fees = tier_volume * platform_fee_rate
            total_platform_fees += tier_fees
            
            # Maker rebates
            rebate_rate = Decimal(schedule.maker_rebate_bps) / Decimal("10000")
            tier_rebates = tier_volume * maker_ratio * rebate_rate
            total_maker_rebates += tier_rebates
        
        # Net revenue
        gross_revenue = total_platform_fees
        net_revenue = gross_revenue - total_maker_rebates
        
        # Revenue split
        integra_revenue = net_revenue * self.revenue_split["integra_share"]
        affiliate_pool = net_revenue * self.revenue_split["affiliate_pool"]
        
        return {
            "projected_volume": projected_volume,
            "gross_platform_fees": gross_revenue.quantize(Decimal("0.01")),
            "maker_rebates_paid": total_maker_rebates.quantize(Decimal("0.01")),
            "net_revenue": net_revenue.quantize(Decimal("0.01")),
            "integra_revenue": integra_revenue.quantize(Decimal("0.01")),
            "affiliate_pool": affiliate_pool.quantize(Decimal("0.01")),
            "effective_take_rate_bps": (
                (net_revenue / projected_volume * Decimal("10000")).quantize(Decimal("1"))
                if projected_volume > 0 else Decimal("0")
            ),
        }

    def _get_affiliate_rate(
        self, 
        affiliate_code: str, 
        referred_volume: Decimal
    ) -> Decimal:
        """Get affiliate commission rate based on code and volume"""
        # Determine tier based on volume
        tier = "bronze"
        for tier_name, threshold in self.affiliate_config["volume_thresholds"].items():
            if referred_volume >= threshold:
                tier = tier_name
        
        base_rate = self.affiliate_config["base_commission_rate"]
        tier_bonus = self.affiliate_config["tier_bonuses"].get(tier, Decimal("0"))
        
        return base_rate + tier_bonus

    def _get_next_tier(self, current_tier: str) -> Optional[str]:
        """Get the next tier level"""
        tiers = ["bronze", "silver", "gold", "platinum"]
        try:
            idx = tiers.index(current_tier)
            return tiers[idx + 1] if idx < len(tiers) - 1 else None
        except ValueError:
            return "silver"


# Singleton instance
fee_service = PolymarketFeeService()


# Example usage and fee schedule documentation
"""
RECOMMENDED FEE STRUCTURE FOR INTEGRA MARKETS

1. USER TIERS & PLATFORM FEES:
   ┌──────────────┬───────────────┬──────────────┬────────────────┐
   │ Tier         │ Platform Fee  │ Maker Rebate │ Volume Unlock  │
   ├──────────────┼───────────────┼──────────────┼────────────────┤
   │ Basic        │ 0.50%         │ 0.00%        │ -              │
   │ Silver       │ 0.40%         │ 0.05%        │ $10K/month     │
   │ Gold         │ 0.30%         │ 0.10%        │ $50K/month     │
   │ Platinum     │ 0.20%         │ 0.15%        │ $100K/month    │
   │ VIP          │ 0.10%         │ 0.20%        │ $500K/month    │
   └──────────────┴───────────────┴──────────────┴────────────────┘

2. AFFILIATE PROGRAM:
   - Base commission: 15% of platform fees from referred users
   - Tier bonuses based on referred volume:
     • Bronze (< $10K):     15% commission
     • Silver ($10K+):      20% commission  
     • Gold ($50K+):        25% commission
     • Platinum ($200K+):   30% commission

3. MARKET MAKING:
   - Default spread: 2% (200 bps)
   - Spread adjusts for volatility and inventory
   - Target: capture 1-2% on facilitated trades

4. REVENUE PROJECTIONS (example):
   With $1M monthly volume, mixed tier distribution:
   - Gross platform fees: ~$4,000
   - Maker rebates paid:  ~$300
   - Affiliate payouts:   ~$555
   - Net Integra revenue: ~$3,145
   
5. POLYMARKET PARTNERSHIP:
   - Polymarket charges 0% taker fees
   - No revenue share required to Polymarket
   - All platform fees are Integra revenue
   - Consider negotiating API rate limits for volume
"""
