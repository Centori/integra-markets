# PolymarketConnectorRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**user_id** | **str** | Owning user ID | 
**name** | **str** | User-visible connector name | 
**source_mode** | **str** | shared, hybrid, or tenant_private | [optional] [default to 'tenant_private']
**base_url** | **str** | Base endpoint or portal URL for the connector | [optional] 
**event_url** | **str** | Optional canonical Polymarket event URL | [optional] 
**event_slug** | **str** | Optional Polymarket event slug | [optional] 
**website_urls** | **List[str]** | Optional user-owned source URLs | [optional] 
**custom_headers** | **Dict[str, str]** | Additional pass-through headers | [optional] 
**use_personal_subscription** | **bool** | Whether this connector should use the user&#39;s own vendor credentials | [optional] [default to True]
**bypass_shared_limits** | **bool** | Whether requests should avoid shared platform source pools | [optional] [default to True]
**rate_limit_per_minute** | **int** | Tenant-specific limit for this connector | [optional] 
**cache_ttl_seconds** | **int** | Connector-local cache TTL | [optional] [default to 60]
**credentials** | [**ConnectorCredentialRequest**](ConnectorCredentialRequest.md) | Optional BYO credential payload | [optional] 

## Example

```python
from integra_markets.models.polymarket_connector_request import PolymarketConnectorRequest

# TODO update the JSON string below
json = "{}"
# create an instance of PolymarketConnectorRequest from a JSON string
polymarket_connector_request_instance = PolymarketConnectorRequest.from_json(json)
# print the JSON string representation of the object
print(PolymarketConnectorRequest.to_json())

# convert the object into a dict
polymarket_connector_request_dict = polymarket_connector_request_instance.to_dict()
# create an instance of PolymarketConnectorRequest from a dict
polymarket_connector_request_from_dict = PolymarketConnectorRequest.from_dict(polymarket_connector_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


