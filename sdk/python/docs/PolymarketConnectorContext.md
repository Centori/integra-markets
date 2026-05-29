# PolymarketConnectorContext


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**connector_id** | **str** | Saved connector ID, if any | [optional] 
**source_mode** | **str** | shared, hybrid, or tenant_private | [optional] [default to 'shared']
**uses_personal_subscription** | **bool** | True when this request used the user&#39;s own credential | [optional] [default to False]
**bypass_shared_limits** | **bool** | True when this request avoided shared rate limits | [optional] [default to False]
**auth** | [**PolymarketConnectorAuthSummary**](PolymarketConnectorAuthSummary.md) |  | [optional] 
**authentication** | [**PolymarketAuthenticationMeta**](PolymarketAuthenticationMeta.md) |  | [optional] 

## Example

```python
from integra_markets.models.polymarket_connector_context import PolymarketConnectorContext

# TODO update the JSON string below
json = "{}"
# create an instance of PolymarketConnectorContext from a JSON string
polymarket_connector_context_instance = PolymarketConnectorContext.from_json(json)
# print the JSON string representation of the object
print(PolymarketConnectorContext.to_json())

# convert the object into a dict
polymarket_connector_context_dict = polymarket_connector_context_instance.to_dict()
# create an instance of PolymarketConnectorContext from a dict
polymarket_connector_context_from_dict = PolymarketConnectorContext.from_dict(polymarket_connector_context_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


