"""
Broker-specific implementations for PDF processing
Each broker has its own parser with custom logic
"""

from .base_broker import BaseBrokerParser
from .excellence_broker import ExcellenceBrokerParser

# Registry of available broker parsers
BROKER_PARSERS = {
    'excellence': ExcellenceBrokerParser,
    'meitav': ExcellenceBrokerParser,  # Same as Excellence
}

def get_broker_parser(broker_name: str) -> BaseBrokerParser:
    """Get the appropriate broker parser instance"""
    parser_class = BROKER_PARSERS.get(broker_name.lower())
    if not parser_class:
        raise ValueError(f"Unsupported broker: {broker_name}. Supported brokers: {', '.join(BROKER_PARSERS.keys())}")
    return parser_class()
